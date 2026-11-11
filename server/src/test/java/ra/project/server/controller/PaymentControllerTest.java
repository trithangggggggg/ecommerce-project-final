package ra.project.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.model.dto.request.CreatePaymentRequest;
import ra.project.server.model.dto.response.SepayPaymentResponse;
import ra.project.server.model.dto.response.SepayReturnResponse;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentStatus;
import ra.project.server.service.SepayService;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Kiểm thử PaymentController Endpoints (SePay Payment Gateway)")
class PaymentControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private SepayService sepayService;

    @InjectMocks
    private PaymentController paymentController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(paymentController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("POST /api/payment/sepay/create-payment trả 200 OK kèm checkoutUrl và checkoutFields")
    void createPayment_Success() throws Exception {
        CreatePaymentRequest req = CreatePaymentRequest.builder()
                .orderId(10L)
                .paymentMethod("BANK_TRANSFER")
                .build();

        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("merchant", "SP-TEST");
        fields.put("order_invoice_number", "DH10_1762857600123");
        fields.put("signature", "base64-signature==");

        SepayPaymentResponse resp = SepayPaymentResponse.builder()
                .orderId(10L)
                .invoiceNumber("DH10_1762857600123")
                .amount(500000L)
                .currency("VND")
                .checkoutUrl("https://pay-sandbox.sepay.vn/v1/checkout/init")
                .checkoutFields(fields)
                .build();

        when(sepayService.createPaymentCheckout(any())).thenReturn(resp);

        mockMvc.perform(post("/api/payment/sepay/create-payment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderId").value(10))
                .andExpect(jsonPath("$.data.invoiceNumber").value("DH10_1762857600123"))
                .andExpect(jsonPath("$.data.checkoutUrl").value("https://pay-sandbox.sepay.vn/v1/checkout/init"))
                .andExpect(jsonPath("$.data.checkoutFields.signature").value("base64-signature=="));
    }

    @Test
    @DisplayName("POST /api/payment/sepay/create-payment thiếu orderId trả 400 Bad Request")
    void createPayment_MissingOrderId_Returns400() throws Exception {
        mockMvc.perform(post("/api/payment/sepay/create-payment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/payment/sepay/ipn hợp lệ trả 200 OK kèm JSON ACK cho SePay")
    void handleIpn_Valid_Returns200() throws Exception {
        Map<String, Object> ipnRes = new LinkedHashMap<>();
        ipnRes.put("success", true);
        ipnRes.put("message", "IPN processed successfully");
        ipnRes.put("orderId", 10L);

        when(sepayService.handleIpn(any(), any(), any())).thenReturn(ipnRes);

        mockMvc.perform(post("/api/payment/sepay/ipn")
                        .header("X-Secret-Key", "spsk_test_123")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notification_type\":\"ORDER_PAID\",\"order\":{\"order_invoice_number\":\"DH10_1\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("IPN processed successfully"))
                .andExpect(jsonPath("$.orderId").value(10));
    }

    @Test
    @DisplayName("POST /api/payment/sepay/ipn sai X-Secret-Key trả 401 Unauthorized")
    void handleIpn_InvalidSecretKey_Returns401() throws Exception {
        when(sepayService.handleIpn(any(), any(), any()))
                .thenThrow(new UnauthorizedException("Xác thực IPN SePay không hợp lệ"));

        mockMvc.perform(post("/api/payment/sepay/ipn")
                        .header("X-Secret-Key", "wrong-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notification_type\":\"ORDER_PAID\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /api/payment/sepay/payment-return trả kết quả tóm tắt cho Frontend")
    void handlePaymentReturn_ReturnsSummary() throws Exception {
        SepayReturnResponse returnResp = SepayReturnResponse.builder()
                .success(true)
                .cancelled(false)
                .status("CAPTURED")
                .message("Thanh toán đơn hàng qua SePay thành công")
                .orderId(10L)
                .invoiceNumber("DH10_1762857600123")
                .sepayOrderId("NQD-68DA43D73C1A5")
                .amount(500000L)
                .orderStatus(OrderStatus.PROCESSING)
                .paymentStatus(PaymentStatus.PAID)
                .build();

        when(sepayService.handlePaymentReturn(any())).thenReturn(returnResp);

        mockMvc.perform(get("/api/payment/sepay/payment-return")
                        .param("payment", "success")
                        .param("orderId", "10")
                        .param("invoice", "DH10_1762857600123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderId").value(10))
                .andExpect(jsonPath("$.data.status").value("CAPTURED"))
                .andExpect(jsonPath("$.data.orderStatus").value("PROCESSING"))
                .andExpect(jsonPath("$.data.paymentStatus").value("PAID"));
    }
}
