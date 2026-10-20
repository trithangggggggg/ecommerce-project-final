import type { UserRole } from '../constants/roles';

export interface User {
  id: number | string;
  username?: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  phoneNumber?: string;
  address?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username?: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string;
  phoneNumber?: string;
  address?: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  phoneNumber?: string;
  address?: string;
  avatarUrl?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  tokenType?: string;
  user: User;
  message?: string;
}
