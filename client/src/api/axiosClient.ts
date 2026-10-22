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

// Request Interceptor: Tự động gắn Bearer Token nếu có trong localStorage (trừ endpoint login/register)
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const isAuthEndpoint =
        config.url &&
        (config.url.includes('/auth/login') || config.url.includes('/auth/register'));

      if (!isAuthEndpoint) {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
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
      const isAuthEndpoint =
        originalRequest?.url &&
        (originalRequest.url.includes('/auth/login') ||
          originalRequest.url.includes('/auth/register'));

      // Khi phiên đăng nhập hết hạn (401) hoặc bị từ chối quyền (403) trên các protected API
      if ((status === 401 || status === 403) && !isAuthEndpoint) {
        try {
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          localStorage.removeItem(STORAGE_KEYS.AUTH_STORAGE);
        } catch {
          // Bỏ qua lỗi truy cập storage
        }

        // Tự động out ra trang đăng nhập ngay lập tức theo chuẩn bảo mật
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          const currentPath = window.location.pathname + window.location.search;
          setTimeout(() => {
            window.location.href = `/login?expired=true&redirect=${encodeURIComponent(currentPath)}`;
          }, 1000);
        }
      }

      // Thông điệp lỗi từ backend
      let message = error.response?.data?.message;

      // Xử lý nếu backend trả về errors map/array
      if (!message && error.response?.data?.errors) {
        const errObj = error.response.data.errors;
        if (typeof errObj === 'object') {
          message = Object.values(errObj).join(', ');
        }
      }

      // Đối với login / register: ưu tiên hiển thị message từ server
      if (isAuthEndpoint) {
        if (status === 401) {
          message = message || 'Tên đăng nhập hoặc mật khẩu không chính xác. Mật khẩu quản trị viên là 123456!';
        } else if (status === 400) {
          message = message || 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại!';
        } else if (status === 403) {
          message = 'Tài khoản không có quyền truy cập hệ thống!';
        } else if (status >= 500) {
          message = 'Máy chủ Backend (Port 8080) đang gặp sự cố hoặc chưa khởi động. Vui lòng kiểm tra lại server!';
        } else if (!message || message.includes('status code')) {
          message = `Đăng nhập không thành công (Mã lỗi ${status || 'Unknown'}). Vui lòng thử lại với tài khoản admin / 123456!`;
        }
        return Promise.reject(new Error(message));
      }

      // Đối với các endpoint protected thông thường khác
      if (!message || message.includes('status code 403') || status === 403) {
        if (status === 403) {
          message =
            'Phiên làm việc đã hết hạn hoặc bạn không có quyền Quản trị viên (Mã lỗi 403). Đang chuyển hướng về trang đăng nhập...';
        } else if (status === 401) {
          message = 'Phiên đăng nhập đã hết hạn (Mã lỗi 401). Đang chuyển hướng về trang đăng nhập...';
        } else {
          message = error.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại!';
        }
      }

      return Promise.reject(new Error(message));
    }

    const networkMsg =
      error.message?.includes('Network Error') || error.code === 'ERR_NETWORK' || !error.response
        ? 'Không thể kết nối đến máy chủ Backend (Port 8080). Vui lòng khởi động backend server!'
        : (error.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại!');

    return Promise.reject(new Error(networkMsg));
  }
);

export default axiosClient;
