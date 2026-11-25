// ============================================================
// Order Service — Gọi API Đặt hàng, Lịch sử đơn hàng, Quản lý đơn Admin
// Dữ liệu 100% kết nối trực tiếp với MySQL Database
// ============================================================

import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type {
  AdminCreateOrderRequest,
  AdminOrderUpdateRequest,
  CheckoutRequest,
  OrderResponse,
  OrderStatus,
  PaymentMethod,
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
  async cancelMyOrder(orderId: number | string, reason?: string): Promise<OrderResponse> {
    const response = await axiosClient.put<ApiResponse<OrderResponse>>(
      ENDPOINTS.ORDERS.CANCEL(orderId),
      reason ? { reason } : undefined
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
  async getAllOrders(
    status?: OrderStatus,
    params?: { keyword?: string; paymentMethod?: PaymentMethod }
  ): Promise<OrderResponse[]> {
    const queryParams: Record<string, string> = {};
    if (status) queryParams.status = status;
    if (params?.keyword) queryParams.keyword = params.keyword;
    if (params?.paymentMethod) queryParams.paymentMethod = params.paymentMethod;

    const response = await axiosClient.get<ApiResponse<OrderResponse[]>>(
      ENDPOINTS.ADMIN_ORDERS.LIST,
      { params: Object.keys(queryParams).length > 0 ? queryParams : undefined }
    );

    const data = response.data?.data || response.data;
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  },

  /**
   * [Admin] Lấy chi tiết 1 đơn hàng trực tiếp từ MySQL
   */
  async getOrderById(orderId: number | string): Promise<OrderResponse> {
    const response = await axiosClient.get<ApiResponse<OrderResponse>>(
      ENDPOINTS.ADMIN_ORDERS.DETAIL(orderId)
    );
    const data = response.data?.data || response.data;
    if (data) {
      return data;
    }
    throw new Error(`Không tìm thấy đơn hàng #${orderId}`);
  },

  /**
   * [Admin] Tạo đơn hàng mới thay khách hàng trực tiếp trên MySQL
   */
  async adminCreateOrder(payload: AdminCreateOrderRequest): Promise<OrderResponse> {
    const response = await axiosClient.post<ApiResponse<OrderResponse>>(
      ENDPOINTS.ADMIN_ORDERS.LIST,
      payload
    );
    const data = response.data?.data || response.data;
    if (data) {
      return data;
    }
    throw new Error('Không thể tạo đơn hàng mới');
  },

  /**
   * [Admin] Cập nhật thông tin giao nhận / thanh toán / ghi chú của đơn hàng
   */
  async updateOrderInfo(
    orderId: number | string,
    payload: AdminOrderUpdateRequest
  ): Promise<OrderResponse> {
    const response = await axiosClient.put<ApiResponse<OrderResponse>>(
      ENDPOINTS.ADMIN_ORDERS.DETAIL(orderId),
      payload
    );
    const data = response.data?.data || response.data;
    if (data) {
      return data;
    }
    throw new Error(`Cập nhật thông tin đơn hàng #${orderId} thất bại`);
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
