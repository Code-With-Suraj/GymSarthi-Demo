/**
 * GymSarthi — Centralized REST API Client
 * Sends GET/POST requests to Google Apps Script backend.
 */

const Api = {
  _cache: {},
  _cacheTtlMs: 60000, // 60 seconds client-side cache for GET requests

  async call(action, payload = {}, forceRefresh = false) {
    const baseUrl = CONFIG.API_BASE_URL;
    if (!baseUrl) {
      throw new Error('API Base URL is missing. Please check config.js.');
    }

    const isReadAction = action.startsWith('get');
    const cacheKey = action + '_' + JSON.stringify(payload);

    if (isReadAction && !forceRefresh && this._cache[cacheKey]) {
      const entry = this._cache[cacheKey];
      if (Date.now() - entry.timestamp < this._cacheTtlMs) {
        return entry.data;
      }
    }

    const fullPayload = { action, ...payload };

    try {
      // Send as POST request with JSON string body
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
        this._cache[cacheKey] = {
          data: json.data,
          timestamp: Date.now()
        };
      } else {
        // Clear read cache on mutations
        this._cache = {};
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
  async getMembers(gymId = CONFIG.GYM_ID) {
    return this.call('getMembers', { gymId });
  },

  async getMemberProfile(memberId) {
    return this.call('getMemberProfile', { memberId });
  },

  async getPackages(gymId = CONFIG.GYM_ID) {
    return this.call('getPackages', { gymId });
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

  async getAttendance(gymId = CONFIG.GYM_ID, memberId = null) {
    return this.call('getAttendance', { gymId, memberId });
  },

  async getInactiveMembers(gymId = CONFIG.GYM_ID, thresholdDays = 3) {
    return this.call('getInactiveMembers', { gymId, thresholdDays });
  },

  async getExpiringMembers(gymId = CONFIG.GYM_ID, thresholdDays = 3) {
    return this.call('getExpiringMembers', { gymId, thresholdDays });
  },

  // Store & Products
  async getProducts(gymId = CONFIG.GYM_ID) {
    return this.call('getProducts', { gymId });
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
  async getPayments(gymId = CONFIG.GYM_ID) {
    return this.call('getPayments', { gymId });
  },

  async markPaymentAsPaid(paymentId, gymId = CONFIG.GYM_ID) {
    return this.call('markPaymentAsPaid', { paymentId, gymId });
  },

  async markMemberPaymentAsPaid(memberId, gymId = CONFIG.GYM_ID) {
    return this.call('markMemberPaymentAsPaid', { memberId, gymId });
  },

  // Expenses
  async getExpenses(gymId = CONFIG.GYM_ID) {
    return this.call('getExpenses', { gymId });
  },

  async saveExpense(payload) {
    return this.call('saveExpense', payload);
  },

  async deleteExpense(expenseId) {
    return this.call('deleteExpense', { expenseId });
  },

  // SaaS Subscription
  async getSubscriptionPlans() {
    return this.call('getSubscriptionPlans');
  },

  async getGymSubscription(gymId = CONFIG.GYM_ID) {
    return this.call('getGymSubscription', { gymId });
  },

  async renewSubscription(gymId = CONFIG.GYM_ID, planId, paymentId = 'pay_renew') {
    return this.call('renewSubscription', { gymId, planId, paymentId });
  },

  // Batch Data Fetchers (Quota Optimized)
  async getDashboardData(gymId = CONFIG.GYM_ID, forceRefresh = false) {
    return this.call('getDashboardData', { gymId }, forceRefresh);
  },

  async getStorePageData(gymId = CONFIG.GYM_ID, forceRefresh = false) {
    return this.call('getStorePageData', { gymId }, forceRefresh);
  },

  // Database Initialization
  async initializeDatabase() {
    return this.call('initializeDatabase');
  }
};

if (typeof window !== 'undefined') {
  window.Api = Api;
}
