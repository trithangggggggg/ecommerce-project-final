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
   * Tạo yêu cầu thanh toán SePay.
   * Backend trả về checkoutUrl + checkoutFields (form POST fields).
   * Frontend cần submit form POST ẩn đến checkoutUrl.
   */
  async createSepayPayment(
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

  /**
   * Xác thực kết quả thanh toán từ SePay sau khi redirect về.
   * Chấp nhận toàn bộ query params từ URL (payment, invoice, orderId...)
   */
  async verifySepayReturn(
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

  /**
   * Tạo và submit hidden form POST đến SePay checkout URL.
   * Đây là cơ chế SePay yêu cầu (không phải redirect đơn giản).
   */
  submitSepayForm(checkoutUrl: string, checkoutFields: Record<string, string>): void {
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
  },
};

export default paymentService;
