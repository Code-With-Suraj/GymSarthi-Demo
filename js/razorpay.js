/**
 * GymSarthi — Dual Razorpay Gateway Handler
 * Separates Gym Revenue (Memberships & Store) from App SaaS Subscription Payments.
 */

const RazorpayHandler = {
  _preloadPromise: null,

  /**
   * Eagerly pre-fetches and caches Razorpay Gateway keys in the background
   * so checkout opens instantly without blocking API delays.
   */
  async preloadKeys() {
    if (this._preloadPromise) return this._preloadPromise;
    this._preloadPromise = (async () => {
      if (typeof Api === 'undefined') return;
      try {
        const gymKey = (typeof CONFIG !== 'undefined' && CONFIG.GYM_RAZORPAY_KEY_ID) || (typeof localStorage !== 'undefined' && localStorage.getItem('gym_razorpay_key_id')) || '';
        const platformKey = (typeof CONFIG !== 'undefined' && CONFIG.PLATFORM_RAZORPAY_KEY_ID) || (typeof localStorage !== 'undefined' && localStorage.getItem('platform_razorpay_key_id')) || '';

        const needGymKey = !gymKey || gymKey.includes('placeholder');
        const needPlatformKey = !platformKey || platformKey.includes('placeholder');

        const tasks = [];
        if (needGymKey) {
          tasks.push(
            Api.getGymSettings().then(settings => {
              if (settings && settings.razorpay_key_id && !settings.razorpay_key_id.includes('placeholder')) {
                if (typeof CONFIG !== 'undefined') CONFIG.GYM_RAZORPAY_KEY_ID = settings.razorpay_key_id;
                if (typeof localStorage !== 'undefined') localStorage.setItem('gym_razorpay_key_id', settings.razorpay_key_id);
              }
            }).catch(() => {})
          );
        }
        if (needPlatformKey) {
          tasks.push(
            Api.getSubscriptionPlans().then(subData => {
              const pKey = (subData && subData.platformRazorpayKeyId) || (subData && subData.data && subData.data.platformRazorpayKeyId);
              if (pKey && !pKey.includes('placeholder')) {
                if (typeof CONFIG !== 'undefined') CONFIG.PLATFORM_RAZORPAY_KEY_ID = pKey;
                if (typeof localStorage !== 'undefined') localStorage.setItem('platform_razorpay_key_id', pKey);
              }
            }).catch(() => {})
          );
        }
        await Promise.all(tasks);
      } catch (err) {
        console.warn('Razorpay preloading error:', err);
      }
    })();
    return this._preloadPromise;
  },

  /**
   * Open payment checkout
   * @param {Object} opts
   */
  async openCheckout(opts) {
    const {
      amount,
      isSubscription = false,
      description = '',
      customerName = '',
      customerMobile = '',
      customerEmail = '',
      onSuccess,
      onFailure
    } = opts;

    // Pick pre-cached key if available
    let keyId = isSubscription
      ? (typeof CONFIG !== 'undefined' ? CONFIG.PLATFORM_RAZORPAY_KEY_ID : '')
      : (typeof CONFIG !== 'undefined' ? CONFIG.GYM_RAZORPAY_KEY_ID : '');

    // If key is missing/placeholder, await existing background preload promise
    if (!keyId || keyId.includes('placeholder')) {
      await this.preloadKeys();
      keyId = isSubscription
        ? (typeof CONFIG !== 'undefined' ? CONFIG.PLATFORM_RAZORPAY_KEY_ID : '')
        : (typeof CONFIG !== 'undefined' ? CONFIG.GYM_RAZORPAY_KEY_ID : '');
    }

    // If key is still placeholder or missing, prompt user to enter key or use simulated flow
    if (typeof window !== 'undefined' && (!keyId || keyId.includes('placeholder'))) {
      const targetName = isSubscription ? 'SaaS Platform Subscription' : 'Gym Revenue';
      const enteredKey = prompt(
        `💳 [Razorpay Live / Test Key Required]\n\n` +
        `To open the REAL Razorpay Payment Modal for ${targetName}, please enter your Razorpay Key ID (starts with rzp_test_ or rzp_live_).\n\n` +
        `Leave blank and press OK to use Demo Simulation flow instead:`,
        ''
      );

      if (enteredKey && enteredKey.trim().length > 5) {
        const cleanKey = enteredKey.trim();
        keyId = cleanKey;
        if (isSubscription) {
          CONFIG.PLATFORM_RAZORPAY_KEY_ID = cleanKey;
          if (typeof localStorage !== 'undefined') localStorage.setItem('platform_razorpay_key_id', cleanKey);
        } else {
          CONFIG.GYM_RAZORPAY_KEY_ID = cleanKey;
          if (typeof localStorage !== 'undefined') localStorage.setItem('gym_razorpay_key_id', cleanKey);
        }
        if (typeof Utils !== 'undefined') Utils.showToast('Razorpay Key ID updated successfully!', 'success');
      }
    }

    const merchantName = isSubscription ? 'GymSarthi SaaS Platform' : CONFIG.GYM_NAME;
    const themeColor = isSubscription ? '#06B6D4' : '#10B981';

    // If Razorpay SDK is available on window and valid key is set (e.g. rzp_test_... or rzp_live_...)
    if (typeof window.Razorpay !== 'undefined' && keyId && !keyId.includes('placeholder')) {
      const options = {
        key: keyId,
        amount: Math.round(amount * 100), // in paise
        currency: 'INR',
        name: merchantName,
        description: description || (isSubscription ? 'GymSarthi App Subscription' : 'Gym Membership Payment'),
        image: 'assets/logo.svg',
        payment_capture: 1,
        prefill: {
          name: customerName,
          contact: customerMobile,
          email: customerEmail
        },
        theme: {
          color: themeColor
        },
        modal: {
          ondismiss: () => {
            if (onFailure) onFailure('Payment cancelled by user');
          }
        },
        handler: function (response) {
          if (onSuccess) {
            onSuccess(response.razorpay_payment_id || ('pay_' + Date.now()));
          }
        }
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        console.error('Razorpay SDK invocation error, falling back to simulated flow:', err);
        this.runSimulatedFlow(opts, merchantName);
      }
    } else {
      // Interactive Simulated Payment Flow for demonstration
      this.runSimulatedFlow(opts, merchantName);
    }
  },

  runSimulatedFlow(opts, merchantName) {
    const { amount, isSubscription, description, customerName, customerMobile, onSuccess, onFailure } = opts;

    Utils.showToast('Connecting to Secure Razorpay Gateway...', 'info');

    setTimeout(() => {
      const confirmed = confirm(
        `💳 [Razorpay Payment Gateway Gateway]\n\n` +
        `Merchant: ${merchantName}\n` +
        `Payment Type: ${isSubscription ? 'App Subscription Plan' : 'Gym Payment'}\n` +
        `Amount: ₹${amount}\n` +
        `Customer: ${customerName || 'User'} (${customerMobile || ''})\n` +
        `Note: ${description || 'Payment'}\n\n` +
        `Click "OK" to simulate SUCCESSFUL UPI / Card Payment.\n` +
        `Click "Cancel" to simulate payment cancellation.`
      );

      if (confirmed) {
        const fakePaymentId = 'pay_' + (isSubscription ? 'sub_' : 'gym_') + Math.random().toString(36).substring(2, 12);
        if (onSuccess) onSuccess(fakePaymentId);
      } else {
        if (onFailure) onFailure('Payment cancelled by user');
      }
    }, 300);
  }
};

if (typeof window !== 'undefined') {
  window.RazorpayHandler = RazorpayHandler;
  // Auto-preload keys in background when script loads
  setTimeout(() => {
    RazorpayHandler.preloadKeys().catch(() => {});
  }, 50);
}
