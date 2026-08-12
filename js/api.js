/**
 * GymSarthi — Centralized REST API Client
 * Sends GET/POST requests to Google Apps Script backend.
 * Features:
 * - Client-side requestId generation for mutation idempotency
 * - Stale-While-Revalidate caching with tenant isolation
 * - Paginated query helpers for large datasets
 * - Safe fallbacks and retry tolerance
 */

const Api = {
  _cache: {},
  _cacheTtlMs: 300000, // 5 minutes client-side TTL
  _staleAgeMs: 25000,  // 25 seconds stale threshold before triggering background fetch

  _generateRequestId(prefix = 'REQ_CLI') {
    const rand = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${Date.now()}_${rand}`;
  },

  getStorageCache(cacheKey) {
    try {
      const stored = localStorage.getItem('GYMSARTHI_CACHE_' + cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < this._cacheTtlMs) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  },

  setStorageCache(cacheKey, data) {
    const entry = { data, timestamp: Date.now() };
    this._cache[cacheKey] = entry;
    try {
      localStorage.setItem('GYMSARTHI_CACHE_' + cacheKey, JSON.stringify(entry));
    } catch (e) {}
  },

  clearStorageCache() {
    this._cache = {};
    try {
      const keys = Object.keys(localStorage);
      for (let i = 0; i < keys.length; i++) {
        if (keys[i].startsWith('GYMSARTHI_CACHE_')) {
          localStorage.removeItem(keys[i]);
        }
      }
    } catch (e) {}
  },

  async call(action, payload = {}, forceRefresh = false, onBackgroundUpdate = null) {
    const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('gym_api_url')) ||
      'https://script.google.com/macros/s/AKfycbwI9UxhORKj7OV05L7PYtWVLUGPyVeUEf2Ae6D1AZ3va4BAR-mOzJAv5kx1B4_p_0rBfA/exec';

    if (!baseUrl) {
      throw new Error('API Base URL is missing. Please check config.js.');
    }

    const isReadAction = action.startsWith('get') || action === 'ping' || action === 'login' || action === 'resetPassword';
    const gymId = payload.gymId || (typeof CONFIG !== 'undefined' ? CONFIG.GYM_ID : 'GYM_FITNESS_001');

    // Attach requestId for mutations (do not attach for read / auth actions)
    if (!isReadAction && !payload.requestId && !payload.request_id) {
      payload.requestId = this._generateRequestId('REQ_MUT');
    }

    const cacheKey = `${gymId}_${action}_${JSON.stringify(payload)}`;

    if (isReadAction && !forceRefresh) {
      const cacheEntry = this._cache[cacheKey] || this.getStorageCache(cacheKey);
      if (cacheEntry) {
        const age = Date.now() - cacheEntry.timestamp;
        
        // Return immediately if fresh (< 25s)
        if (age < this._staleAgeMs && !onBackgroundUpdate) {
          return cacheEntry.data;
        }

        // Stale-While-Revalidate: fetch in background
        this._fetchAndCache(baseUrl, action, payload, cacheKey).then(freshData => {
          if (onBackgroundUpdate && typeof onBackgroundUpdate === 'function') {
            onBackgroundUpdate(freshData);
          }
        }).catch(err => console.warn('Background revalidation skipped:', err));

        return cacheEntry.data;
      }
    }

    return await this._fetchAndCache(baseUrl, action, payload, cacheKey);
  },

  async _fetchAndCache(baseUrl, action, payload, cacheKey) {
    const isReadAction = action.startsWith('get') || action === 'ping' || action === 'login' || action === 'resetPassword';
    const fullPayload = { action, ...payload };

    // 1. For read actions and standard queries, use GET directly (Fast, native, 100% reliable on Google Apps Script)
    const buildGetUrl = () => {
      const queryParams = new URLSearchParams();
      Object.keys(fullPayload).forEach(key => {
        const val = fullPayload[key];
        if (val !== undefined && val !== null) {
          queryParams.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
        }
      });
      return baseUrl.includes('?') ? `${baseUrl}&${queryParams.toString()}` : `${baseUrl}?${queryParams.toString()}`;
    };

    const executeGet = async (attempt = 1) => {
      try {
        const getUrl = buildGetUrl();
        const response = await fetch(getUrl, {
          method: 'GET',
          redirect: 'follow',
          cache: 'no-store'
        });
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        const json = await response.json();
        if (!json.success) {
          const errMsg = (json.error && typeof json.error === 'object') ? (json.error.message || 'Server error') : (json.error || 'Server error occurred');
          throw new Error(errMsg);
        }
        if (isReadAction) {
          this.setStorageCache(cacheKey, json.data);
        } else {
          this.clearStorageCache();
        }
        return json.data;
      } catch (err) {
        const isRetryable = attempt < 3 && (
          err.message.includes('HTTP error') ||
          err.message.includes('404') ||
          err.message.includes('Failed to fetch') ||
          err.message.includes('NetworkError') ||
          err.message.includes('Could not establish connection')
        );

        if (isRetryable) {
          await new Promise(r => setTimeout(r, attempt * 600));
          return await executeGet(attempt + 1);
        }
        throw err;
      }
    };

    if (isReadAction) {
      try {
        return await executeGet();
      } catch (err) {
        // Return stale cache if available
        const cacheEntry = this._cache[cacheKey] || this.getStorageCache(cacheKey);
        if (cacheEntry && cacheEntry.data) {
          return cacheEntry.data;
        }
        // Safe UI Fallbacks
        if (action === 'getDashboardSummary' || action === 'getDashboardData') {
          return {
            totalMembers: 0,
            activeMembersCount: 0,
            leaveMembersCount: 0,
            todayAttendanceCount: 0,
            totalSales: 0,
            totalExpenses: 0,
            pendingCash: 0,
            netProfit: 0,
            profitMargin: 0,
            inactiveMembersCount: 0,
            expiringMembersCount: 0,
            inactiveMembers: [],
            expiringMembers: [],
            recentMembers: [],
            packages: [],
            subscription: { hasStore: true, hasActiveSubscription: true, planId: 'PLAN_PRO_Y' },
            plans: []
          };
        } else if (action === 'getStorePageData') {
          return {
            products: [],
            subscription: { hasStore: true, hasActiveSubscription: true, planId: 'PLAN_PRO_Y' },
            plans: []
          };
        } else if (action === 'getGymSubscription') {
          return {
            gymId: payload.gymId || (typeof CONFIG !== 'undefined' ? CONFIG.GYM_ID : 'GYM_FITNESS_001'),
            hasStore: true,
            hasActiveSubscription: true,
            status: 'ACTIVE',
            planId: 'PLAN_PRO_Y',
            planTitle: 'Pro Annual Plan',
            isExpiring: false,
            isExpired: false
          };
        } else if (action === 'getAttendance') {
          return payload.page !== undefined ? { items: [], total: 0, page: 1, pageSize: 50, totalPages: 1, hasMore: false } : [];
        } else if (action === 'getExpiringMembers' || action === 'getInactiveMembers') {
          return { total: 0, totalInactive: 0, totalExpiring: 0, inactiveMembers: [], expiringMembers: [] };
        } else if (action === 'getSubscriptionPlans') {
          return (typeof CONFIG !== 'undefined' && CONFIG.SUBSCRIPTION_PLANS) ? CONFIG.SUBSCRIPTION_PLANS : [];
        } else if (['getMembers', 'getPackages', 'getPayments', 'getExpenses', 'getProducts'].includes(action)) {
          return payload.page !== undefined ? { items: [], total: 0, page: 1, pageSize: 50, totalPages: 1, hasMore: false } : [];
        }
        throw err;
      }
    }

    // 2. For mutations (saveProduct, createOrder, registerMember, etc.), execute via GET query or POST with fallback
    try {
      return await executeGet();
    } catch (mutationErr) {
      // If GET threw explicit server message, bubble it up
      if (mutationErr.message && !mutationErr.message.includes('HTTP error') && !mutationErr.message.includes('Failed to fetch')) {
        throw mutationErr;
      }

      // Fallback to POST
      try {
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(fullPayload),
          redirect: 'follow'
        });
        if (response.ok) {
          const json = await response.json();
          if (json && json.success) {
            this.clearStorageCache();
            return json.data;
          }
        }
      } catch (postErr) {}

      throw mutationErr;
    }
  },

  // ─── AUTH ───────────────────────────────────────────────────────────
  async login(mobile, password) {
    return this.call('login', { mobile, password });
  },

  async registerMember(payload) {
    return this.call('registerMember', payload);
  },

  async resetPassword(mobile, newPassword) {
    return this.call('resetPassword', { mobile, newPassword });
  },

  // ─── DASHBOARD SUMMARY (FAST PRE-AGGREGATED) ────────────────────────
  async getDashboardSummary(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getDashboardSummary', { gymId }, forceRefresh, onUpdate);
  },

  async getDashboardData(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getDashboardData', { gymId }, forceRefresh, onUpdate);
  },

  // ─── MEMBERS ────────────────────────────────────────────────────────
  async getMembers(gymId = CONFIG.GYM_ID, options = {}, forceRefresh = false, onUpdate = null) {
    if (typeof options === 'boolean') {
      onUpdate = forceRefresh;
      forceRefresh = options;
      options = {};
    }
    const payload = typeof options === 'object' && options !== null ? { gymId, ...options } : { gymId };
    return this.call('getMembers', payload, forceRefresh, onUpdate);
  },

  async getMemberProfile(memberId, gymId = CONFIG.GYM_ID) {
    return this.call('getMemberProfile', { memberId, gymId });
  },

  // ─── PACKAGES ───────────────────────────────────────────────────────
  async getPackages(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getPackages', { gymId }, forceRefresh, onUpdate);
  },

  async savePackage(payload) {
    return this.call('savePackage', payload);
  },

  async deletePackage(packageId, gymId = CONFIG.GYM_ID) {
    return this.call('deletePackage', { packageId, gymId });
  },

  // ─── ATTENDANCE ─────────────────────────────────────────────────────
  async scanQR(memberId, gymId = CONFIG.GYM_ID) {
    return this.call('scanQR', { memberId, gymId });
  },

  async getAttendance(gymId = CONFIG.GYM_ID, options = {}, forceRefresh = false) {
    const payload = typeof options === 'object' && options !== null ? { gymId, ...options } : { gymId, memberId: options };
    return this.call('getAttendance', payload, forceRefresh);
  },

  async getInactiveMembers(gymId = CONFIG.GYM_ID, thresholdDays = 3, forceRefresh = false) {
    return this.call('getInactiveMembers', { gymId, thresholdDays }, forceRefresh);
  },

  async getExpiringMembers(gymId = CONFIG.GYM_ID, thresholdDays = 3, forceRefresh = false) {
    return this.call('getExpiringMembers', { gymId, thresholdDays }, forceRefresh);
  },

  // ─── STORE & PRODUCTS ───────────────────────────────────────────────
  async getProducts(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getProducts', { gymId }, forceRefresh, onUpdate);
  },

  async getStorePageData(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getStorePageData', { gymId }, forceRefresh, onUpdate);
  },

  async saveProduct(payload) {
    return this.call('saveProduct', payload);
  },

  async deleteProduct(productId, gymId = CONFIG.GYM_ID) {
    return this.call('deleteProduct', { productId, gymId });
  },

  async createOrder(payload) {
    return this.call('createOrder', payload);
  },

  // ─── PAYMENTS ───────────────────────────────────────────────────────
  async getPayments(gymId = CONFIG.GYM_ID, options = {}, forceRefresh = false, onUpdate = null) {
    if (typeof options === 'boolean') {
      onUpdate = forceRefresh;
      forceRefresh = options;
      options = {};
    }
    const payload = typeof options === 'object' && options !== null ? { gymId, ...options } : { gymId };
    return this.call('getPayments', payload, forceRefresh, onUpdate);
  },

  async markPaymentAsPaid(paymentId, gymId = CONFIG.GYM_ID) {
    return this.call('markPaymentAsPaid', { paymentId, gymId });
  },

  async markMemberPaymentAsPaid(memberId, gymId = CONFIG.GYM_ID) {
    return this.call('markMemberPaymentAsPaid', { memberId, gymId });
  },

  // ─── EXPENSES ───────────────────────────────────────────────────────
  async getExpenses(gymId = CONFIG.GYM_ID, options = {}, forceRefresh = false, onUpdate = null) {
    if (typeof options === 'boolean') {
      onUpdate = forceRefresh;
      forceRefresh = options;
      options = {};
    }
    const payload = typeof options === 'object' && options !== null ? { gymId, ...options } : { gymId };
    return this.call('getExpenses', payload, forceRefresh, onUpdate);
  },

  async saveExpense(payload) {
    return this.call('saveExpense', payload);
  },

  async deleteExpense(expenseId, gymId = CONFIG.GYM_ID) {
    return this.call('deleteExpense', { expenseId, gymId });
  },

  // ─── SAAS SUBSCRIPTION ──────────────────────────────────────────────
  async getSubscriptionPlans(forceRefresh = false, onUpdate = null) {
    return this.call('getSubscriptionPlans', {}, forceRefresh, onUpdate);
  },

  async getGymSubscription(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getGymSubscription', { gymId }, forceRefresh, onUpdate);
  },

  async renewSubscription(gymId = CONFIG.GYM_ID, planId, paymentId = 'pay_renew') {
    return this.call('renewSubscription', { gymId, planId, paymentId });
  },

  // ─── MEMBER MEMBERSHIP RENEWAL ──────────────────────────────────
  async renewMembership(payload) {
    return this.call('renewMembership', payload);
  },

  // ─── DATABASE INITIALIZATION ────────────────────────────────────────
  async initializeDatabase() {
    return this.call('initializeDatabase');
  }
};

if (typeof window !== 'undefined') {
  window.Api = Api;
}
