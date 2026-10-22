import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';

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
  createdAt: string;
}

export const userService = {
  /**
   * [Admin] Lấy danh sách người dùng từ MySQL
   */
  async getAdminUsers(params?: { keyword?: string; status?: boolean }): Promise<AdminUser[]> {
    const res = await axiosClient.get(ENDPOINTS.ADMIN_USERS.LIST, { params });
    const rawData = res.data?.data || res.data;
    if (Array.isArray(rawData)) {
      return rawData.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName || u.username,
        phoneNumber: u.phoneNumber || '',
        address: u.address || '',
        avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        role: u.role,
        status: Boolean(u.status),
        ordersCount: Number(u.ordersCount || 0),
        totalSpent: typeof u.totalSpent === 'number' ? u.totalSpent : parseFloat(u.totalSpent || '0'),
        createdAt: u.createdAt,
      }));
    }
    return [];
  },

  /**
   * [Admin] Khóa / Mở khóa tài khoản người dùng
   */
  async updateUserStatus(userId: number, status: boolean): Promise<AdminUser> {
    const res = await axiosClient.put(ENDPOINTS.ADMIN_USERS.UPDATE_STATUS(userId), { status });
    const u = res.data?.data || res.data;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName || u.username,
      phoneNumber: u.phoneNumber || '',
      address: u.address || '',
      avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      role: u.role,
      status: Boolean(u.status),
      ordersCount: Number(u.ordersCount || 0),
      totalSpent: typeof u.totalSpent === 'number' ? u.totalSpent : parseFloat(u.totalSpent || '0'),
      createdAt: u.createdAt,
    };
  },
};

export default userService;
