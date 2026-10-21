import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type { Order, OrderStatus, CheckoutRequest } from '../../models/order.model';

export const orderService = {
  /**
   * Lấy danh sách toàn bộ đơn hàng (Dành cho Quản trị viên / Admin)
   */
  async getAllOrders(status?: OrderStatus): Promise<Order[]> {
    try {
      const response = await axiosClient.get<ApiResponse<Order[]>>(ENDPOINTS.ADMIN_ORDERS, {
        params: status ? { status } : undefined,
      });
      return response.data?.data || [];
    } catch (error) {
      console.warn('Lỗi khi tải danh sách đơn hàng admin:', error);
      return [];
    }
  },

  /**
   * Lấy thông tin chi tiết một đơn hàng theo ID (Admin)
   */
  async getOrderById(id: number): Promise<Order | null> {
    try {
      const response = await axiosClient.get<ApiResponse<Order>>(`${ENDPOINTS.ADMIN_ORDERS}/${id}`);
      return response.data?.data || null;
    } catch (error) {
      console.warn(`Lỗi khi lấy chi tiết đơn hàng #${id}:`, error);
      return null;
    }
  },

  /**
   * Cập nhật trạng thái đơn hàng (Admin: PENDING, PROCESSING, SHIPPING, COMPLETED, CANCELLED)
   */
  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    const response = await axiosClient.put<ApiResponse<Order>>(
      `${ENDPOINTS.ADMIN_ORDERS}/${id}/status`,
      { status }
    );
    return response.data.data;
  },

  /**
   * Đặt hàng mới (Khách hàng)
   */
  async createOrder(request: CheckoutRequest): Promise<Order> {
    const response = await axiosClient.post<ApiResponse<Order>>(ENDPOINTS.ORDERS, request);
    return response.data.data;
  },

  /**
   * Lấy lịch sử đơn hàng của người dùng hiện tại
   */
  async getMyOrders(): Promise<Order[]> {
    try {
      const response = await axiosClient.get<ApiResponse<Order[]>>(`${ENDPOINTS.ORDERS}/my-orders`);
      return response.data?.data || [];
    } catch (error) {
      console.warn('Lỗi khi lấy đơn hàng cá nhân:', error);
      return [];
    }
  },
};

export default orderService;
