import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';

// ============================================================
// Models
// ============================================================
export interface SepayCreatePaymentRequest {
  orderId: number | string;
  description?: string;
  paymentMethod?: string;
}

export interface SepayPaymentResponse {
  orderId: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paymentMode?: string;
  paymentCode?: string;
  transferContent?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  qrImageUrl?: string;
  qrDownloadUrl?: string;
  timeoutSeconds?: number;
  expiresAt?: string;
  checkoutUrl?: string | null;
  checkoutFields?: Record<string, string>;
}

export interface SepayReturnResponse {
  success: boolean;
  cancelled: boolean;
  status: string;
  message: string;
  orderId: number | null;
  invoiceNumber: string | null;
  sepayOrderId?: string | null;
  paymentReference?: string | null;
  amount: number | null;
  orderStatus: string | null;
  paymentStatus: string | null;
  paidAt?: string | null;
}

// ============================================================
// Helpers & Payment Service
// ============================================================
function unwrapApiData<T>(raw: unknown): T {
  if (
    raw &&
    typeof raw === 'object' &&
    'data' in raw &&
    (raw as { data?: unknown }).data !== undefined
  ) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export const paymentService = {
  /**
   * Khởi tạo thanh toán SePay VietQR trực tiếp tại website Nexor.
   */
  async createPayment(
    data: SepayCreatePaymentRequest
  ): Promise<SepayPaymentResponse> {
    const response = await axiosClient.post(
      ENDPOINTS.PAYMENT.SEPAY_CREATE,
      data
    );
    return unwrapApiData<SepayPaymentResponse>(response.data);
  },

  // Alias để tương thích
  async createSepayPayment(
    data: SepayCreatePaymentRequest
  ): Promise<SepayPaymentResponse> {
    return this.createPayment(data);
  },

  /**
   * Kiểm tra trạng thái thanh toán thời gian thực của đơn hàng (dùng cho polling tại trang QR Nexor).
   */
  async getPaymentStatus(
    orderId: number | string
  ): Promise<SepayReturnResponse> {
    const response = await axiosClient.get(
      ENDPOINTS.PAYMENT.SEPAY_STATUS(orderId)
    );
    return unwrapApiData<SepayReturnResponse>(response.data);
  },

  /**
   * Xác thực kết quả thanh toán sau khi cổng thanh toán redirect về.
   * Chấp nhận toàn bộ query params từ URL (payment, invoice, orderId, vnpay params...).
   */
  async verifyPayment(
    params: Record<string, string>
  ): Promise<SepayReturnResponse> {
    const response = await axiosClient.get(
      ENDPOINTS.PAYMENT.SEPAY_RETURN,
      { params }
    );
    return unwrapApiData<SepayReturnResponse>(response.data);
  },

  // Alias để tương thích
  async verifySepayReturn(
    params: Record<string, string>
  ): Promise<SepayReturnResponse> {
    return this.verifyPayment(params);
  },

  /**
   * Chuyển hướng người dùng sang cổng thanh toán:
   * - Nếu cổng thanh toán cung cấp form fields đã ký: Tạo form ẩn và submit POST (chuẩn SePay).
   * - Nếu chỉ có checkoutUrl trực tiếp: Điều hướng URL bằng window.location.href.
   */
  redirectToGateway(
    checkoutUrl: string,
    checkoutFields?: Record<string, string>
  ): void {
    if (checkoutFields && Object.keys(checkoutFields).length > 0) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = checkoutUrl;
      form.style.display = 'none';

      Object.entries(checkoutFields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } else if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  },

  // Alias để tương thích
  submitSepayForm(checkoutUrl: string, checkoutFields: Record<string, string>): void {
    this.redirectToGateway(checkoutUrl, checkoutFields);
  },
};

export default paymentService;
