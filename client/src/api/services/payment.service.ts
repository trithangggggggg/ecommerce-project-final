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
  checkoutUrl: string;
  checkoutFields: Record<string, string>;
}

export interface SepayReturnResponse {
  success: boolean;
  cancelled: boolean;
  status: string;
  message: string;
  orderId: number | null;
  invoiceNumber: string | null;
  amount: number | null;
  orderStatus: string | null;
  paymentStatus: string | null;
}

// ============================================================
// Payment Service
// ============================================================
export const paymentService = {
  /**
   * Khởi tạo yêu cầu thanh toán (SePay / VNPAY).
   * Backend trả về checkoutUrl + checkoutFields (chữ ký HMAC).
   */
  async createPayment(
    data: SepayCreatePaymentRequest
  ): Promise<SepayPaymentResponse> {
    const response = await axiosClient.post(
      ENDPOINTS.PAYMENT.SEPAY_CREATE,
      data
    );
    if (response.data && 'data' in response.data && response.data.data) {
      return response.data.data as SepayPaymentResponse;
    }
    return response.data as SepayPaymentResponse;
  },

  // Alias để tương thích
  async createSepayPayment(
    data: SepayCreatePaymentRequest
  ): Promise<SepayPaymentResponse> {
    return this.createPayment(data);
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
    if (response.data && 'data' in response.data && response.data.data) {
      return response.data.data as SepayReturnResponse;
    }
    return response.data as SepayReturnResponse;
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
