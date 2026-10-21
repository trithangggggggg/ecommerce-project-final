export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'BANK_TRANSFER' | 'CREDIT_CARD';

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  userId: number;
  username?: string;
  customerName?: string;
  receiverName: string;
  phoneNumber: string;
  shippingAddress: string;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  note?: string;
  orderItems: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface CheckoutRequest {
  receiverName: string;
  phoneNumber: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  note?: string;
  items: {
    productId: number;
    quantity: number;
  }[];
}
