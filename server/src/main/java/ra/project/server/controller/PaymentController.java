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
     * Khởi tạo bộ tham số form checkout đã ký HMAC-SHA256 Base64 cho đơn hàng của người dùng hiện tại.
     */
    @PostMapping("/create-payment")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SepayPaymentResponse>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request) {
        SepayPaymentResponse response = sepayService.createPaymentCheckout(request);
        return ResponseEntity.ok(ApiResponse.success("Khởi tạo thanh toán SePay thành công", response));
    }

    /**
     * Endpoint IPN (Instant Payment Notification) nhận callback POST JSON từ SePay.
     * Xác thực qua header X-Secret-Key / Authorization và cập nhật đơn hàng vào DB theo cơ chế idempotent.
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
