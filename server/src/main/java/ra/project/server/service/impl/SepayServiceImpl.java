package ra.project.server.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.config.SepayConfig;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ForbiddenException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.model.dto.request.CreatePaymentRequest;
import ra.project.server.model.dto.response.SepayPaymentResponse;
import ra.project.server.model.dto.response.SepayReturnResponse;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.model.enums.PaymentStatus;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.service.SepayService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
public class SepayServiceImpl implements SepayService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> ALLOWED_PAYMENT_METHODS = Set.of(
            "BANK_TRANSFER",
            "NAPAS_BANK_TRANSFER",
            "CARD"
    );

    private final SepayConfig sepayConfig;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Autowired
    public SepayServiceImpl(
            SepayConfig sepayConfig,
            OrderRepository orderRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this(
                sepayConfig,
                orderRepository,
                userRepository,
                objectMapper,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    }

    public SepayServiceImpl(
            SepayConfig sepayConfig,
            OrderRepository orderRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper,
            HttpClient httpClient) {
        this.sepayConfig = sepayConfig;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    @Override
    @Transactional
    public SepayPaymentResponse createPaymentCheckout(CreatePaymentRequest request) {
        validateSepayConfigured();

        User currentUser = getCurrentAuthenticatedUser();
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + request.getOrderId()));

        validateOrderOwnership(order, currentUser);
        validateOrderPayable(order);

        long amount = extractPositiveVndAmount(order.getTotalAmount());
        String invoiceNumber = generateInvoiceNumber(order.getId());
        String description = buildSafeDescription(request.getDescription(), order.getId());
        String normalizedPaymentMethod = normalizeOptionalPaymentMethod(request.getPaymentMethod());

        String successUrl = appendResultParams(sepayConfig.getSuccessUrl(), "success", order.getId(), invoiceNumber);
        String errorUrl = appendResultParams(sepayConfig.getErrorUrl(), "error", order.getId(), invoiceNumber);
        String cancelUrl = appendResultParams(sepayConfig.getCancelUrl(), "cancel", order.getId(), invoiceNumber);

        // Giữ đúng thứ tự field khớp chuẩn ALLOWED_SIGNED_FIELDS của SePay trước khi ký
        Map<String, String> checkoutFields = new LinkedHashMap<>();
        checkoutFields.put("merchant", sepayConfig.getMerchantId().trim());
        checkoutFields.put("operation", "PURCHASE");
        if (normalizedPaymentMethod != null) {
            checkoutFields.put("payment_method", normalizedPaymentMethod);
        }
        checkoutFields.put("order_amount", String.valueOf(amount));
        checkoutFields.put("currency", "VND");
        checkoutFields.put("order_invoice_number", invoiceNumber);
        checkoutFields.put("order_description", description);
        checkoutFields.put("customer_id", "CUST_" + order.getUser().getId());
        checkoutFields.put("success_url", successUrl);
        checkoutFields.put("error_url", errorUrl);
        checkoutFields.put("cancel_url", cancelUrl);

        String signature = SepayConfig.signCheckoutFields(checkoutFields, sepayConfig.getSecretKey());
        checkoutFields.put("signature", signature);

        order.setSepayInvoiceNumber(invoiceNumber);
        order.setPaymentMethod(PaymentMethod.SEPAY);
        order.setPaymentStatus(PaymentStatus.UNPAID);
        orderRepository.save(order);

        log.info("Khởi tạo form thanh toán SePay cho đơn #{} (invoice={}, amount={} VND)",
                order.getId(), invoiceNumber, amount);

        return SepayPaymentResponse.builder()
                .orderId(order.getId())
                .invoiceNumber(invoiceNumber)
                .amount(amount)
                .currency("VND")
                .checkoutUrl(sepayConfig.getCheckoutUrl())
                .checkoutFields(checkoutFields)
                .build();
    }

    @Override
    @Transactional
    public Map<String, Object> handleIpn(String xSecretKey, String authorizationHeader, String rawIpnPayload) {
        validateSepayConfigured();

        if (!sepayConfig.isValidIpnAuth(xSecretKey, authorizationHeader)) {
            log.warn("IPN SePay bị từ chối do thiếu hoặc sai X-Secret-Key / Authorization");
            throw new UnauthorizedException("Xác thực IPN SePay không hợp lệ");
        }

        if (rawIpnPayload == null || rawIpnPayload.isBlank()) {
            throw new BadRequestException("Payload IPN SePay không được để trống");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(rawIpnPayload);
        } catch (Exception ex) {
            throw new BadRequestException("Payload IPN SePay không đúng định dạng JSON");
        }

        if (root == null || !root.isObject()) {
            throw new BadRequestException("Payload IPN SePay không hợp lệ");
        }

        String notificationType = root.path("notification_type").asText("");
        JsonNode orderNode = root.path("order");
        JsonNode transactionNode = root.path("transaction");

        String invoiceNumber = orderNode.path("order_invoice_number").asText(null);
        if (invoiceNumber == null || invoiceNumber.isBlank()) {
            throw new BadRequestException("Thiếu order_invoice_number trong dữ liệu IPN SePay");
        }

        Optional<Order> orderOptional = orderRepository.findBySepayInvoiceNumberForUpdate(invoiceNumber.trim());
        if (orderOptional.isEmpty()) {
            log.warn("Không tìm thấy đơn hàng tương ứng với SePay IPN (invoice={})", invoiceNumber);
            return ipnAck("Order not found, IPN ignored", false);
        }

        Order order = orderOptional.get();
        long expectedAmount = extractPositiveVndAmount(order.getTotalAmount());
        long ipnOrderAmount = parseAmountFromText(orderNode.path("order_amount").asText(null));
        if (ipnOrderAmount > 0 && ipnOrderAmount != expectedAmount) {
            log.error("Lệch số tiền IPN SePay cho đơn #{}: expected={}, actual={}",
                    order.getId(), expectedAmount, ipnOrderAmount);
            throw new BadRequestException("Số tiền thanh toán SePay không khớp giá trị đơn hàng");
        }

        // Idempotent: đơn đã được xác nhận hoặc đã chuyển trạng thái trước đó thì bỏ qua cập nhật
        if (order.getStatus() != OrderStatus.PENDING || order.getPaymentStatus() != PaymentStatus.UNPAID) {
            log.info("IPN SePay trùng cho đơn #{} (status={}, paymentStatus={}), bỏ qua",
                    order.getId(), order.getStatus(), order.getPaymentStatus());
            Map<String, Object> response = ipnAck("Order already processed", true);
            response.put("orderId", order.getId());
            response.put("invoiceNumber", invoiceNumber);
            return response;
        }

        String sepayOrderId = firstNonBlank(
                orderNode.path("order_id").asText(null),
                orderNode.path("id").asText(null));
        String sepayOrderStatus = orderNode.path("order_status").asText("");
        String transactionStatus = transactionNode.path("transaction_status").asText("");
        String transactionRef = firstNonBlank(
                transactionNode.path("transaction_id").asText(null),
                transactionNode.path("id").asText(null));

        boolean isPaidNotification = "ORDER_PAID".equalsIgnoreCase(notificationType)
                && ("CAPTURED".equalsIgnoreCase(sepayOrderStatus) || "APPROVED".equalsIgnoreCase(transactionStatus));

        if (isPaidNotification) {
            if (ipnOrderAmount <= 0) {
                throw new BadRequestException("Thiếu order_amount hợp lệ trong dữ liệu IPN ORDER_PAID");
            }
            order.setPaymentMethod(PaymentMethod.SEPAY);
            order.setPaymentStatus(PaymentStatus.PAID);
            order.setStatus(OrderStatus.PROCESSING);
            order.setSepayOrderId(sepayOrderId);
            order.setPaymentReference(transactionRef);
            order.setPaidAt(LocalDateTime.now(VN_ZONE));
            orderRepository.save(order);

            log.info("Thanh toán SePay thành công cho đơn #{} (invoice={}, sepayOrderId={}, ref={})",
                    order.getId(), invoiceNumber, sepayOrderId, transactionRef);

            Map<String, Object> response = ipnAck("IPN processed successfully", false);
            response.put("orderId", order.getId());
            response.put("invoiceNumber", invoiceNumber);
            return response;
        }

        boolean isVoidOrFailed = "TRANSACTION_VOID".equalsIgnoreCase(notificationType)
                || "CANCELLED".equalsIgnoreCase(sepayOrderStatus)
                || "FAILED".equalsIgnoreCase(sepayOrderStatus)
                || "DECLINED".equalsIgnoreCase(transactionStatus)
                || "FAILED".equalsIgnoreCase(transactionStatus)
                || "VOIDED".equalsIgnoreCase(transactionStatus);

        if (isVoidOrFailed) {
            order.setPaymentMethod(PaymentMethod.SEPAY);
            order.setPaymentStatus(PaymentStatus.FAILED);
            order.setSepayOrderId(sepayOrderId);
            order.setPaymentReference(transactionRef);
            orderRepository.save(order);
            log.warn("Giao dịch SePay thất bại/hủy cho đơn #{} (notificationType={}, orderStatus={}, txStatus={})",
                    order.getId(), notificationType, sepayOrderStatus, transactionStatus);

            Map<String, Object> response = ipnAck("Payment failure recorded", false);
            response.put("orderId", order.getId());
            response.put("invoiceNumber", invoiceNumber);
            return response;
        }

        Map<String, Object> response = ipnAck("IPN notification acknowledged", false);
        response.put("orderId", order.getId());
        response.put("invoiceNumber", invoiceNumber);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public SepayReturnResponse handlePaymentReturn(Map<String, String> params) {
        String invoiceNumber = params != null
                ? firstNonBlank(params.get("invoice"), params.get("order_invoice_number"))
                : null;
        String paymentHint = params != null ? params.get("payment") : null;
        Long fallbackOrderId = parsePositiveLong(params != null ? params.get("orderId") : null);

        boolean cancelled = "cancel".equalsIgnoreCase(paymentHint);
        boolean errored = "error".equalsIgnoreCase(paymentHint);

        Optional<Order> orderOpt = Optional.empty();
        if (invoiceNumber != null) {
            orderOpt = orderRepository.findBySepayInvoiceNumber(invoiceNumber.trim());
        } else if (fallbackOrderId != null) {
            orderOpt = orderRepository.findById(fallbackOrderId);
        }

        if (orderOpt.isEmpty()) {
            return SepayReturnResponse.builder()
                    .success(false)
                    .cancelled(cancelled)
                    .status(paymentHint != null ? paymentHint.toUpperCase(Locale.ROOT) : "NOT_FOUND")
                    .invoiceNumber(invoiceNumber)
                    .orderId(fallbackOrderId)
                    .message("Không tìm thấy đơn hàng tương ứng với mã hóa đơn SePay")
                    .build();
        }

        Order order = orderOpt.get();
        String resolvedInvoice = invoiceNumber != null ? invoiceNumber : order.getSepayInvoiceNumber();
        String effectiveGatewayStatus = order.getPaymentStatus() == PaymentStatus.PAID ? "CAPTURED" : null;

        if (effectiveGatewayStatus == null && !cancelled && resolvedInvoice != null && sepayConfig.isConfigured()) {
            effectiveGatewayStatus = fetchSepayOrderStatusQuietly(resolvedInvoice);
            if ("CANCELLED".equalsIgnoreCase(effectiveGatewayStatus)) {
                cancelled = true;
            }
        }

        if (effectiveGatewayStatus == null) {
            if (cancelled) {
                effectiveGatewayStatus = "CANCELLED";
            } else if (errored) {
                effectiveGatewayStatus = "FAILED";
            } else {
                effectiveGatewayStatus = order.getPaymentStatus() == PaymentStatus.FAILED ? "FAILED" : "PENDING";
            }
        }

        boolean isPaidInDb = order.getPaymentStatus() == PaymentStatus.PAID;
        boolean isCapturedOnGateway = "CAPTURED".equalsIgnoreCase(effectiveGatewayStatus)
                || "PAID".equalsIgnoreCase(effectiveGatewayStatus);
        boolean success = isPaidInDb || (!cancelled && !errored && isCapturedOnGateway);

        String message;
        if (isPaidInDb) {
            message = "Thanh toán đơn hàng qua SePay thành công";
        } else if (cancelled) {
            message = "Khách hàng đã hủy giao dịch thanh toán SePay";
        } else if (errored || "FAILED".equalsIgnoreCase(effectiveGatewayStatus)) {
            message = "Giao dịch thanh toán SePay không thành công";
        } else if (isCapturedOnGateway || "success".equalsIgnoreCase(paymentHint)) {
            message = "Thanh toán thành công trên SePay, hệ thống đang hoàn tất xác nhận đơn hàng";
        } else {
            message = "Giao dịch thanh toán đang chờ xác nhận từ SePay";
        }

        return SepayReturnResponse.builder()
                .success(success)
                .cancelled(cancelled)
                .status(effectiveGatewayStatus)
                .message(message)
                .orderId(order.getId())
                .invoiceNumber(resolvedInvoice)
                .sepayOrderId(order.getSepayOrderId())
                .amount(extractPositiveVndAmount(order.getTotalAmount()))
                .orderStatus(order.getStatus())
                .paymentStatus(order.getPaymentStatus())
                .build();
    }

    private String fetchSepayOrderStatusQuietly(String invoiceNumber) {
        String encodedInvoice = URLEncoder.encode(invoiceNumber, StandardCharsets.UTF_8);
        String endpoint = normalizeBaseUrl(sepayConfig.getApiUrl()) + "/v1/order/detail/" + encodedInvoice;
        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(5))
                    .header("Authorization", sepayConfig.buildBasicAuthHeader())
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(response.body());
                return root.path("data").path("order_status").asText(null);
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        } catch (Exception ex) {
            log.debug("Không thể truy vấn trạng thái đơn SePay (invoice={}): {}", invoiceNumber, ex.getMessage());
        }
        return null;
    }

    private void validateSepayConfigured() {
        if (!sepayConfig.isConfigured()) {
            throw new BadRequestException(
                    "Chưa cấu hình thông tin cổng thanh toán SePay (SEPAY_MERCHANT_ID, SEPAY_SECRET_KEY)");
        }
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thanh toán");
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByUsernameIgnoreCase(username))
                .or(() -> userRepository.findByEmailIgnoreCase(username))
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy tài khoản người dùng hiện tại"));
    }

    private void validateOrderOwnership(Order order, User currentUser) {
        boolean isOwner = order.getUser() != null && order.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền thực hiện thanh toán cho đơn hàng này");
        }
    }

    private void validateOrderPayable(Order order) {
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("Đơn hàng này đã được thanh toán thành công");
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể thanh toán cho đơn hàng đang ở trạng thái PENDING");
        }
    }

    private long extractPositiveVndAmount(BigDecimal totalAmount) {
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Số tiền đơn hàng không hợp lệ để thanh toán");
        }
        return totalAmount.setScale(0, RoundingMode.HALF_UP).longValue();
    }

    private long parseAmountFromText(String rawAmount) {
        if (rawAmount == null || rawAmount.isBlank()) {
            return -1L;
        }
        try {
            return new BigDecimal(rawAmount.trim()).setScale(0, RoundingMode.HALF_UP).longValue();
        } catch (NumberFormatException ex) {
            return -1L;
        }
    }

    private String generateInvoiceNumber(Long orderId) {
        int randomSuffix = ThreadLocalRandom.current().nextInt(100, 1000);
        return "DH" + orderId + "_" + System.currentTimeMillis() + randomSuffix;
    }

    private String normalizeOptionalPaymentMethod(String rawMethod) {
        if (rawMethod == null || rawMethod.isBlank()) {
            return null;
        }
        String normalized = rawMethod.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_PAYMENT_METHODS.contains(normalized)) {
            throw new BadRequestException(
                    "Phương thức thanh toán SePay không hợp lệ (hỗ trợ BANK_TRANSFER, NAPAS_BANK_TRANSFER, CARD)");
        }
        return normalized;
    }

    private String buildSafeDescription(String customDescription, Long orderId) {
        String raw = (customDescription != null && !customDescription.isBlank())
                ? customDescription.trim()
                : "Thanh toan don hang " + orderId;
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .replaceAll("[^a-zA-Z0-9 _#-]", "")
                .trim();
        return normalized.isEmpty() ? ("Thanh toan don hang " + orderId) : normalized;
    }

    private String appendResultParams(String baseUrl, String paymentStatus, Long orderId, String invoiceNumber) {
        String base = (baseUrl == null || baseUrl.isBlank()) ? "http://localhost:5173/payment/result" : baseUrl.trim();
        String separator = base.contains("?") ? "&" : "?";
        return base + separator
                + "payment=" + URLEncoder.encode(paymentStatus, StandardCharsets.UTF_8)
                + "&orderId=" + orderId
                + "&invoice=" + URLEncoder.encode(invoiceNumber, StandardCharsets.UTF_8);
    }

    private String normalizeBaseUrl(String apiUrl) {
        String base = (apiUrl == null || apiUrl.isBlank()) ? "https://pgapi-sandbox.sepay.vn" : apiUrl.trim();
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }

    private String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary.trim();
        }
        if (fallback != null && !fallback.isBlank()) {
            return fallback.trim();
        }
        return null;
    }

    private Long parsePositiveLong(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            long value = Long.parseLong(raw.trim());
            return value > 0 ? value : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Map<String, Object> ipnAck(String message, boolean alreadyProcessed) {
        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("success", true);
        ack.put("message", message);
        if (alreadyProcessed) {
            ack.put("alreadyProcessed", true);
        }
        return ack;
    }
}

