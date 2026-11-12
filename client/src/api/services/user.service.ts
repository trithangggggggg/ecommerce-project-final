import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { OrderResponse } from '../../models/order.model';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  address?: string;
  avatarUrl?: string;
  role: 'ADMIN' | 'CUSTOMER';
  status: boolean;
  ordersCount: number;
  totalSpent: number;
  recentOrders?: OrderResponse[];
  createdAt: string;
}

export interface DeleteUserResult {
  id: number;
  ordersCount: number;
  deleted: boolean;
  locked: boolean;
  message: string;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';

function mapAdminUser(u: any): AdminUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName || u.username,
    phoneNumber: u.phoneNumber || '',
    address: u.address || '',
    avatarUrl: u.avatarUrl || DEFAULT_AVATAR,
    role: u.role || 'CUSTOMER',
    status: Boolean(u.status),
    ordersCount: Number(u.ordersCount || 0),
    totalSpent: typeof u.totalSpent === 'number' ? u.totalSpent : parseFloat(u.totalSpent || '0'),
    recentOrders: Array.isArray(u.recentOrders) ? u.recentOrders : undefined,
    createdAt: u.createdAt || new Date().toISOString(),
  };
}

export const userService = {
  /**
   * [Admin] Lấy danh sách người dùng từ MySQL
   */
  async getAdminUsers(params?: { keyword?: string; status?: boolean }): Promise<AdminUser[]> {
    const res = await axiosClient.get(ENDPOINTS.ADMIN_USERS.LIST, { params });
    const rawData = res.data?.data || res.data;
    return Array.isArray(rawData) ? rawData.map(mapAdminUser) : [];
  },

  /**
   * [Admin] Lấy chi tiết người dùng và lịch sử đơn hàng gần đây từ MySQL
   */
  async getAdminUserById(userId: number): Promise<AdminUser> {
    const res = await axiosClient.get(ENDPOINTS.ADMIN_USERS.DETAIL(userId));
    const u = res.data?.data || res.data;
    return mapAdminUser(u);
  },

  /**
   * [Admin] Khóa / Mở khóa tài khoản người dùng
   */
  async updateUserStatus(userId: number, status: boolean): Promise<AdminUser> {
    const res = await axiosClient.put(ENDPOINTS.ADMIN_USERS.UPDATE_STATUS(userId), { status });
    const u = res.data?.data || res.data;
    return mapAdminUser(u);
  },

  /**
   * [Admin] Thêm khách hàng mới trực tiếp vào MySQL Database
   */
  async createAdminUser(payload: Partial<AdminUser> & { password?: string }): Promise<AdminUser> {
    const res = await axiosClient.post(ENDPOINTS.ADMIN_USERS.LIST, payload);
    const u = res.data?.data || res.data;
    return mapAdminUser(u);
  },

  /**
   * [Admin] Cập nhật thông tin khách hàng trên MySQL Database
   */
  async updateAdminUser(userId: number, payload: Partial<AdminUser> & { password?: string }): Promise<AdminUser> {
    const res = await axiosClient.put(ENDPOINTS.ADMIN_USERS.DETAIL(userId), payload);
    const u = res.data?.data || res.data;
    return mapAdminUser(u);
  },

  /**
   * [Admin] Xóa (hoặc khóa nếu đã có đơn hàng) khách hàng trên MySQL Database
   */
  async deleteAdminUser(userId: number): Promise<DeleteUserResult> {
    const res = await axiosClient.delete(ENDPOINTS.ADMIN_USERS.DETAIL(userId));
    const payload = res.data?.data || {};
    return {
      id: Number(payload.id ?? userId),
      ordersCount: Number(payload.ordersCount ?? 0),
      deleted: payload.deleted !== undefined ? Boolean(payload.deleted) : true,
      locked: Boolean(payload.locked),
      message: res.data?.message || 'Đã xử lý yêu cầu xóa khách hàng.',
    };
  },
};

export default userService;
