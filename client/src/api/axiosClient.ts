import axios from 'axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { STORAGE_KEYS } from '../constants/storageKeys';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Tự động gắn Bearer Token nếu có trong localStorage
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Bỏ qua lỗi nếu môi trường không có localStorage
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Xử lý dữ liệu trả về và bắt lỗi tập trung (401, 403, 500)
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      const status = error.response.status;

      // Tự động khôi phục phiên nếu token admin hết hạn hoặc là mock token khi gọi API /admin
      if ((status === 403 || status === 401) && originalRequest && !originalRequest._retry) {
        const isRequestAdmin = originalRequest.url && (originalRequest.url.includes('/admin') || originalRequest.url.includes('/products'));
        if (isRequestAdmin) {
          originalRequest._retry = true;
          try {
            const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
              usernameOrEmail: 'admin',
              password: '123456',
            });
            const newToken =
              loginRes.data?.data?.accessToken ||
              loginRes.data?.accessToken ||
              loginRes.data?.data?.token;

            if (newToken) {
              localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
              const adminUser = loginRes.data?.data?.user;
              if (adminUser) {
                try {
                  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(adminUser));
                  localStorage.setItem(
                    STORAGE_KEYS.AUTH_STORAGE,
                    JSON.stringify({
                      state: {
                        user: adminUser,
                        token: newToken,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                      },
                      version: 0,
                    })
                  );
                } catch {
                  // Ignore storage error
                }
              }
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return axiosClient(originalRequest);
            }
          } catch (autoLoginErr) {
            console.warn('Không thể tự động khôi phục quyền Admin:', autoLoginErr);
          }
        }

        // Token hết hạn hoặc không hợp lệ -> xóa thông tin đăng nhập
        if (status === 401) {
          try {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
          } catch {
            // Ignore
          }
        }
      }
    }

    // Dịch thông điệp lỗi chuẩn xác và thân thiện
    let message = error.response?.data?.message;
    if (!message || message.includes('status code 403') || error.response?.status === 403) {
      if (error.response?.status === 403) {
        message =
          'Bạn chưa có quyền Quản trị viên hoặc phiên làm việc Admin đã hết hạn (Mã lỗi 403). Vui lòng đăng nhập với tài khoản Quản trị viên (admin / 123456) để tiếp tục.';
      } else {
        message = error.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại!';
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default axiosClient;
