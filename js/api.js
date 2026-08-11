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
    
    // Fallback: Check if we have warm batch data from getDashboardData
    try {
      const warmBatch = localStorage.getItem('GYMSARTHI_CACHE_getDashboardData_' + JSON.stringify({ gymId: CONFIG.GYM_ID }));
      if (warmBatch) {
        const parsedBatch = JSON.parse(warmBatch);
        if (parsedBatch && parsedBatch.data) {
          const d = parsedBatch.data;
          if (cacheKey.startsWith('getMembers')) return { data: d.members || [], timestamp: parsedBatch.timestamp };
          if (cacheKey.startsWith('getPackages')) return { data: d.packages || [], timestamp: parsedBatch.timestamp };
          if (cacheKey.startsWith('getPayments')) return { data: d.payments || [], timestamp: parsedBatch.timestamp };
          if (cacheKey.startsWith('getExpenses')) return { data: d.expenses || [], timestamp: parsedBatch.timestamp };
          if (cacheKey.startsWith('getGymSubscription')) return { data: d.subscription || null, timestamp: parsedBatch.timestamp };
          if (cacheKey.startsWith('getSubscriptionPlans')) return { data: d.plans || [], timestamp: parsedBatch.timestamp };
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

    // Warm up individual entity caches when getDashboardData returns
    if (cacheKey.startsWith('getDashboardData') && data) {
      const gymId = payload => payload.gymId || CONFIG.GYM_ID;
      try {
        if (data.members) this.setStorageCache('getMembers_' + JSON.stringify({ gymId: CONFIG.GYM_ID }), data.members);
        if (data.packages) this.setStorageCache('getPackages_' + JSON.stringify({ gymId: CONFIG.GYM_ID }), data.packages);
        if (data.payments) this.setStorageCache('getPayments_' + JSON.stringify({ gymId: CONFIG.GYM_ID }), data.payments);
        if (data.expenses) this.setStorageCache('getExpenses_' + JSON.stringify({ gymId: CONFIG.GYM_ID }), data.expenses);
        if (data.subscription) this.setStorageCache('getGymSubscription_' + JSON.stringify({ gymId: CONFIG.GYM_ID }), data.subscription);
        if (data.plans) this.setStorageCache('getSubscriptionPlans_{}', data.plans);
      } catch (e) {}
    }
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
        
        // If data is fresh (< 30s) and no explicit background update needed, return immediately
        if (age < this._staleAgeMs && !onBackgroundUpdate) {
          return cacheEntry.data;
        }

        // Stale-While-Revalidate: Return cached data instantly (0ms latency), fetch fresh data in background
        this._fetchAndCache(baseUrl, action, payload, cacheKey).then(freshData => {
          if (onBackgroundUpdate && typeof onBackgroundUpdate === 'function') {
            try {
              onBackgroundUpdate(freshData);
            } catch (err) {
              console.warn('Background update skipped (view unmounted):', err.message);
            }
          }
        }).catch(err => console.warn('Background revalidation skipped:', err.message));

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
      console.error(`API Call failed [${action}]:`, error);
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

