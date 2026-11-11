package ra.project.server.service;

import ra.project.server.model.dto.request.CreatePaymentRequest;
import ra.project.server.model.dto.response.SepayPaymentResponse;
import ra.project.server.model.dto.response.SepayReturnResponse;

import java.util.Map;

/**
 * Service xử lý tích hợp cổng thanh toán SePay (Payment Gateway v1):
 * tạo form thanh toán đã ký HMAC-SHA256 Base64, xử lý IPN callback idempotent và trả kết quả hiển thị FE.
 */
public interface SepayService {

    /**
     * Tạo bộ tham số checkout đã ký để Frontend submit POST sang cổng thanh toán SePay.
     */
    SepayPaymentResponse createPaymentCheckout(CreatePaymentRequest request);

    /**
     * Xử lý IPN callback server-to-server (POST JSON) từ cổng SePay.
     * Xác thực khóa bí mật, kiểm tra số tiền và cập nhật trạng thái đơn hàng theo cơ chế idempotent.
     */
    Map<String, Object> handleIpn(String xSecretKey, String authorizationHeader, String rawIpnPayload);

    /**
     * Đọc trạng thái thanh toán trả về cho Frontend hiển thị (read-only, không tự ý ghi DB).
     */
    SepayReturnResponse handlePaymentReturn(Map<String, String> params);
}

