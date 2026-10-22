import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { ROLES } from '../../constants/roles';
import type {
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from '../../models/auth.model';
import type { ApiResponse } from '../../models/api.model';

export const authService = {
  /**
   * Đăng nhập người dùng
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      // Backend LoginRequest yêu cầu: usernameOrEmail và password
      const backendPayload = {
        usernameOrEmail: payload.email.trim(),
        password: payload.password,
      };

      const response = await axiosClient.post<ApiResponse<AuthResponse> | AuthResponse>(
        ENDPOINTS.AUTH.LOGIN,
        backendPayload
      );

      const data = response.data;
      let authData: AuthResponse;

      if ('data' in data && data.data && typeof data.data === 'object') {
        authData = data.data as AuthResponse;
      } else {
        authData = data as AuthResponse;
      }

      // Đảm bảo token và user luôn được chuẩn hóa
      const token = authData.token || authData.accessToken || '';
      const user = authData.user;
      if (user && !user.phone && user.phoneNumber) {
        user.phone = user.phoneNumber;
      }

      return {
        ...authData,
        token,
        user,
      };
    } catch (error) {
      if (import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
        return authService.mockLogin(payload);
      }
      throw error;
    }
  },

  /**
   * Đăng ký tài khoản mới (Khớp chuẩn RegisterRequest backend)
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      // Backend RegisterRequest yêu cầu: username, email, password, fullName, phoneNumber, address
      const backendPayload = {
        username: payload.username || payload.email.split('@')[0],
        email: payload.email.trim(),
        password: payload.password,
        fullName: payload.fullName.trim(),
        phoneNumber: payload.phoneNumber || payload.phone || '',
        address: payload.address || '',
      };

      const response = await axiosClient.post<ApiResponse<AuthResponse> | AuthResponse>(
        ENDPOINTS.AUTH.REGISTER,
        backendPayload
      );
      const data = response.data;
      if ('data' in data && data.data && typeof data.data === 'object') {
        const authData = data.data as AuthResponse;
        return {
          ...authData,
          token: authData.token || authData.accessToken || '',
        };
      }
      return data as AuthResponse;
    } catch (error) {
      if (import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
        const mockUser: User = {
          id: Date.now(),
          username: payload.username || payload.email.split('@')[0],
          email: payload.email,
          fullName: payload.fullName,
          role: ROLES.CUSTOMER,
          phone: payload.phone || payload.phoneNumber || '0987654321',
          phoneNumber: payload.phone || payload.phoneNumber || '0987654321',
          address: payload.address || 'Hà Nội, Việt Nam',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          createdAt: new Date().toISOString(),
        };
        return {
          token: `mock-jwt-token-${Date.now()}`,
          user: mockUser,
          message: 'Đăng ký tài khoản thành công (Mock Mode)',
        };
      }
      throw error;
    }
  },

  /**
   * Lấy thông tin hồ sơ người dùng (GET /api/users/profile)
   */
  async getProfile(): Promise<User> {
    const response = await axiosClient.get<ApiResponse<User> | User>(ENDPOINTS.USERS.PROFILE);
    const data = response.data;
    const user = ('data' in data && data.data ? (data.data as User) : (data as User));
    if (user && !user.phone && user.phoneNumber) {
      user.phone = user.phoneNumber;
    }
    return user;
  },

  /**
   * Cập nhật thông tin hồ sơ (PUT /api/users/profile - UpdateProfileRequest)
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    try {
      const backendPayload = {
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber || payload.phone,
        address: payload.address,
        avatarUrl: payload.avatarUrl,
      };

      const response = await axiosClient.put<ApiResponse<User> | User>(
        ENDPOINTS.USERS.UPDATE_PROFILE,
        backendPayload
      );
      const data = response.data;
      const user = ('data' in data && data.data ? (data.data as User) : (data as User));
      if (user && !user.phone && user.phoneNumber) {
        user.phone = user.phoneNumber;
      }
      return user;
    } catch (error) {
      if (import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
        return {
          id: 1,
          email: 'user@ecommerce.com',
          fullName: payload.fullName || 'Người dùng E-Shop',
          role: ROLES.CUSTOMER,
          phone: payload.phone || payload.phoneNumber,
          phoneNumber: payload.phone || payload.phoneNumber,
          address: payload.address,
          avatarUrl: payload.avatarUrl,
        };
      }
      throw error;
    }
  },

  /**
   * Đổi mật khẩu tài khoản trực tiếp qua MySQL
   */
  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await axiosClient.put(ENDPOINTS.USERS.CHANGE_PASSWORD, {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
      confirmPassword: payload.confirmPassword || payload.newPassword,
    });
  },

  /**
   * Mock login tiện lợi phục vụ test nhanh trên giao diện
   */
  mockLogin(payload: LoginPayload): AuthResponse {
    const isAdmin = payload.email.toLowerCase().includes('admin');
    const user: User = {
      id: isAdmin ? 1 : 2,
      username: isAdmin ? 'admin' : 'customer',
      email: payload.email,
      fullName: isAdmin ? 'Quản trị viên Hệ thống' : 'Nguyễn Văn Khách Hàng',
      role: isAdmin ? ROLES.ADMIN : ROLES.CUSTOMER,
      phone: isAdmin ? '0988888888' : '0912345678',
      phoneNumber: isAdmin ? '0988888888' : '0912345678',
      address: isAdmin ? 'Tòa nhà Quản Trị, Hà Nội' : '123 Đường Cầu Giấy, Hà Nội',
      avatarUrl: isAdmin
        ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      createdAt: new Date().toISOString(),
    };

    return {
      token: `mock-jwt-token-${isAdmin ? 'admin' : 'customer'}-${Date.now()}`,
      accessToken: `mock-jwt-token-${isAdmin ? 'admin' : 'customer'}-${Date.now()}`,
      user,
      message: 'Đăng nhập thành công!',
    };
  },
};
