package ra.project.server.model.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Phản hồi khi khởi tạo thanh toán SePay:
 * - Chế độ VietQR trực tiếp tại Nexor: trả thông tin QR (`qrImageUrl`, `qrDownloadUrl`, tài khoản ngân hàng, nội dung CK).
 * - Chế độ Gateway (nếu dùng): trả `checkoutUrl` + `checkoutFields`.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SepayPaymentResponse {

    private Long orderId;
    private String invoiceNumber;
    private Long amount;
    private String currency;

    // Thông tin thanh toán VietQR nhúng trực tiếp trên website Nexor
    private String paymentMode;
    private String paymentCode;
    private String transferContent;
    private String bankCode;
    private String bankName;
    private String accountNumber;
    private String accountHolder;
    private String qrImageUrl;
    private String qrDownloadUrl;
    private long timeoutSeconds;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime expiresAt;

    // Tham số Payment Gateway (tùy chọn tương thích ngược)
    private String checkoutUrl;
    private Map<String, String> checkoutFields;
}

