/**
 * GymSarthi — Global Configuration & Environment Constants
 */

const CONFIG = {
  APP_NAME: 'GymSarthi',
  APP_VERSION: '1.0.0',
  GYM_ID: 'GYM_FITNESS_001',
  GYM_NAME: 'PowerHouse Fitness Gym',
  GYM_PHONE: '+91 9876543210',
  GYM_WHATSAPP: '919876543210',
  GYM_ADDRESS: 'Plot 105, Main Market Road, Sector 14, Gurugram, Haryana',

  // Google Apps Script REST API Web App Endpoint
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycby5_8VWN_ut7sZU4NNhSC_gQZFn8aSB66OwUbCRgVLr0cdyedlxMA8cSQkFkGwiiX-Y5w/exec',

  // 1. GYM OWNER'S RAZORPAY GATEWAY (For Member Onboarding & Store Purchases)
  GYM_RAZORPAY_KEY_ID: (typeof localStorage !== 'undefined' && localStorage.getItem('gym_razorpay_key_id')) || 'rzp_live_gym_key_placeholder',

  // 2. PLATFORM SAAS SUBSCRIPTION RAZORPAY GATEWAY (For Gym Owner App Subscriptions)
  PLATFORM_RAZORPAY_KEY_ID: (typeof localStorage !== 'undefined' && localStorage.getItem('platform_razorpay_key_id')) || 'rzp_live_platform_key_placeholder',

  CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',

  // App Subscription Plans (499/m, 4999/y Basic; 799/m, 7999/y Pro)
  SUBSCRIPTION_PLANS: [
    {
      id: 'PLAN_BASIC_M',
      title: 'Basic Monthly Plan',
      price: 499,
      durationDays: 30,
      hasStore: false,
      features: [
        'Member Self Onboarding',
        'QR Gate Attendance (In/Out)',
        '3+ Day Inactive Alerts with Direct Call',
        'Cash & Online Membership Payments'
      ],
      badge: 'Starter Pack'
    },
    {
      id: 'PLAN_BASIC_Y',
      title: 'Basic Annual Plan',
      price: 4999,
      durationDays: 365,
      hasStore: false,
      features: [
        'All Basic Features for 1 Year',
        'Save ₹989 compared to monthly',
        'Priority Phone Support'
      ],
      badge: 'Best Value Basic'
    },
    {
      id: 'PLAN_PRO_M',
      title: 'Pro Monthly Plan',
      price: 799,
      durationDays: 30,
      hasStore: true,
      features: [
        'All Basic Features',
        'Gym Supplement & Gear Store',
        'Inventory & Stock Tracking',
        'Sales Audit & Profit Analytics'
      ],
      badge: 'Full Power'
    },
    {
      id: 'PLAN_PRO_Y',
      title: 'Pro Annual Plan',
      price: 7999,
      durationDays: 365,
      hasStore: true,
      features: [
        'All Pro Features for 1 Year',
        'Gym Store & Inventory Management',
        'Save ₹1589 compared to monthly',
        'Dedicated VIP Account Manager'
      ],
      badge: 'Most Popular ⭐'
    }
  ]
};

if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
