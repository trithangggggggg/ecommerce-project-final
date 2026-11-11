package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Phản hồi khi khởi tạo thanh toán SePay: chứa URL cổng thanh toán và toàn bộ các trường đã ký HMAC-SHA256 Base64
 * để Frontend submit form POST trực tiếp sang cổng SePay.
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
    private String checkoutUrl;
    private Map<String, String> checkoutFields;
}

