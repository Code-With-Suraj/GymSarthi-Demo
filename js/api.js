/**
 * GymSarthi — Centralized REST API Client
 * Sends GET/POST requests to Google Apps Script backend.
 */

const Api = {
  _cache: {},
  _cacheTtlMs: 300000, // 5 minutes client-side TTL
  _staleAgeMs: 30000,   // 30 seconds stale threshold before triggering background fetch

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
    const baseUrl = CONFIG.API_BASE_URL;
    if (!baseUrl) {
      throw new Error('API Base URL is missing. Please check config.js.');
    }

    const isReadAction = action.startsWith('get');
    const cacheKey = action + '_' + JSON.stringify(payload);

    if (isReadAction && !forceRefresh) {
      const cacheEntry = this._cache[cacheKey] || this.getStorageCache(cacheKey);
      if (cacheEntry) {
        const age = Date.now() - cacheEntry.timestamp;
        
        // If data is fresh (< 30s), return immediately without background request
        if (age < this._staleAgeMs && !onBackgroundUpdate) {
          return cacheEntry.data;
        }

        // Stale-While-Revalidate: Return cached data instantly, fetch fresh data asynchronously in background
        this._fetchAndCache(baseUrl, action, payload, cacheKey).then(freshData => {
          if (onBackgroundUpdate && typeof onBackgroundUpdate === 'function') {
            onBackgroundUpdate(freshData);
          }
        }).catch(err => console.warn('Background revalidation skipped:', err));

        return cacheEntry.data;
      }
    }

    // Direct fetch if no cache or forceRefresh requested
    const freshData = await this._fetchAndCache(baseUrl, action, payload, cacheKey);
    return freshData;
  },

  async _fetchAndCache(baseUrl, action, payload, cacheKey) {
    const isReadAction = action.startsWith('get');
    const fullPayload = { action, ...payload };

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(fullPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || 'Server error occurred');
      }

      if (isReadAction) {
        this.setStorageCache(cacheKey, json.data);
      } else {
        // Clear read cache on mutations
        this.clearStorageCache();
      }

      return json.data;
    } catch (error) {
      console.warn(`API POST failed [${action}]:`, error);

      // Robust fallback mechanism for GET/read operations
      if (isReadAction) {
        try {
          const queryParams = new URLSearchParams(fullPayload).toString();
          const getUrl = baseUrl.includes('?') ? `${baseUrl}&${queryParams}` : `${baseUrl}?${queryParams}`;
          const getResponse = await fetch(getUrl, { method: 'GET' });
          if (getResponse.ok) {
            const getJson = await getResponse.json();
            if (getJson && getJson.success) {
              this.setStorageCache(cacheKey, getJson.data);
              return getJson.data;
            }
          }
        } catch (getErr) {
          console.warn(`API GET fallback also failed [${action}]:`, getErr);
        }

        // Return stale cache if available
        const cacheEntry = this._cache[cacheKey] || this.getStorageCache(cacheKey);
        if (cacheEntry && cacheEntry.data) {
          console.warn(`Serving stale cached data for [${action}]`);
          return cacheEntry.data;
        }

        // Safe defaults for UI continuity when endpoint returns 404 or fails
        if (action === 'getStorePageData') {
          return { products: [], subscription: { hasStore: true, hasActiveSubscription: true }, plans: [] };
        } else if (action === 'getDashboardData') {
          return { members: [], packages: [], payments: [], expenses: [], inactiveMembers: [], expiringMembers: [], subscription: { hasStore: true, hasActiveSubscription: true }, plans: [] };
        } else if (['getMembers', 'getPackages', 'getPayments', 'getExpenses', 'getProducts'].includes(action)) {
          return [];
        } else if (action === 'getGymSubscription') {
          return { hasStore: true, hasActiveSubscription: true, planId: 'PLAN_PRO_Y' };
        }
      }

      throw error;
    }
  },

  // Auth
  async login(mobile, password) {
    return this.call('login', { mobile, password });
  },

  async registerMember(payload) {
    return this.call('registerMember', payload);
  },

  async resetPassword(mobile, newPassword) {
    return this.call('resetPassword', { mobile, newPassword });
  },

  // Members & Packages
  async getMembers(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getMembers', { gymId }, forceRefresh, onUpdate);
  },

  async getMemberProfile(memberId) {
    return this.call('getMemberProfile', { memberId });
  },

  async getPackages(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getPackages', { gymId }, forceRefresh, onUpdate);
  },

  async savePackage(payload) {
    return this.call('savePackage', payload);
  },

  async deletePackage(packageId) {
    return this.call('deletePackage', { packageId });
  },

  // Attendance & Retention
  async scanQR(memberId, gymId = CONFIG.GYM_ID) {
    return this.call('scanQR', { memberId, gymId });
  },

  async getAttendance(gymId = CONFIG.GYM_ID, memberId = null, forceRefresh = false) {
    return this.call('getAttendance', { gymId, memberId }, forceRefresh);
  },

  async getInactiveMembers(gymId = CONFIG.GYM_ID, thresholdDays = 3, forceRefresh = false) {
    return this.call('getInactiveMembers', { gymId, thresholdDays }, forceRefresh);
  },

  async getExpiringMembers(gymId = CONFIG.GYM_ID, thresholdDays = 3, forceRefresh = false) {
    return this.call('getExpiringMembers', { gymId, thresholdDays }, forceRefresh);
  },

  // Store & Products
  async getProducts(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getProducts', { gymId }, forceRefresh, onUpdate);
  },

  async saveProduct(payload) {
    return this.call('saveProduct', payload);
  },

  async deleteProduct(productId) {
    return this.call('deleteProduct', { productId });
  },

  async createOrder(payload) {
    return this.call('createOrder', payload);
  },

  // Payments
  async getPayments(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getPayments', { gymId }, forceRefresh, onUpdate);
  },

  async markPaymentAsPaid(paymentId, gymId = CONFIG.GYM_ID) {
    return this.call('markPaymentAsPaid', { paymentId, gymId });
  },

  async markMemberPaymentAsPaid(memberId, gymId = CONFIG.GYM_ID) {
    return this.call('markMemberPaymentAsPaid', { memberId, gymId });
  },

  // Expenses
  async getExpenses(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getExpenses', { gymId }, forceRefresh, onUpdate);
  },

  async saveExpense(payload) {
    return this.call('saveExpense', payload);
  },

  async deleteExpense(expenseId) {
    return this.call('deleteExpense', { expenseId });
  },

  // SaaS Subscription
  async getSubscriptionPlans(forceRefresh = false, onUpdate = null) {
    return this.call('getSubscriptionPlans', {}, forceRefresh, onUpdate);
  },

  async getGymSubscription(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getGymSubscription', { gymId }, forceRefresh, onUpdate);
  },

  async renewSubscription(gymId = CONFIG.GYM_ID, planId, paymentId = 'pay_renew') {
    return this.call('renewSubscription', { gymId, planId, paymentId });
  },

  // Batch Data Fetchers (Quota Optimized & Fast Cache)
  async getDashboardData(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getDashboardData', { gymId }, forceRefresh, onUpdate);
  },

  async getStorePageData(gymId = CONFIG.GYM_ID, forceRefresh = false, onUpdate = null) {
    return this.call('getStorePageData', { gymId }, forceRefresh, onUpdate);
  },

  // Database Initialization
  async initializeDatabase() {
    return this.call('initializeDatabase');
  }
};

if (typeof window !== 'undefined') {
  window.Api = Api;
}

