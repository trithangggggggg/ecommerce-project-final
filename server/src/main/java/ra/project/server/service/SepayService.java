package ra.project.server.service;

import ra.project.server.model.dto.request.CreatePaymentRequest;
import ra.project.server.model.dto.response.SepayPaymentResponse;
import ra.project.server.model.dto.response.SepayReturnResponse;

import java.util.Map;

/**
 * Service xử lý tích hợp thanh toán SePay:
 * tạo mã VietQR nhúng trực tiếp tại website Nexor, xử lý Webhook biến động số dư / IPN idempotent
 * và cung cấp trạng thái đơn hàng thời gian thực cho Frontend.
 */
public interface SepayService {

    /**
     * Khởi tạo thông tin thanh toán SePay VietQR trực tiếp cho đơn hàng của người dùng hiện tại.
     */
    SepayPaymentResponse createPaymentCheckout(CreatePaymentRequest request);

    /**
     * Xử lý Webhook biến động số dư từ SePay (HTTP POST JSON kèm `Authorization: Apikey ...`),
     * đối chiếu mã thanh toán, kiểm tra số tiền và cập nhật đơn hàng idempotent.
     */
    Map<String, Object> handleWebhook(String xSecretKey, String authorizationHeader, String rawWebhookPayload);

    /**
     * Xử lý IPN callback (hỗ trợ cả Payment Gateway IPN và Webhook biến động số dư).
     */
    Map<String, Object> handleIpn(String xSecretKey, String authorizationHeader, String rawIpnPayload);

    /**
     * Kiểm tra trạng thái thanh toán của đơn hàng thuộc sở hữu người dùng hiện tại (dùng cho polling tại FE).
     */
    SepayReturnResponse getPaymentStatus(Long orderId);

    /**
     * Đọc trạng thái thanh toán trả về cho Frontend hiển thị (read-only, không tự ý ghi DB).
     */
    SepayReturnResponse handlePaymentReturn(Map<String, String> params);
}

