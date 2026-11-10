export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
  },
  CATEGORIES: '/categories',
  PRODUCTS: '/products',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_PRODUCT_STOCK: (id: number | string) => `/admin/products/${id}/stock`,
  ADMIN_VARIANT_STOCK: (variantId: number | string) => `/admin/products/variants/${variantId}/stock`,
  ADMIN_CREATE_VARIANT: (productId: number | string) => `/admin/products/${productId}/variants`,
  ADMIN_PRODUCT_ACTIVE_ORDERS: (id: number | string) => `/admin/products/${id}/active-orders`,
  ORDERS: {
    CHECKOUT: '/orders/checkout',
    MY_ORDERS: '/orders/my-orders',
    DETAIL: (id: number | string) => `/orders/${id}`,
    CANCEL: (id: number | string) => `/orders/${id}/cancel`,
  },
  SHIPPING_CARRIERS: '/shipping-carriers',
  PROMOTIONS: {
    CHECK: '/promotions/check',
    APPLY: '/promotions/apply',
    AVAILABLE: '/promotions/available',
  },
  WHEEL: {
    STATUS: '/wheel/status',
    SPIN: '/wheel/spin',
  },
  ADMIN_ORDERS: {
    LIST: '/admin/orders',
    UPDATE_STATUS: (id: number | string) => `/admin/orders/${id}/status`,
  },
  ADMIN_USERS: {
    LIST: '/admin/users',
    DETAIL: (id: number | string) => `/admin/users/${id}`,
    UPDATE_STATUS: (id: number | string) => `/admin/users/${id}/status`,
  },
  ADMIN_PROMOTIONS: {
    LIST: '/admin/promotions',
    DETAIL: (id: number | string) => `/admin/promotions/${id}`,
  },
  ADMIN_SHIPPING_CARRIERS: {
    LIST: '/admin/shipping-carriers',
    DETAIL: (id: number | string) => `/admin/shipping-carriers/${id}`,
  },
  ADMIN_SUPPLIERS: {
    LIST: '/admin/suppliers',
    DETAIL: (id: number | string) => `/admin/suppliers/${id}`,
  },
  ADMIN_INVENTORY_RECEIPTS: {
    LIST: '/admin/inventory/receipts',
    DETAIL: (id: number | string) => `/admin/inventory/receipts/${id}`,
  },
  AI: {
    CHAT: '/ai/chat',
    VISUAL_SEARCH: '/ai/visual-search',
    GENERATE_DESCRIPTION: '/admin/ai/generate-description',
  },
  ADMIN_AI: {
    KNOWLEDGE: '/admin/ai/knowledge',
    KNOWLEDGE_STATS: '/admin/ai/knowledge/stats',
    KNOWLEDGE_UPLOAD: '/admin/ai/knowledge/upload',
    KNOWLEDGE_MANUAL: '/admin/ai/knowledge/manual',
    KNOWLEDGE_DETAIL: (id: number | string) => `/admin/ai/knowledge/${id}`,
    KNOWLEDGE_REINDEX: (id: number | string) => `/admin/ai/knowledge/${id}/reindex`,
    KNOWLEDGE_CHUNKS: (id: number | string) => `/admin/ai/knowledge/${id}/chunks`,
    CONFIG: '/admin/ai/config',
    CONFIG_TEST: '/admin/ai/config/test',
  },
} as const;
