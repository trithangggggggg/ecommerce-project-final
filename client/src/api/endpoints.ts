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
  AI: {
    CHAT: '/ai/chat',
  },
} as const;
