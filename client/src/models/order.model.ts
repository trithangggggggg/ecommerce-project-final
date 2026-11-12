// ============================================================
// Order & Checkout TypeScript Models
// ============================================================

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'COD' | 'ONLINE' | 'BANK_TRANSFER' | 'VNPAY' | 'MOMO' | 'SEPAY';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';

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
  shippingCouponCode?: string;
  carrierId?: number;
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
  finalAmount?: number;
  shippingCarrierName?: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  sepayInvoiceNumber?: string;
  sepayOrderId?: string;
  paymentReference?: string;
  paidAt?: string;
  note?: string;
  cancelReason?: string;
  compensationCoupon?: string;
  couponCode?: string;
  discountAmount?: number;
  shippingCouponCode?: string;
  shippingDiscount?: number;
  shippingFee?: number;
  carrierId?: number;
  carrierName?: string;
  carrierCode?: string;
  trackingCode?: string;
  orderItems: OrderItemResponse[];
  items?: OrderItemResponse[];
  createdAt: string;
  updatedAt?: string;
}

export type Order = OrderResponse;
export type OrderItem = OrderItemResponse;

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  carrierId?: number;
  trackingCode?: string;
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

export function getPaymentMethodLabel(
  method?: PaymentMethod | string | null
): string {
  switch (method) {
    case 'COD':
      return 'Thanh toán khi nhận hàng (COD)';
    case 'SEPAY':
      return 'Chuyển khoản VietQR (SePay)';
    case 'BANK_TRANSFER':
      return 'Chuyển khoản ngân hàng';
    case 'VNPAY':
      return 'Cổng thanh toán VNPAY';
    case 'MOMO':
      return 'Ví điện tử MoMo';
    default:
      return method || 'Chưa xác định';
  }
}

export function getPaymentStatusMeta(
  order: Pick<OrderResponse, 'status' | 'paymentStatus'>
): { label: string; className: string } {
  if (order.paymentStatus === 'PAID') {
    return {
      label: 'Đã thanh toán',
      className: 'bg-emerald-100 text-emerald-700',
    };
  }
  if (order.paymentStatus === 'REFUNDED') {
    return {
      label: 'Đã hoàn tiền',
      className: 'bg-indigo-100 text-indigo-700',
    };
  }
  if (order.paymentStatus === 'FAILED') {
    return {
      label: 'Thanh toán thất bại',
      className: 'bg-rose-100 text-rose-700',
    };
  }
  if (order.status === 'PENDING') {
    return {
      label: 'Chờ thanh toán',
      className: 'bg-amber-100 text-amber-800',
    };
  }
  return {
    label: 'Chưa thanh toán',
    className: 'bg-slate-100 text-slate-600',
  };
}

export function canPayOrderOnline(
  order: Pick<OrderResponse, 'status' | 'paymentMethod' | 'paymentStatus'>
): boolean {
  return (
    order.status === 'PENDING' &&
    order.paymentMethod !== 'COD' &&
    order.paymentStatus !== 'PAID'
  );
}
