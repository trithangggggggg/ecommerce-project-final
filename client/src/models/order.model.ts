// ============================================================
// Order & Checkout TypeScript Models
// ============================================================

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'COD' | 'ONLINE';

export interface OrderItemRequest {
  productId?: number;
  variantId?: number;
  quantity: number;
}

export interface CheckoutRequest {
  receiverName: string;
  phoneNumber: string;
  shippingAddress: string;
  note?: string;
  couponCode?: string;
  paymentMethod?: PaymentMethod;
  items: OrderItemRequest[];
}

export interface OrderItemResponse {
  id: number;
  productId: number;
  productName: string;
  variantId?: number;
  variantName?: string;
  sku?: string;
  productImageUrl: string;
  quantity: number;
  price: number;
  totalPrice: number;
  categoryId?: number;
  categoryName?: string;
}

export interface OrderResponse {
  id: number;
  userId: number;
  username: string;
  customerName: string;
  receiverName: string;
  phoneNumber: string;
  shippingAddress: string;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  note?: string;
  cancelReason?: string;
  compensationCoupon?: string;
  couponCode?: string;
  discountAmount?: number;
  orderItems: OrderItemResponse[];
  items?: OrderItemResponse[];
  createdAt: string;
  updatedAt?: string;
}

export type Order = OrderResponse;
export type OrderItem = OrderItemResponse;

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  PENDING: {
    label: 'Chờ xử lý',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  PROCESSING: {
    label: 'Đang xử lý',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  COMPLETED: {
    label: 'Đã hoàn thành',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  CANCELLED: {
    label: 'Đã hủy',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
};
