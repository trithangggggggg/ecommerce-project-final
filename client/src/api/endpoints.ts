export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
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
  ORDERS: {
    CHECKOUT: '/orders/checkout',
    MY_ORDERS: '/orders/my-orders',
    DETAIL: (id: number | string) => `/orders/${id}`,
    CANCEL: (id: number | string) => `/orders/${id}/cancel`,
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
  AI: {
    CHAT: '/ai/chat',
    GENERATE_DESCRIPTION: '/admin/ai/generate-description',
  },
} as const;
