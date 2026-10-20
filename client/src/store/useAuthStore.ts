import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '../api/services/auth.service';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type {
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from '../models/auth.model';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (payload: LoginPayload): Promise<User> => {
        set({ isLoading: true, error: null });
        try {
          const authData = await authService.login(payload);
          const user = authData.user;
          const token = authData.token || authData.accessToken || '';

          // Lưu token riêng để axios interceptor đọc dễ dàng
          try {
            if (token) {
              localStorage.setItem(STORAGE_KEYS.TOKEN, token);
            }
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
          } catch {
            // Ignore storage errors
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return user;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Đăng nhập thất bại!';
          set({ isLoading: false, error: errorMessage });
          throw err;
        }
      },

      register: async (payload: RegisterPayload): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          await authService.register(payload);
          set({ isLoading: false, error: null });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Đăng ký tài khoản thất bại!';
          set({ isLoading: false, error: errorMessage });
          throw err;
        }
      },

      logout: () => {
        try {
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
        } catch {
          // Ignore
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await authService.updateProfile(payload);
          const currentUser = get().user;
          const mergedUser: User = {
            ...(currentUser || {}),
            ...updatedUser,
          } as User;

          try {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mergedUser));
          } catch {
            // Ignore
          }

          set({
            user: mergedUser,
            isLoading: false,
            error: null,
          });

          return mergedUser;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Cập nhật hồ sơ thất bại!';
          set({ isLoading: false, error: errorMessage });
          throw err;
        }
      },

      changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          await authService.changePassword(payload);
          set({ isLoading: false, error: null });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại!';
          set({ isLoading: false, error: errorMessage });
          throw err;
        }
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: STORAGE_KEYS.AUTH_STORAGE,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
