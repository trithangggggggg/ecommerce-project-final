export const ROLES = {
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
