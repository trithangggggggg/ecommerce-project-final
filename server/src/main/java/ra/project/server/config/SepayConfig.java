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
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Cấu hình tích hợp SePay:
 * - VietQR chuyển khoản trực tiếp tại website + Webhook biến động số dư (API Key / X-Secret-Key)
 * - SePay Payment Gateway v1 (ký HMAC-SHA256 Base64 & IPN) để tương thích ngược
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

    // Cấu hình SePay Payment Gateway v1 (tùy chọn tương thích ngược)
    private String merchantId;
    private String secretKey;
    private String ipnSecretKey;
    private String checkoutUrl = "https://pay-sandbox.sepay.vn/v1/checkout/init";
    private String apiUrl = "https://pgapi-sandbox.sepay.vn";
    private String successUrl = "http://localhost:5173/payment/result";
    private String errorUrl = "http://localhost:5173/payment/result";
    private String cancelUrl = "http://localhost:5173/payment/result";

    // Cấu hình SePay VietQR nhúng trực tiếp & Webhook biến động số dư
    private String bankAccount;
    private String bankCode;
    private String bankName;
    private String accountHolder;
    private String webhookApiKey;
    private String paymentPrefix = "DH";
    private String qrBaseUrl = "https://qr.sepay.vn/img";
    private String qrTemplate = "qronly";
    private int qrTimeoutMinutes = 15;

    /**
     * Kiểm tra đã cấu hình đủ thông tin tài khoản ngân hàng tạo VietQR trực tiếp hay chưa.
     */
    public boolean isQrConfigured() {
        return isNotBlank(bankAccount) && isNotBlank(bankCode);
    }

    /**
     * Kiểm tra đã cấu hình đủ Merchant ID và Secret Key cho SePay Payment Gateway hay chưa.
     */
    public boolean isConfigured() {
        return isNotBlank(merchantId) && isNotBlank(secretKey);
    }

    /**
     * Trả về tiền tố mã thanh toán chuẩn chỉ gồm chữ cái in hoa (mặc định "DH") khớp cấu hình SePay.
     */
    public String getEffectivePaymentPrefix() {
        if (!isNotBlank(paymentPrefix)) {
            return "DH";
        }
        String sanitized = paymentPrefix.trim().toUpperCase().replaceAll("[^A-Z]", "");
        return sanitized.isEmpty() ? "DH" : sanitized;
    }

    /**
     * Trả về tên ngân hàng hiển thị thân thiện cho giao diện chuyển khoản.
     */
    public String resolveDisplayBankName() {
        if (isNotBlank(bankName)) {
            return bankName.trim();
        }
        if (!isNotBlank(bankCode)) {
            return "";
        }
        String normalized = bankCode.trim().toUpperCase();
        return switch (normalized) {
            case "MB", "MBBANK" -> "MB Bank (Ngân hàng TMCP Quân Đội)";
            case "VCB", "VIETCOMBANK" -> "Vietcombank (Ngân hàng Ngoại Thương)";
            case "TCB", "TECHCOMBANK" -> "Techcombank (Ngân hàng Kỹ Thương)";
            case "ACB" -> "ACB (Ngân hàng TMCP Á Châu)";
            case "BIDV" -> "BIDV (Ngân hàng Đầu Tư & Phát Triển)";
            case "VTB", "VIETINBANK", "CTG" -> "VietinBank (Ngân hàng Công Thương)";
            case "TPB", "TPBANK" -> "TPBank (Ngân hàng Tiên Phong)";
            case "VPB", "VPBANK" -> "VPBank (Ngân hàng Việt Nam Thịnh Vượng)";
            case "STB", "SACOMBANK" -> "Sacombank (Ngân hàng Sài Gòn Thương Tín)";
            case "VIB" -> "VIB (Ngân hàng Quốc Tế)";
            case "SHB" -> "SHB (Ngân hàng Sài Gòn - Hà Nội)";
            case "OCB" -> "OCB (Ngân hàng Phương Đông)";
            case "MSB" -> "MSB (Ngân hàng Hàng Hải)";
            case "HDB", "HDBANK" -> "HDBank (Ngân hàng Phát Triển TP.HCM)";
            default -> bankCode.trim();
        };
    }

    /**
     * Trả về Secret Key ưu tiên dùng xác thực Webhook/IPN (ưu tiên webhookApiKey, rồi ipnSecretKey, cuối cùng secretKey).
     */
    public String getEffectiveIpnSecretKey() {
        if (isNotBlank(webhookApiKey)) {
            return webhookApiKey.trim();
        }
        if (isNotBlank(ipnSecretKey)) {
            return ipnSecretKey.trim();
        }
        return secretKey != null ? secretKey.trim() : "";
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
     * Xác thực Webhook / IPN request từ SePay theo `Authorization: Apikey <key>` (chuẩn SePay Webhook),
     * `Authorization: Bearer <key>`, `Authorization: Basic ...` hoặc header `X-Secret-Key` bằng so sánh constant-time.
     */
    public boolean isValidIpnAuth(String xSecretKey, String authorizationHeader) {
        String[] candidates = new String[]{
                normalizeOrNull(webhookApiKey),
                normalizeOrNull(ipnSecretKey),
                normalizeOrNull(secretKey)
        };

        boolean hasAnySecret = false;
        for (String c : candidates) {
            if (c != null) {
                hasAnySecret = true;
                break;
            }
        }
        if (!hasAnySecret) {
            return false;
        }

        if (isNotBlank(xSecretKey) && matchesAnyCandidate(xSecretKey.trim(), candidates)) {
            return true;
        }

        if (isNotBlank(authorizationHeader)) {
            String trimmed = authorizationHeader.trim();
            String lower = trimmed.toLowerCase(Locale.ROOT);
            if (lower.startsWith("apikey ") || lower.startsWith("bearer ")) {
                String token = trimmed.substring(7).trim();
                return matchesAnyCandidate(token, candidates);
            }
            if (lower.startsWith("basic ")) {
                String mId = merchantId != null ? merchantId.trim() : "";
                for (String expected : candidates) {
                    if (expected != null) {
                        String expectedBasic = "Basic " + Base64.getEncoder().encodeToString(
                                (mId + ":" + expected).getBytes(StandardCharsets.UTF_8));
                        if (constantTimeEquals(expectedBasic, trimmed)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    private static boolean matchesAnyCandidate(String token, String[] candidates) {
        if (!isNotBlank(token)) {
            return false;
        }
        for (String expected : candidates) {
            if (expected != null && constantTimeEquals(expected, token)) {
                return true;
            }
        }
        return false;
    }

    private static String normalizeOrNull(String value) {
        return isNotBlank(value) ? value.trim() : null;
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

