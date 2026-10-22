// ============================================================
// Order Service — Gọi API Đặt hàng, Lịch sử đơn hàng, Quản lý đơn Admin
// Dữ liệu 100% kết nối trực tiếp với MySQL Database
// ============================================================

import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type {
  CheckoutRequest,
  OrderResponse,
  OrderStatus,
  UpdateOrderStatusRequest,
} from '../../models/order.model';

export const orderService = {
  /**
   * Tạo đơn hàng mới (Checkout)
   * Yêu cầu JWT token hợp lệ
   */
  async checkout(payload: CheckoutRequest): Promise<OrderResponse> {
    const response = await axiosClient.post<ApiResponse<OrderResponse>>(
      ENDPOINTS.ORDERS.CHECKOUT,
      payload
    );

    if (response.data && 'data' in response.data && response.data.data) {
      return response.data.data;
    }
    return response.data as unknown as OrderResponse;
  },

  /**
   * Lấy danh sách lịch sử đơn hàng của người dùng hiện tại
   */
  async getMyOrders(): Promise<OrderResponse[]> {
    const response = await axiosClient.get<ApiResponse<OrderResponse[]>>(
      ENDPOINTS.ORDERS.MY_ORDERS
    );

    const data = response.data?.data || response.data;
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  },

  /**
   * Lấy chi tiết đơn hàng theo ID
   */
  async getMyOrderById(orderId: number | string): Promise<OrderResponse> {
    const response = await axiosClient.get<ApiResponse<OrderResponse>>(
      ENDPOINTS.ORDERS.DETAIL(orderId)
    );

    const data = response.data?.data || response.data;
    if (data) {
      return data;
    }
    throw new Error(`Không tìm thấy đơn hàng #${orderId}`);
  },

  /**
   * Khách hàng hủy đơn hàng (khi đơn đang ở trạng thái PENDING)
   */
  async cancelMyOrder(orderId: number | string): Promise<OrderResponse> {
    const response = await axiosClient.put<ApiResponse<OrderResponse>>(
      ENDPOINTS.ORDERS.CANCEL(orderId)
    );

    const data = response.data?.data || response.data;
    if (data) {
      return data;
    }
    throw new Error(`Hủy đơn hàng #${orderId} thất bại`);
  },

  /**
   * [Admin] Lấy danh sách toàn bộ đơn hàng trực tiếp từ MySQL
   */
  async getAllOrders(status?: OrderStatus): Promise<OrderResponse[]> {
    const url = status
      ? `${ENDPOINTS.ADMIN_ORDERS.LIST}?status=${status}`
      : ENDPOINTS.ADMIN_ORDERS.LIST;

    const response = await axiosClient.get<ApiResponse<OrderResponse[]>>(url);

    const data = response.data?.data || response.data;
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  },

  /**
   * [Admin] Cập nhật trạng thái đơn hàng trực tiếp trên MySQL
   */
  async updateOrderStatus(
    orderId: number | string,
    payload: UpdateOrderStatusRequest
  ): Promise<OrderResponse> {
    const response = await axiosClient.put<ApiResponse<OrderResponse>>(
      ENDPOINTS.ADMIN_ORDERS.UPDATE_STATUS(orderId),
      payload
    );

    const data = response.data?.data || response.data;
    if (data) {
      return data;
    }
    throw new Error(`Cập nhật trạng thái đơn hàng #${orderId} thất bại`);
  },
};

export default orderService;
