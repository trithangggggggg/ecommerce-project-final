package ra.project.server.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Map;
import java.util.Set;

/**
 * Cấu hình cổng thanh toán SePay Payment Gateway và tiện ích ký/xác thực HMAC-SHA256 Base64 + X-Secret-Key IPN.
 */
@Configuration
@ConfigurationProperties(prefix = "sepay")
@Getter
@Setter
public class SepayConfig {

    /**
     * Danh sách các field hợp lệ tham gia tạo chữ ký checkout của SePay Payment Gateway.
     */
    public static final Set<String> ALLOWED_SIGNED_FIELDS = Set.of(
            "merchant",
            "operation",
            "payment_method",
            "order_amount",
            "currency",
            "order_invoice_number",
            "order_description",
            "customer_id",
            "success_url",
            "error_url",
            "cancel_url"
    );

    private String merchantId;
    private String secretKey;
    private String ipnSecretKey;
    private String checkoutUrl = "https://pay-sandbox.sepay.vn/v1/checkout/init";
    private String apiUrl = "https://pgapi-sandbox.sepay.vn";
    private String successUrl = "http://localhost:5173/payment/result";
    private String errorUrl = "http://localhost:5173/payment/result";
    private String cancelUrl = "http://localhost:5173/payment/result";

    /**
     * Kiểm tra đã cấu hình đủ Merchant ID và Secret Key cho SePay hay chưa.
     */
    public boolean isConfigured() {
        return isNotBlank(merchantId) && isNotBlank(secretKey);
    }

    /**
     * Trả về Secret Key dùng xác thực IPN (ưu tiên ipnSecretKey riêng nếu có, mặc định dùng secretKey).
     */
    public String getEffectiveIpnSecretKey() {
        return isNotBlank(ipnSecretKey) ? ipnSecretKey.trim() : (secretKey != null ? secretKey.trim() : "");
    }

    /**
     * Tạo Basic Authentication header (`Basic base64(merchantId:secretKey)`) cho API pgapi của SePay.
     */
    public String buildBasicAuthHeader() {
        String credentials = (merchantId != null ? merchantId.trim() : "")
                + ":" + (secretKey != null ? secretKey.trim() : "");
        return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Xác thực IPN request từ SePay theo X-Secret-Key hoặc Authorization (Apikey/Bearer/Basic) bằng so sánh constant-time.
     */
    public boolean isValidIpnAuth(String xSecretKey, String authorizationHeader) {
        String expectedSecret = getEffectiveIpnSecretKey();
        if (!isNotBlank(expectedSecret)) {
            return false;
        }

        if (isNotBlank(xSecretKey)) {
            return constantTimeEquals(expectedSecret, xSecretKey.trim());
        }

        if (isNotBlank(authorizationHeader)) {
            String trimmed = authorizationHeader.trim();
            String lower = trimmed.toLowerCase();
            if (lower.startsWith("apikey ")) {
                return constantTimeEquals(expectedSecret, trimmed.substring(7).trim());
            }
            if (lower.startsWith("bearer ")) {
                return constantTimeEquals(expectedSecret, trimmed.substring(7).trim());
            }
            if (lower.startsWith("basic ")) {
                String expectedBasic = buildBasicAuthHeader();
                String expectedIpnBasic = "Basic " + Base64.getEncoder().encodeToString(
                        ((merchantId != null ? merchantId.trim() : "") + ":" + expectedSecret)
                                .getBytes(StandardCharsets.UTF_8));
                return constantTimeEquals(expectedBasic, trimmed) || constantTimeEquals(expectedIpnBasic, trimmed);
            }
        }
        return false;
    }

    /**
     * Ký danh sách form fields gửi sang `/v1/checkout/init` của SePay theo đúng quy tắc:
     * giữ thứ tự field trong map, chỉ lấy thuộc tính thuộc {@link #ALLOWED_SIGNED_FIELDS},
     * bỏ qua giá trị rỗng hoặc "0", nối bằng dấu phẩy `,` và băm HMAC-SHA256 -> Base64.
     */
    public static String signCheckoutFields(Map<String, String> fields, String secretKey) {
        if (fields == null || !isNotBlank(secretKey)) {
            throw new IllegalArgumentException("Fields và secretKey không được để trống khi ký SePay");
        }
        StringBuilder dataToSign = new StringBuilder();
        for (Map.Entry<String, String> entry : fields.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (!ALLOWED_SIGNED_FIELDS.contains(key)) {
                continue;
            }
            if (value == null || value.isBlank() || "0".equals(value.trim())) {
                continue;
            }
            if (!dataToSign.isEmpty()) {
                dataToSign.append(',');
            }
            dataToSign.append(key).append('=').append(value);
        }
        return hmacSha256Base64(secretKey.trim(), dataToSign.toString());
    }

    /**
     * Tính mã băm HMAC-SHA256 và encode sang chuỗi Base64 theo chuẩn SePay.
     */
    public static String hmacSha256Base64(String key, String data) {
        if (key == null || data == null) {
            throw new IllegalArgumentException("Key và data không được null khi ký HMAC-SHA256");
        }
        try {
            Mac hmac256 = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac256.init(secretKeySpec);
            byte[] rawBytes = hmac256.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(rawBytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Không thể tạo chữ ký HMAC-SHA256 Base64 cho SePay", e);
        }
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }
}

