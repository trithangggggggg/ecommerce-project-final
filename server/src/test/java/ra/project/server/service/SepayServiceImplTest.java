package ra.project.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
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
import ra.project.server.service.impl.SepayServiceImpl;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Kiểm thử SepayServiceImpl (VietQR trực tiếp, Webhook biến động số dư & IPN idempotent)")
class SepayServiceImplTest {

    private static final String SECRET_KEY = "spsk_test_1234567890abcdef1234567890abcdef";
    private static final String WEBHOOK_API_KEY = "sepay_webhook_api_key_test_123456";

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private HttpClient httpClient;

    private SepayConfig sepayConfig;
    private ObjectMapper objectMapper;
    private SepayServiceImpl sepayService;

    private User customer;
    private Order pendingOrder;

    @BeforeEach
    void setUp() {
        sepayConfig = new SepayConfig();
        sepayConfig.setBankAccount("0123456789");
        sepayConfig.setBankCode("MBBank");
        sepayConfig.setAccountHolder("NGUYEN TRI THANG");
        sepayConfig.setWebhookApiKey(WEBHOOK_API_KEY);
        sepayConfig.setPaymentPrefix("DH");
        sepayConfig.setQrBaseUrl("https://qr.sepay.vn/img");
        sepayConfig.setQrTemplate("qronly");
        sepayConfig.setQrTimeoutMinutes(15);
        sepayConfig.setMerchantId("SP-TEST-MERCHANT");
        sepayConfig.setSecretKey(SECRET_KEY);
        sepayConfig.setCheckoutUrl("https://pay-sandbox.sepay.vn/v1/checkout/init");
        sepayConfig.setApiUrl("https://pgapi-sandbox.sepay.vn");
        sepayConfig.setSuccessUrl("http://localhost:5173/payment/result");
        sepayConfig.setErrorUrl("http://localhost:5173/payment/result");
        sepayConfig.setCancelUrl("http://localhost:5173/payment/result");

        objectMapper = new ObjectMapper();
        sepayService = new SepayServiceImpl(sepayConfig, orderRepository, userRepository, objectMapper, httpClient);

        customer = User.builder()
                .id(1L)
                .username("buyer1")
                .email("buyer1@nexor.vn")
                .role(Role.CUSTOMER)
                .build();

        pendingOrder = Order.builder()
                .id(10L)
                .user(customer)
                .receiverName("Nguyen Van A")
                .phoneNumber("0912345678")
                .shippingAddress("123 Le Loi")
                .totalAmount(new BigDecimal("500000.00"))
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.COD)
                .paymentStatus(PaymentStatus.UNPAID)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Ký checkout fields chuẩn SePay: giữ nguyên thứ tự insertion, bỏ qua null/rỗng/'0', HMAC-SHA256 Base64")
    void signCheckoutFields_FollowsSepaySpec() {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("merchant", "SP-TEST-MERCHANT");
        fields.put("operation", "PURCHASE");
        fields.put("payment_method", "");
        fields.put("order_amount", "100000");
        fields.put("currency", "VND");
        fields.put("order_invoice_number", "DH10_1");
        fields.put("custom_extra", "ignored_field");

        String actual = SepayConfig.signCheckoutFields(fields, SECRET_KEY);
        String expectedRaw = "merchant=SP-TEST-MERCHANT,operation=PURCHASE,order_amount=100000,currency=VND,order_invoice_number=DH10_1";
        String expected = SepayConfig.hmacSha256Base64(SECRET_KEY, expectedRaw);

        assertEquals(expected, actual);
    }

    @Test
    @DisplayName("Tạo thanh toán SePay VietQR trực tiếp thành công: trả URL QR, STK, nội dung CK DH10 và lưu DB")
    void createPaymentCheckout_ReturnsVietQrDirectDetails() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("buyer1", "pass", List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        when(userRepository.findByUsername("buyer1")).thenReturn(Optional.of(customer));
        when(orderRepository.findById(10L)).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        CreatePaymentRequest request = CreatePaymentRequest.builder()
                .orderId(10L)
                .build();

        SepayPaymentResponse response = sepayService.createPaymentCheckout(request);

        assertEquals(10L, response.getOrderId());
        assertEquals(500000L, response.getAmount());
        assertEquals("VND", response.getCurrency());
        assertEquals("VIETQR_DIRECT", response.getPaymentMode());
        assertEquals("DH10", response.getInvoiceNumber());
        assertEquals("DH10", response.getPaymentCode());
        assertEquals("DH10", response.getTransferContent());
        assertEquals("0123456789", response.getAccountNumber());
        assertEquals("MBBank", response.getBankCode());
        assertEquals("MB Bank (Ngân hàng TMCP Quân Đội)", response.getBankName());
        assertEquals("NGUYEN TRI THANG", response.getAccountHolder());
        assertNull(response.getCheckoutUrl());
        assertNotNull(response.getQrImageUrl());
        assertTrue(response.getQrImageUrl().startsWith("https://qr.sepay.vn/img?"));
        assertTrue(response.getQrImageUrl().contains("acc=0123456789"));
        assertTrue(response.getQrImageUrl().contains("bank=MBBank"));
        assertTrue(response.getQrImageUrl().contains("amount=500000"));
        assertTrue(response.getQrImageUrl().contains("des=DH10"));
        assertTrue(response.getQrImageUrl().contains("template=qronly"));
        assertNotNull(response.getQrDownloadUrl());
        assertTrue(response.getQrDownloadUrl().contains("download=true"));
        assertEquals(900L, response.getTimeoutSeconds());
        assertNotNull(response.getExpiresAt());

        assertEquals(PaymentMethod.SEPAY, pendingOrder.getPaymentMethod());
        assertEquals(PaymentStatus.UNPAID, pendingOrder.getPaymentStatus());
        assertEquals("DH10", pendingOrder.getSepayInvoiceNumber());
    }

    @Test
    @DisplayName("Chặn tạo QR khi chưa cấu hình SEPAY_BANK_ACCOUNT / SEPAY_BANK_CODE")
    void createPaymentCheckout_MissingBankConfig_ThrowsBadRequest() {
        sepayConfig.setBankAccount("");
        sepayConfig.setBankCode("");

        assertThrows(BadRequestException.class,
                () -> sepayService.createPaymentCheckout(CreatePaymentRequest.builder().orderId(10L).build()));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chặn tạo form SePay khi người dùng không phải chủ đơn (IDOR -> 403 Forbidden)")
    void createPaymentCheckout_NotOwner_ThrowsForbidden() {
        User otherUser = User.builder().id(99L).username("intruder").role(Role.CUSTOMER).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("intruder", "pass", List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        when(userRepository.findByUsername("intruder")).thenReturn(Optional.of(otherUser));
        when(orderRepository.findById(10L)).thenReturn(Optional.of(pendingOrder));

        assertThrows(ForbiddenException.class,
                () -> sepayService.createPaymentCheckout(CreatePaymentRequest.builder().orderId(10L).build()));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chặn tạo form SePay khi đơn hàng không tồn tại (404)")
    void createPaymentCheckout_OrderNotFound_Throws404() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("buyer1", "pass", List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        when(userRepository.findByUsername("buyer1")).thenReturn(Optional.of(customer));
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> sepayService.createPaymentCheckout(CreatePaymentRequest.builder().orderId(999L).build()));
    }

    @Test
    @DisplayName("Chặn tạo form SePay khi đơn đã thanh toán hoặc trạng thái không hợp lệ")
    void createPaymentCheckout_AlreadyPaid_ThrowsBadRequest() {
        pendingOrder.setPaymentStatus(PaymentStatus.PAID);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("buyer1", "pass", List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        when(userRepository.findByUsername("buyer1")).thenReturn(Optional.of(customer));
        when(orderRepository.findById(10L)).thenReturn(Optional.of(pendingOrder));

        assertThrows(BadRequestException.class,
                () -> sepayService.createPaymentCheckout(CreatePaymentRequest.builder().orderId(10L).build()));
    }

    @Test
    @DisplayName("IPN ORDER_PAID hợp lệ (X-Secret-Key đúng) -> cập nhật PAID & PROCESSING")
    void handleIpn_OrderPaid_Success() {
        String invoice = "DH10_1762857600123";
        pendingOrder.setSepayInvoiceNumber(invoice);
        when(orderRepository.findBySepayInvoiceNumberForUpdate(invoice)).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        String ipnPayload = """
                {
                  "timestamp": 1762857682,
                  "notification_type": "ORDER_PAID",
                  "order": {
                    "id": "e2c195be-c721-47eb-b323-99ab24e52d85",
                    "order_id": "NQD-68DA43D73C1A5",
                    "order_status": "CAPTURED",
                    "order_currency": "VND",
                    "order_amount": "500000.00",
                    "order_invoice_number": "DH10_1762857600123",
                    "order_description": "Thanh toan don hang 10"
                  },
                  "transaction": {
                    "id": "384c66dd-41e6-4316-a544-b4141682595c",
                    "payment_method": "BANK_TRANSFER",
                    "transaction_id": "68da43da2d9de",
                    "transaction_type": "PAYMENT",
                    "transaction_status": "APPROVED",
                    "transaction_amount": "500000"
                  }
                }
                """;

        Map<String, Object> result = sepayService.handleIpn(SECRET_KEY, null, ipnPayload);

        assertEquals(true, result.get("success"));
        assertEquals(OrderStatus.PROCESSING, pendingOrder.getStatus());
        assertEquals(PaymentStatus.PAID, pendingOrder.getPaymentStatus());
        assertEquals(PaymentMethod.SEPAY, pendingOrder.getPaymentMethod());
        assertEquals("NQD-68DA43D73C1A5", pendingOrder.getSepayOrderId());
        assertEquals("68da43da2d9de", pendingOrder.getPaymentReference());
        assertNotNull(pendingOrder.getPaidAt());
        verify(orderRepository).save(pendingOrder);
    }

    @Test
    @DisplayName("IPN xử lý idempotent: gọi lần 2 khi đơn đã PROCESSING/PAID thì bỏ qua")
    void handleIpn_Idempotent_SkipsSecondUpdate() {
        String invoice = "DH10_1762857600123";
        pendingOrder.setSepayInvoiceNumber(invoice);
        pendingOrder.setStatus(OrderStatus.PROCESSING);
        pendingOrder.setPaymentStatus(PaymentStatus.PAID);
        when(orderRepository.findBySepayInvoiceNumberForUpdate(invoice)).thenReturn(Optional.of(pendingOrder));

        String ipnPayload = """
                {
                  "notification_type": "ORDER_PAID",
                  "order": {
                    "order_status": "CAPTURED",
                    "order_amount": "500000.00",
                    "order_invoice_number": "DH10_1762857600123"
                  },
                  "transaction": {
                    "transaction_status": "APPROVED",
                    "transaction_id": "68da43da2d9de"
                  }
                }
                """;

        Map<String, Object> result = sepayService.handleIpn(SECRET_KEY, null, ipnPayload);

        assertEquals(true, result.get("success"));
        assertEquals(true, result.get("alreadyProcessed"));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("IPN từ chối khi sai hoặc thiếu X-Secret-Key (401 Unauthorized)")
    void handleIpn_InvalidSecretKey_ThrowsUnauthorized() {
        String payload = "{\"notification_type\":\"ORDER_PAID\",\"order\":{\"order_invoice_number\":\"DH10_1\"}}";

        assertThrows(UnauthorizedException.class,
                () -> sepayService.handleIpn("wrong-secret", null, payload));
        assertThrows(UnauthorizedException.class,
                () -> sepayService.handleIpn(null, null, payload));
        verify(orderRepository, never()).findBySepayInvoiceNumberForUpdate(any());
    }

    @Test
    @DisplayName("IPN phát hiện lệch số tiền so với đơn hàng trong DB")
    void handleIpn_AmountMismatch_ThrowsBadRequest() {
        String invoice = "DH10_1762857600123";
        pendingOrder.setSepayInvoiceNumber(invoice);
        when(orderRepository.findBySepayInvoiceNumberForUpdate(invoice)).thenReturn(Optional.of(pendingOrder));

        String ipnPayload = """
                {
                  "notification_type": "ORDER_PAID",
                  "order": {
                    "order_status": "CAPTURED",
                    "order_amount": "10000.00",
                    "order_invoice_number": "DH10_1762857600123"
                  }
                }
                """;

        assertThrows(BadRequestException.class,
                () -> sepayService.handleIpn(SECRET_KEY, null, ipnPayload));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("IPN TRANSACTION_VOID đánh dấu FAILED nhưng giữ đơn PENDING để thanh toán lại")
    void handleIpn_TransactionVoid_MarksFailed() {
        String invoice = "DH10_1762857600123";
        pendingOrder.setSepayInvoiceNumber(invoice);
        when(orderRepository.findBySepayInvoiceNumberForUpdate(invoice)).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        String ipnPayload = """
                {
                  "notification_type": "TRANSACTION_VOID",
                  "order": {
                    "order_id": "NQD-VOID",
                    "order_status": "CANCELLED",
                    "order_amount": "500000.00",
                    "order_invoice_number": "DH10_1762857600123"
                  },
                  "transaction": {
                    "transaction_status": "VOIDED",
                    "transaction_id": "tx-void-1"
                  }
                }
                """;

        Map<String, Object> result = sepayService.handleIpn(SECRET_KEY, null, ipnPayload);

        assertEquals(true, result.get("success"));
        assertEquals(OrderStatus.PENDING, pendingOrder.getStatus());
        assertEquals(PaymentStatus.FAILED, pendingOrder.getPaymentStatus());
        verify(orderRepository).save(pendingOrder);
    }

    @Test
    @DisplayName("handlePaymentReturn chỉ đọc trạng thái hiển thị cho FE (không ghi DB)")
    void handlePaymentReturn_ReadOnly_ReturnsSummary() {
        String invoice = "DH10_1762857600123";
        pendingOrder.setSepayInvoiceNumber(invoice);
        pendingOrder.setSepayOrderId("NQD-68DA43D73C1A5");
        pendingOrder.setStatus(OrderStatus.PROCESSING);
        pendingOrder.setPaymentStatus(PaymentStatus.PAID);
        when(orderRepository.findBySepayInvoiceNumber(invoice)).thenReturn(Optional.of(pendingOrder));

        Map<String, String> params = new LinkedHashMap<>();
        params.put("payment", "success");
        params.put("orderId", "10");
        params.put("invoice", invoice);

        SepayReturnResponse result = sepayService.handlePaymentReturn(params);

        assertTrue(result.isSuccess());
        assertFalse(result.isCancelled());
        assertEquals(10L, result.getOrderId());
        assertEquals(invoice, result.getInvoiceNumber());
        assertEquals("NQD-68DA43D73C1A5", result.getSepayOrderId());
        assertEquals(OrderStatus.PROCESSING, result.getOrderStatus());
        assertEquals(PaymentStatus.PAID, result.getPaymentStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Webhook biến động số dư (Apikey đúng + code DH10) -> cập nhật PAID & PROCESSING")
    void handleWebhook_BankTransferWithCode_MarksOrderPaid() {
        pendingOrder.setSepayInvoiceNumber("DH10");
        when(orderRepository.findBySepayInvoiceNumberForUpdate("DH10")).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        String webhookPayload = """
                {
                  "id": 92704,
                  "gateway": "MBBank",
                  "transactionDate": "2026-11-12 01:15:00",
                  "accountNumber": "0123456789",
                  "subAccount": null,
                  "code": "DH10",
                  "content": "MBVCB.998877.DH10.CT",
                  "transferType": "in",
                  "description": "NGUYEN VAN A chuyen tien DH10",
                  "transferAmount": 500000,
                  "accumulated": 1500000,
                  "referenceCode": "FT261112999"
                }
                """;

        Map<String, Object> result = sepayService.handleWebhook(null, "Apikey " + WEBHOOK_API_KEY, webhookPayload);

        assertEquals(true, result.get("success"));
        assertEquals(10L, result.get("orderId"));
        assertEquals(OrderStatus.PROCESSING, pendingOrder.getStatus());
        assertEquals(PaymentStatus.PAID, pendingOrder.getPaymentStatus());
        assertEquals(PaymentMethod.SEPAY, pendingOrder.getPaymentMethod());
        assertEquals("FT261112999", pendingOrder.getSepayOrderId());
        assertEquals("92704", pendingOrder.getPaymentReference());
        assertNotNull(pendingOrder.getPaidAt());
        verify(orderRepository).save(pendingOrder);
    }

    @Test
    @DisplayName("Webhook biến động số dư (code=null, bóc tách regex từ content) -> vẫn khớp đơn #10")
    void handleWebhook_NullCodeExtractsFromContent_MarksOrderPaid() {
        when(orderRepository.findBySepayInvoiceNumberForUpdate("DH10")).thenReturn(Optional.empty());
        when(orderRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        String webhookPayload = """
                {
                  "id": 92705,
                  "gateway": "Vietcombank",
                  "code": null,
                  "content": "VCB.112233.Thanh toan DH10 tai Nexor",
                  "transferType": "in",
                  "transferAmount": 500000,
                  "referenceCode": "FT261112000"
                }
                """;

        Map<String, Object> result = sepayService.handleWebhook(null, "Apikey " + WEBHOOK_API_KEY, webhookPayload);

        assertEquals(true, result.get("success"));
        assertEquals(OrderStatus.PROCESSING, pendingOrder.getStatus());
        assertEquals(PaymentStatus.PAID, pendingOrder.getPaymentStatus());
        verify(orderRepository).save(pendingOrder);
    }

    @Test
    @DisplayName("Webhook biến động số dư sai Apikey -> ném 401 Unauthorized")
    void handleWebhook_InvalidApiKey_ThrowsUnauthorized() {
        String webhookPayload = "{\"id\":1,\"transferType\":\"in\",\"transferAmount\":500000,\"code\":\"DH10\"}";
        assertThrows(UnauthorizedException.class,
                () -> sepayService.handleWebhook(null, "Apikey wrong_key", webhookPayload));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Webhook tiền chuyển thiếu so với tổng đơn -> bỏ qua an toàn, không đánh dấu PAID")
    void handleWebhook_Underpaid_IgnoredWithoutMarkingPaid() {
        when(orderRepository.findBySepayInvoiceNumberForUpdate("DH10")).thenReturn(Optional.empty());
        when(orderRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(pendingOrder));

        String webhookPayload = """
                {
                  "id": 92706,
                  "gateway": "MBBank",
                  "code": "DH10",
                  "transferType": "in",
                  "transferAmount": 100000
                }
                """;

        Map<String, Object> result = sepayService.handleWebhook(null, "Apikey " + WEBHOOK_API_KEY, webhookPayload);

        assertEquals(true, result.get("success"));
        assertEquals(true, result.get("ignored"));
        assertEquals(true, result.get("underpaid"));
        assertEquals(PaymentStatus.UNPAID, pendingOrder.getPaymentStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Webhook với code chữ thường 'dh10' vẫn chuẩn hóa chữ hoa để khớp đơn hàng")
    void handleWebhook_LowercaseCode_NormalizesAndMatches() {
        pendingOrder.setSepayInvoiceNumber("DH10");
        when(orderRepository.findBySepayInvoiceNumberForUpdate("DH10")).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        String webhookPayload = """
                {
                  "id": 92707,
                  "gateway": "MBBank",
                  "code": " dh10 ",
                  "content": "dh10",
                  "transferType": "in",
                  "transferAmount": 500000
                }
                """;

        Map<String, Object> result = sepayService.handleWebhook(null, "Apikey " + WEBHOOK_API_KEY, webhookPayload);

        assertEquals(true, result.get("success"));
        assertEquals(10L, result.get("orderId"));
        assertEquals(PaymentStatus.PAID, pendingOrder.getPaymentStatus());
        verify(orderRepository).findBySepayInvoiceNumberForUpdate("DH10");
    }

    @Test
    @DisplayName("getPaymentStatus kiểm tra quyền sở hữu (IDOR -> 403) và trả trạng thái đúng")
    void getPaymentStatus_ChecksOwnershipAndReturnsStatus() {
        pendingOrder.setStatus(OrderStatus.PROCESSING);
        pendingOrder.setPaymentStatus(PaymentStatus.PAID);
        pendingOrder.setSepayInvoiceNumber("DH10");
        pendingOrder.setPaymentReference("92704");

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("buyer1", "pass", List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        when(userRepository.findByUsername("buyer1")).thenReturn(Optional.of(customer));
        when(orderRepository.findById(10L)).thenReturn(Optional.of(pendingOrder));

        SepayReturnResponse status = sepayService.getPaymentStatus(10L);
        assertTrue(status.isSuccess());
        assertEquals("PAID", status.getStatus());
        assertEquals(PaymentStatus.PAID, status.getPaymentStatus());

        User stranger = User.builder().id(99L).username("intruder").role(Role.CUSTOMER).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("intruder", "pass", List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        when(userRepository.findByUsername("intruder")).thenReturn(Optional.of(stranger));

        assertThrows(ForbiddenException.class, () -> sepayService.getPaymentStatus(10L));
    }
}

