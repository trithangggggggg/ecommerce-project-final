package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.CreatePaymentRequest;
import ra.project.server.model.dto.response.SepayPaymentResponse;
import ra.project.server.model.dto.response.SepayReturnResponse;
import ra.project.server.service.SepayService;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/payment/sepay")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PaymentController {

    private final SepayService sepayService;

    /**
     * Khởi tạo thông tin thanh toán SePay VietQR trực tiếp trên website Nexor cho đơn hàng của người dùng hiện tại.
     */
    @PostMapping("/create-payment")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SepayPaymentResponse>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request) {
        SepayPaymentResponse response = sepayService.createPaymentCheckout(request);
        return ResponseEntity.ok(ApiResponse.success("Khởi tạo mã VietQR SePay thành công", response));
    }

    /**
     * Endpoint Webhook biến động số dư từ SePay (HTTP POST JSON kèm header `Authorization: Apikey <key>`).
     * Đối chiếu mã thanh toán, xác thực số tiền và tự động xác nhận đơn hàng idempotent.
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestHeader(value = "X-Secret-Key", required = false) String xSecretKey,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody String webhookPayload) {
        Map<String, Object> result = sepayService.handleWebhook(xSecretKey, authorizationHeader, webhookPayload);
        return ResponseEntity.ok(result);
    }

    /**
     * Endpoint IPN (hỗ trợ cả Payment Gateway IPN lẫn Webhook biến động số dư).
     */
    @PostMapping("/ipn")
    public ResponseEntity<Map<String, Object>> handleIpn(
            @RequestHeader(value = "X-Secret-Key", required = false) String xSecretKey,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody String ipnPayload) {
        Map<String, Object> result = sepayService.handleIpn(xSecretKey, authorizationHeader, ipnPayload);
        return ResponseEntity.ok(result);
    }

    /**
     * API cho Frontend polling kiểm tra trạng thái thanh toán thời gian thực ngay tại trang QR của Nexor.
     */
    @GetMapping("/status/{orderId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SepayReturnResponse>> getPaymentStatus(@PathVariable Long orderId) {
        SepayReturnResponse status = sepayService.getPaymentStatus(orderId);
        return ResponseEntity.ok(ApiResponse.success(status.getMessage(), status));
    }

    /**
     * Endpoint nhận query params khi SePay điều hướng trình duyệt về success_url / error_url / cancel_url,
     * trả bản tóm tắt read-only cho Frontend hiển thị (không tự ý ghi DB).
     */
    @GetMapping("/payment-return")
    public ResponseEntity<ApiResponse<SepayReturnResponse>> handlePaymentReturn(
            @RequestParam Map<String, String> params) {
        SepayReturnResponse result = sepayService.handlePaymentReturn(params);
        return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
    }
}
