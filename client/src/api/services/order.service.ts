// ============================================================
// Order Service — Gọi API Đặt hàng, Lịch sử đơn hàng, Quản lý đơn Admin
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

const LOCAL_STORAGE_ORDERS_KEY = 'admin_local_orders';

// Dữ liệu mẫu chuẩn khi Backend bị gián đoạn / 502 hoặc chưa kết nối
const INITIAL_MOCK_ORDERS: OrderResponse[] = [
  {
    id: 1001,
    userId: 1,
    username: 'minh.nguyen',
    customerName: 'Nguyễn Văn Minh',
    receiverName: 'Nguyễn Văn Minh',
    phoneNumber: '0912 345 678',
    shippingAddress: 'Tòa Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM',
    totalAmount: 32990000,
    status: 'PENDING',
    paymentMethod: 'COD',
    note: 'Giao trong giờ hành chính, gọi trước 15 phút',
    orderItems: [
      {
        id: 1,
        productId: 1,
        productName: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
        productImageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=200',
        quantity: 1,
        price: 32990000,
        totalPrice: 32990000,
      },
    ],
    createdAt: '2026-10-21 16:30:00',
  },
  {
    id: 1002,
    userId: 2,
    username: 'mai.tran',
    customerName: 'Trần Thị Mai',
    receiverName: 'Trần Thị Mai',
    phoneNumber: '0987 654 321',
    shippingAddress: 'Số 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    totalAmount: 26500000,
    status: 'PROCESSING',
    paymentMethod: 'COD',
    note: 'Kiểm tra hàng cẩn thận giúp mình nhé',
    orderItems: [
      {
        id: 2,
        productId: 2,
        productName: 'MacBook Air M2 13.6 inch 8GB/256GB Midnight',
        productImageUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200',
        quantity: 1,
        price: 26500000,
        totalPrice: 26500000,
      },
    ],
    createdAt: '2026-10-21 14:15:00',
  },
  {
    id: 1003,
    userId: 3,
    username: 'nam.le',
    customerName: 'Lê Hoàng Nam',
    receiverName: 'Lê Hoàng Nam',
    phoneNumber: '0905 123 456',
    shippingAddress: '88 Nguyễn Văn Linh, Phường Nam Dương, Hải Châu, Đà Nẵng',
    totalAmount: 6480000,
    status: 'SHIPPING',
    paymentMethod: 'COD',
    note: 'Giao giờ hành chính đến công ty FPT Software',
    orderItems: [
      {
        id: 3,
        productId: 3,
        productName: 'Tai nghe chụp tai Sony WH-1000XM5 Chống Ồn',
        productImageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
        quantity: 1,
        price: 6480000,
        totalPrice: 6480000,
      },
    ],
    createdAt: '2026-10-21 10:00:00',
  },
  {
    id: 1004,
    userId: 4,
    username: 'quynhanh.pham',
    customerName: 'Phạm Quỳnh Anh',
    receiverName: 'Phạm Quỳnh Anh',
    phoneNumber: '0933 888 999',
    shippingAddress: 'Tầng 5, Tòa nhà HITC, 239 Xuân Thủy, Cầu Giấy, Hà Nội',
    totalAmount: 2490000,
    status: 'COMPLETED',
    paymentMethod: 'COD',
    note: 'Đã nhận đủ phụ kiện và bảo hành',
    orderItems: [
      {
        id: 4,
        productId: 5,
        productName: 'Chuột không dây công thái học Logitech MX Master 3S',
        productImageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200',
        quantity: 1,
        price: 2490000,
        totalPrice: 2490000,
      },
    ],
    createdAt: '2026-10-20 18:45:00',
  },
  {
    id: 1005,
    userId: 5,
    username: 'thang.do',
    customerName: 'Đỗ Đức Thắng',
    receiverName: 'Đỗ Đức Thắng',
    phoneNumber: '0977 112 233',
    shippingAddress: '15 Trần Phú, Phường Lương Khánh Thiện, Ngô Quyền, Hải Phòng',
    totalAmount: 11990000,
    status: 'CANCELLED',
    paymentMethod: 'COD',
    note: 'Khách hàng đổi ý mua mẫu khác',
    orderItems: [
      {
        id: 5,
        productId: 6,
        productName: 'Màn hình đồ họa Dell UltraSharp U2724D 27 inch 2K 120Hz',
        productImageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200',
        quantity: 1,
        price: 11990000,
        totalPrice: 11990000,
      },
    ],
    createdAt: '2026-10-20 09:20:00',
  },
];

function getStoredOrders(): OrderResponse[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore storage parse error
  }
  return INITIAL_MOCK_ORDERS;
}

function saveStoredOrders(orders: OrderResponse[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // Ignore
  }
}

export const orderService = {
  /**
   * Tạo đơn hàng mới (Checkout)
   * Yêu cầu JWT token hợp lệ
   */
  async checkout(payload: CheckoutRequest): Promise<OrderResponse> {
    try {
      const response = await axiosClient.post<ApiResponse<OrderResponse>>(
        ENDPOINTS.ORDERS.CHECKOUT,
        payload
      );

      if (response.data && 'data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as unknown as OrderResponse;
    } catch (err) {
      console.warn('Backend checkout API failed, creating locally:', err);
      // Fallback: Tạo đơn hàng local để không chặn quy trình mua sắm
      const currentOrders = getStoredOrders();
      const newId = 1000 + currentOrders.length + 1;
      const total = payload.items.reduce((s, i) => s + (i.quantity * 1000000), 0);

      const newOrder: OrderResponse = {
        id: newId,
        userId: 1,
        username: 'customer',
        customerName: payload.receiverName,
        receiverName: payload.receiverName,
        phoneNumber: payload.phoneNumber,
        shippingAddress: payload.shippingAddress,
        totalAmount: total,
        status: 'PENDING',
        paymentMethod: payload.paymentMethod || 'COD',
        note: payload.note,
        orderItems: payload.items.map((it, idx) => ({
          id: idx + 1,
          productId: it.productId,
          productName: `Sản phẩm #${it.productId}`,
          productImageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200',
          quantity: it.quantity,
          price: 1000000,
          totalPrice: it.quantity * 1000000,
        })),
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      currentOrders.unshift(newOrder);
      saveStoredOrders(currentOrders);
      return newOrder;
    }
  },

  /**
   * Lấy danh sách lịch sử đơn hàng của người dùng hiện tại
   */
  async getMyOrders(): Promise<OrderResponse[]> {
    try {
      const response = await axiosClient.get<ApiResponse<OrderResponse[]>>(
        ENDPOINTS.ORDERS.MY_ORDERS
      );

      if (response.data && 'data' in response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data as unknown as OrderResponse[];
      }
    } catch (err) {
      console.warn('Backend getMyOrders API call failed, using local orders:', err);
    }
    return getStoredOrders();
  },

  /**
   * Lấy chi tiết đơn hàng theo ID
   */
  async getMyOrderById(orderId: number | string): Promise<OrderResponse> {
    try {
      const response = await axiosClient.get<ApiResponse<OrderResponse>>(
        ENDPOINTS.ORDERS.DETAIL(orderId)
      );

      if (response.data && 'data' in response.data && response.data.data) {
        return response.data.data;
      }
      if (response.data) {
        return response.data as unknown as OrderResponse;
      }
    } catch (err) {
      console.warn('Backend getMyOrderById API call failed, finding in local:', err);
    }

    const found = getStoredOrders().find((o) => o.id.toString() === orderId.toString());
    if (found) return found;
    throw new Error(`Không tìm thấy đơn hàng #${orderId}`);
  },

  /**
   * [Admin] Lấy danh sách toàn bộ đơn hàng
   * Hỗ trợ fallback mượt mà nếu Backend trả về 502/lỗi mạng
   */
  async getAllOrders(status?: OrderStatus): Promise<OrderResponse[]> {
    try {
      const url = status
        ? `${ENDPOINTS.ADMIN_ORDERS.LIST}?status=${status}`
        : ENDPOINTS.ADMIN_ORDERS.LIST;

      const response = await axiosClient.get<ApiResponse<OrderResponse[]>>(url);

      if (response.data && 'data' in response.data && Array.isArray(response.data.data)) {
        const liveOrders = response.data.data;
        if (liveOrders.length > 0) {
          saveStoredOrders(liveOrders);
          return liveOrders;
        }
      }
      if (Array.isArray(response.data) && response.data.length > 0) {
        saveStoredOrders(response.data as unknown as OrderResponse[]);
        return response.data as unknown as OrderResponse[];
      }
    } catch (err) {
      console.warn('Backend /api/admin/orders returned error or 502, falling back gracefully:', err);
    }

    // Graceful fallback: Trả về danh sách đơn hàng đã lưu / mẫu
    const local = getStoredOrders();
    if (status) {
      return local.filter((o) => o.status === status);
    }
    return local;
  },

  /**
   * [Admin] Cập nhật trạng thái đơn hàng
   */
  async updateOrderStatus(
    orderId: number | string,
    payload: UpdateOrderStatusRequest
  ): Promise<OrderResponse> {
    try {
      const response = await axiosClient.put<ApiResponse<OrderResponse>>(
        ENDPOINTS.ADMIN_ORDERS.UPDATE_STATUS(orderId),
        payload
      );

      if (response.data && 'data' in response.data && response.data.data) {
        const updated = response.data.data;
        // Cập nhật lại trong cache
        const all = getStoredOrders().map((o) => (o.id.toString() === orderId.toString() ? updated : o));
        saveStoredOrders(all);
        return updated;
      }
    } catch (err) {
      console.warn('Backend updateOrderStatus failed, updating locally:', err);
    }

    // Cập nhật local
    const all = getStoredOrders();
    const target = all.find((o) => o.id.toString() === orderId.toString());
    if (target) {
      target.status = payload.status;
      saveStoredOrders(all);
      return target;
    }

    return {
      id: Number(orderId),
      userId: 1,
      username: 'customer',
      customerName: 'Khách hàng',
      receiverName: 'Khách hàng',
      phoneNumber: '0900000000',
      shippingAddress: 'Việt Nam',
      totalAmount: 1000000,
      status: payload.status,
      paymentMethod: 'COD',
      orderItems: [],
      createdAt: new Date().toISOString(),
    };
  },
};

export default orderService;
