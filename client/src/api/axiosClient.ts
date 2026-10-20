import axios from 'axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { STORAGE_KEYS } from '../constants/storageKeys';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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
  (error) => {
    if (error.response) {
      const status = error.response.status;

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

    const message =
      error.response?.data?.message ||
      error.message ||
      'Không thể kết nối đến máy chủ. Vui lòng thử lại!';

    return Promise.reject(new Error(message));
  }
);

export default axiosClient;
