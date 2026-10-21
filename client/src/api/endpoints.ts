export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
  },
  CATEGORIES: '/categories',
  PRODUCTS: '/products',
  ADMIN_PRODUCTS: '/admin/products',
  ORDERS: {
    CHECKOUT: '/orders/checkout',
    MY_ORDERS: '/orders/my-orders',
    DETAIL: (id: number | string) => `/orders/${id}`,
  },
  ADMIN_ORDERS: {
    LIST: '/admin/orders',
    UPDATE_STATUS: (id: number | string) => `/admin/orders/${id}/status`,
  },
  AI: {
    CHAT: '/ai/chat',
  },
} as const;
