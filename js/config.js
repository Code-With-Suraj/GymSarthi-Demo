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
  // Users can override via local storage setting if needed
  API_BASE_URL: (typeof localStorage !== 'undefined' && localStorage.getItem('gym_api_url')) ||
    'https://script.google.com/macros/s/AKfycbzBPslerbDbDfl-aMH5ddfxsOaXOpqunR7MsCw7A5VosPAtr6hoITpQHk_hoSrtTvvoaQ/exec',

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
  ],

  // Default Instant Store Catalog (For 0ms super-fast loading & resilient fallback)
  DEFAULT_PRODUCTS: [
    {
      product_id: 'PROD_001',
      gym_id: 'GYM_FITNESS_001',
      category: 'Supplements',
      name: 'Whey Protein Isolate 1kg',
      description: 'Premium Double Rich Chocolate Whey Isolate with 27g protein per scoop.',
      price: 2499,
      stock_quantity: 25,
      stock: 25,
      image_url: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=500&q=80',
      active: true
    },
    {
      product_id: 'PROD_002',
      gym_id: 'GYM_FITNESS_001',
      category: 'Supplements',
      name: 'Creatine Monohydrate 250g',
      description: 'Pure 100% Micronized Creatine for raw explosive power and muscle endurance.',
      price: 699,
      stock_quantity: 40,
      stock: 40,
      image_url: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=500&q=80',
      active: true
    },
    {
      product_id: 'PROD_003',
      gym_id: 'GYM_FITNESS_001',
      category: 'Gear',
      name: 'Stainless Steel Shaker 750ml',
      description: 'Double-wall vacuum insulated gym shaker bottle. 100% leakproof.',
      price: 499,
      stock_quantity: 50,
      stock: 50,
      image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80',
      active: true
    },
    {
      product_id: 'PROD_004',
      gym_id: 'GYM_FITNESS_001',
      category: 'Gear',
      name: 'Heavy Duty Wrist Wraps',
      description: 'Professional grade elastic wrist support wraps for heavy bench & overhead presses.',
      price: 349,
      stock_quantity: 30,
      stock: 30,
      image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&q=80',
      active: true
    },
    {
      product_id: 'PROD_005',
      gym_id: 'GYM_FITNESS_001',
      category: 'Supplements',
      name: 'BCAA Energy Powder 300g',
      description: 'Refreshing Watermelon intra-workout electrolyte and recovery drink with 7g BCAAs.',
      price: 1199,
      stock_quantity: 20,
      stock: 20,
      image_url: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=500&q=80',
      active: true
    },
    {
      product_id: 'PROD_006',
      gym_id: 'GYM_FITNESS_001',
      category: 'Gear',
      name: 'Leather Weightlifting Belt',
      description: 'Heavy duty 4-inch padded genuine leather belt for lower back support during squats.',
      price: 1499,
      stock_quantity: 15,
      stock: 15,
      image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&q=80',
      active: true
    }
  ]
};

if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
