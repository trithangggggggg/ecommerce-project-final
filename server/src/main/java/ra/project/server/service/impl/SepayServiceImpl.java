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
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class SepayServiceImpl implements SepayService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private record CachedPrefixPattern(String prefix, Pattern paymentPattern) {}

    private record ExtractedPaymentRef(String token, Long orderId) {}

    private final SepayConfig sepayConfig;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final AtomicReference<CachedPrefixPattern> cachedPrefixPattern = new AtomicReference<>();

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
        if (!sepayConfig.isQrConfigured()) {
            throw new BadRequestException(
                    "Chưa cấu hình tài khoản ngân hàng nhận VietQR (SEPAY_BANK_ACCOUNT, SEPAY_BANK_CODE)");
        }

        User currentUser = getCurrentAuthenticatedUser();
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + request.getOrderId()));

        validateOrderOwnership(order, currentUser);
        validateOrderPayable(order);

        long amount = extractPositiveVndAmount(order.getTotalAmount());
        String paymentCode = generatePaymentCode(order.getId());
        String bankAccount = sepayConfig.getBankAccount().trim();
        String bankCode = sepayConfig.getBankCode().trim();
        String bankName = sepayConfig.resolveDisplayBankName();
        String accountHolder = sepayConfig.getAccountHolder() != null ? sepayConfig.getAccountHolder().trim() : "";
        String qrTemplate = (sepayConfig.getQrTemplate() != null && !sepayConfig.getQrTemplate().isBlank())
                ? sepayConfig.getQrTemplate().trim()
                : "qronly";

        String qrImageUrl = buildQrImageUrl(bankAccount, bankCode, amount, paymentCode, qrTemplate, false);
        String qrDownloadUrl = buildQrImageUrl(bankAccount, bankCode, amount, paymentCode, "compact", true);

        int timeoutMinutes = sepayConfig.getQrTimeoutMinutes() > 0 ? sepayConfig.getQrTimeoutMinutes() : 15;
        LocalDateTime expiresAt = LocalDateTime.now(VN_ZONE).plusMinutes(timeoutMinutes);

        order.setSepayInvoiceNumber(paymentCode);
        order.setPaymentMethod(PaymentMethod.SEPAY);
        if (order.getPaymentStatus() != PaymentStatus.PAID) {
            order.setPaymentStatus(PaymentStatus.UNPAID);
        }
        orderRepository.save(order);

        log.info("Khởi tạo mã VietQR SePay trực tiếp cho đơn #{} (code={}, bank={}, amount={} VND)",
                order.getId(), paymentCode, bankCode, amount);

        return SepayPaymentResponse.builder()
                .orderId(order.getId())
                .invoiceNumber(paymentCode)
                .amount(amount)
                .currency("VND")
                .paymentMode("VIETQR_DIRECT")
                .paymentCode(paymentCode)
                .transferContent(paymentCode)
                .bankCode(bankCode)
                .bankName(bankName)
                .accountNumber(bankAccount)
                .accountHolder(accountHolder)
                .qrImageUrl(qrImageUrl)
                .qrDownloadUrl(qrDownloadUrl)
                .timeoutSeconds(timeoutMinutes * 60L)
                .expiresAt(expiresAt)
                .checkoutUrl(null)
                .checkoutFields(Collections.emptyMap())
                .build();
    }

    @Override
    @Transactional
    public Map<String, Object> handleWebhook(String xSecretKey, String authorizationHeader, String rawWebhookPayload) {
        JsonNode root = parseAuthorizedJsonObject(xSecretKey, authorizationHeader, rawWebhookPayload, "Webhook");
        return processBankWebhookNode(root);
    }

    @Override
    @Transactional
    public Map<String, Object> handleIpn(String xSecretKey, String authorizationHeader, String rawIpnPayload) {
        JsonNode root = parseAuthorizedJsonObject(xSecretKey, authorizationHeader, rawIpnPayload, "IPN");

        // Hỗ trợ cả payload Webhook biến động số dư (transferType/transferAmount) nếu cấu hình nhầm vào /ipn
        if (!root.hasNonNull("notification_type") && (root.has("transferType") || root.has("transferAmount"))) {
            return processBankWebhookNode(root);
        }

        validateGatewayConfigured();

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
        long ipnOrderAmount = parseAmountFromNode(orderNode.get("order_amount"));
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
            markOrderPaid(order, sepayOrderId, transactionRef);

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
    public SepayReturnResponse getPaymentStatus(Long orderId) {
        User currentUser = getCurrentAuthenticatedUser();
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));
        validateOrderOwnership(order, currentUser);

        boolean isPaid = order.getPaymentStatus() == PaymentStatus.PAID;
        boolean isCancelled = order.getStatus() == OrderStatus.CANCELLED;
        boolean isFailed = order.getPaymentStatus() == PaymentStatus.FAILED;

        String statusText;
        String message;
        if (isPaid) {
            statusText = "PAID";
            message = "Thanh toán chuyển khoản VietQR thành công";
        } else if (isCancelled) {
            statusText = "CANCELLED";
            message = "Đơn hàng đã được hủy";
        } else if (isFailed) {
            statusText = "FAILED";
            message = "Giao dịch thanh toán chưa hoàn tất";
        } else {
            statusText = "PENDING";
            message = "Đang chờ nhận chuyển khoản ngân hàng qua mã QR";
        }

        String invoice = order.getSepayInvoiceNumber() != null
                ? order.getSepayInvoiceNumber()
                : generatePaymentCode(order.getId());

        return SepayReturnResponse.builder()
                .success(isPaid)
                .cancelled(isCancelled)
                .status(statusText)
                .message(message)
                .orderId(order.getId())
                .invoiceNumber(invoice)
                .sepayOrderId(order.getSepayOrderId())
                .paymentReference(order.getPaymentReference())
                .amount(extractPositiveVndAmount(order.getTotalAmount()))
                .orderStatus(order.getStatus())
                .paymentStatus(order.getPaymentStatus())
                .paidAt(order.getPaidAt())
                .build();
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
                .paymentReference(order.getPaymentReference())
                .amount(extractPositiveVndAmount(order.getTotalAmount()))
                .orderStatus(order.getStatus())
                .paymentStatus(order.getPaymentStatus())
                .paidAt(order.getPaidAt())
                .build();
    }

    private Map<String, Object> processBankWebhookNode(JsonNode root) {
        String transferType = textOrNull(root.get("transferType"));
        if (!"in".equalsIgnoreCase(transferType)) {
            log.debug("Bỏ qua webhook SePay vì transferType='{}' không phải tiền vào", transferType);
            return ignoredAck("Ignored non-incoming transaction", false);
        }

        long transferAmount = parseAmountFromNode(root.get("transferAmount"));
        if (transferAmount <= 0) {
            return ignoredAck("Ignored zero or invalid transferAmount", false);
        }

        String sepayTxId = textOrNull(root.get("id"));
        String referenceCode = textOrNull(root.get("referenceCode"));
        String gateway = textOrNull(root.get("gateway"));
        String code = textOrNull(root.get("code"));
        String content = textOrNull(root.get("content"));
        String description = textOrNull(root.get("description"));

        Optional<Order> orderOpt = resolveOrderFromWebhook(code, content, description);
        if (orderOpt.isEmpty()) {
            log.info("Webhook SePay không khớp đơn hàng nào (txId={}, gateway={}, code={}, content={})",
                    sepayTxId, gateway, code, content);
            return ignoredAck("No matching order found for bank transaction", false);
        }

        Order order = orderOpt.get();
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            log.info("Webhook SePay trùng cho đơn #{} đã PAID trước đó (txId={}), bỏ qua", order.getId(), sepayTxId);
            Map<String, Object> ack = ipnAck("Order already paid", true);
            ack.put("orderId", order.getId());
            ack.put("invoiceNumber", order.getSepayInvoiceNumber());
            return ack;
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            log.warn("Nhận được Webhook SePay cho đơn #{} nhưng đơn đang ở trạng thái {}, bỏ qua (txId={}, amount={})",
                    order.getId(), order.getStatus(), sepayTxId, transferAmount);
            Map<String, Object> ack = ignoredAck("Order is not pending payment", false);
            ack.put("orderId", order.getId());
            ack.put("orderStatus", order.getStatus().name());
            return ack;
        }

        long expectedAmount = extractPositiveVndAmount(order.getTotalAmount());
        if (transferAmount < expectedAmount) {
            log.warn("Số tiền chuyển khoản SePay chưa đủ cho đơn #{}: expected={}, received={}, txId={}",
                    order.getId(), expectedAmount, transferAmount, sepayTxId);
            Map<String, Object> ack = ignoredAck("Transfer amount is less than order total", true);
            ack.put("orderId", order.getId());
            ack.put("expectedAmount", expectedAmount);
            ack.put("receivedAmount", transferAmount);
            return ack;
        }

        String resolvedCode = generatePaymentCode(order.getId());
        if (order.getSepayInvoiceNumber() == null || order.getSepayInvoiceNumber().isBlank()) {
            order.setSepayInvoiceNumber(resolvedCode);
        }

        String sepayRef = firstNonBlank(referenceCode, sepayTxId);
        String txRef = firstNonBlank(sepayTxId, referenceCode);
        markOrderPaid(order, sepayRef, txRef);

        log.info("Xác nhận thanh toán SePay VietQR thành công cho đơn #{} (gateway={}, txId={}, ref={}, amount={} VND)",
                order.getId(), gateway, sepayTxId, referenceCode, transferAmount);

        Map<String, Object> response = ipnAck("Webhook processed successfully", false);
        response.put("orderId", order.getId());
        response.put("invoiceNumber", order.getSepayInvoiceNumber());
        return response;
    }

    private void markOrderPaid(Order order, String sepayOrderId, String transactionRef) {
        order.setPaymentMethod(PaymentMethod.SEPAY);
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setStatus(OrderStatus.PROCESSING);
        order.setSepayOrderId(sepayOrderId);
        order.setPaymentReference(transactionRef);
        order.setPaidAt(LocalDateTime.now(VN_ZONE));
        orderRepository.save(order);
    }

    private JsonNode parseAuthorizedJsonObject(
            String xSecretKey,
            String authorizationHeader,
            String rawPayload,
            String sourceLabel) {
        if (!sepayConfig.isValidIpnAuth(xSecretKey, authorizationHeader)) {
            log.warn("{} SePay bị từ chối do thiếu hoặc sai API Key / X-Secret-Key", sourceLabel);
            throw new UnauthorizedException("Xác thực " + sourceLabel + " SePay không hợp lệ");
        }
        if (rawPayload == null || rawPayload.isBlank()) {
            throw new BadRequestException("Payload " + sourceLabel + " SePay không được để trống");
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(rawPayload);
        } catch (Exception ex) {
            throw new BadRequestException("Payload " + sourceLabel + " SePay không đúng định dạng JSON");
        }
        if (root == null || !root.isObject()) {
            throw new BadRequestException("Payload " + sourceLabel + " SePay không hợp lệ");
        }
        return root;
    }

    private Optional<Order> resolveOrderFromWebhook(String code, String content, String description) {
        if (code != null) {
            String normalizedCode = code.trim().toUpperCase(Locale.ROOT);
            Optional<Order> exactByInvoice = orderRepository.findBySepayInvoiceNumberForUpdate(normalizedCode);
            if (exactByInvoice.isPresent()) {
                return exactByInvoice;
            }
            ExtractedPaymentRef codeRef = extractPaymentReference(code);
            if (codeRef != null && codeRef.orderId() != null) {
                Optional<Order> byId = orderRepository.findByIdForUpdate(codeRef.orderId());
                if (byId.isPresent()) {
                    return byId;
                }
            }
        }

        for (String text : new String[]{content, description}) {
            ExtractedPaymentRef ref = extractPaymentReference(text);
            if (ref == null) {
                continue;
            }
            if (ref.token() != null) {
                Optional<Order> byToken = orderRepository.findBySepayInvoiceNumberForUpdate(ref.token());
                if (byToken.isPresent()) {
                    return byToken;
                }
            }
            if (ref.orderId() != null) {
                Optional<Order> byId = orderRepository.findByIdForUpdate(ref.orderId());
                if (byId.isPresent()) {
                    return byId;
                }
            }
        }

        return Optional.empty();
    }

    private ExtractedPaymentRef extractPaymentReference(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher matcher = getPaymentPattern().matcher(text);
        if (matcher.find()) {
            String token = matcher.group(1).toUpperCase(Locale.ROOT);
            Long orderId = parsePositiveLong(matcher.group(2));
            return new ExtractedPaymentRef(token, orderId);
        }
        return null;
    }

    private Pattern getPaymentPattern() {
        String prefix = sepayConfig.getEffectivePaymentPrefix();
        CachedPrefixPattern cached = this.cachedPrefixPattern.get();
        if (cached != null && cached.prefix().equals(prefix)) {
            return cached.paymentPattern();
        }
        Pattern compiled = Pattern.compile(
                "(?i)(?:^|[^A-Z0-9])(" + Pattern.quote(prefix) + "(\\d{1,12})(?:_\\d+)?)(?![A-Z0-9])");
        this.cachedPrefixPattern.set(new CachedPrefixPattern(prefix, compiled));
        return compiled;
    }

    private String buildQrImageUrl(
            String bankAccount,
            String bankCode,
            long amount,
            String transferContent,
            String template,
            boolean forDownload) {
        String base = (sepayConfig.getQrBaseUrl() == null || sepayConfig.getQrBaseUrl().isBlank())
                ? "https://qr.sepay.vn/img"
                : sepayConfig.getQrBaseUrl().trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        StringBuilder url = new StringBuilder(base)
                .append("?acc=").append(URLEncoder.encode(bankAccount, StandardCharsets.UTF_8))
                .append("&bank=").append(URLEncoder.encode(bankCode, StandardCharsets.UTF_8))
                .append("&amount=").append(amount)
                .append("&des=").append(URLEncoder.encode(transferContent, StandardCharsets.UTF_8))
                .append("&template=").append(URLEncoder.encode(template, StandardCharsets.UTF_8));
        if (forDownload) {
            url.append("&download=true");
        }
        return url.toString();
    }

    private String generatePaymentCode(Long orderId) {
        return sepayConfig.getEffectivePaymentPrefix() + orderId;
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

    private void validateGatewayConfigured() {
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

    private long parseAmountFromNode(JsonNode amountNode) {
        if (amountNode == null || amountNode.isNull() || amountNode.isMissingNode()) {
            return -1L;
        }
        if (amountNode.isNumber()) {
            return amountNode.decimalValue().setScale(0, RoundingMode.HALF_UP).longValue();
        }
        String raw = amountNode.asText(null);
        if (raw == null || raw.isBlank()) {
            return -1L;
        }
        try {
            return new BigDecimal(raw.trim()).setScale(0, RoundingMode.HALF_UP).longValue();
        } catch (NumberFormatException | ArithmeticException ex) {
            return -1L;
        }
    }

    private String normalizeBaseUrl(String apiUrl) {
        String base = (apiUrl == null || apiUrl.isBlank()) ? "https://pgapi-sandbox.sepay.vn" : apiUrl.trim();
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }

    private String textOrNull(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        String text = node.asText();
        return (text == null || text.isBlank()) ? null : text.trim();
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

    private Map<String, Object> ignoredAck(String message, boolean underpaid) {
        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("success", true);
        ack.put("ignored", true);
        ack.put("message", message);
        if (underpaid) {
            ack.put("underpaid", true);
        }
        return ack;
    }
}

