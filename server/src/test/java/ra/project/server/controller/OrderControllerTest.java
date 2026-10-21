package ra.project.server.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.model.dto.request.CheckoutRequest;
import ra.project.server.model.dto.response.OrderItemResponse;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.service.OrderService;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class OrderControllerTest {

    private MockMvc mockMvc;

    @Mock
    private OrderService orderService;

    @InjectMocks
    private OrderController orderController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(orderController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void whenCheckout_thenReturn201WithOrder() throws Exception {
        OrderResponse response = OrderResponse.builder()
                .id(1L)
                .receiverName("Tran Van B")
                .phoneNumber("0912345678")
                .shippingAddress("456 Nguyen Hue, Quan 1")
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.COD)
                .totalAmount(BigDecimal.valueOf(250000))
                .orderItems(List.of(
                        OrderItemResponse.builder()
                                .id(10L)
                                .productId(2L)
                                .productName("Ban phim co")
                                .quantity(1)
                                .price(BigDecimal.valueOf(250000))
                                .totalPrice(BigDecimal.valueOf(250000))
                                .build()
                ))
                .build();

        when(orderService.checkout(any(CheckoutRequest.class)))
                .thenReturn(ApiResponse.created("Đặt hàng thành công", response));

        String requestJson = """
                {
                    "receiverName": "Tran Van B",
                    "phoneNumber": "0912345678",
                    "shippingAddress": "456 Nguyen Hue, Quan 1",
                    "items": [
                        {
                            "productId": 2,
                            "quantity": 1
                        }
                    ]
                }
                """;

        mockMvc.perform(post("/api/orders/checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đặt hàng thành công"))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.paymentMethod").value("COD"))
                .andExpect(jsonPath("$.data.totalAmount").value(250000));
    }

    @Test
    void whenGetMyOrders_thenReturn200WithList() throws Exception {
        OrderResponse response = OrderResponse.builder()
                .id(1L)
                .receiverName("Tran Van B")
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.COD)
                .totalAmount(BigDecimal.valueOf(250000))
                .build();

        when(orderService.getMyOrders())
                .thenReturn(ApiResponse.success("Lấy lịch sử đơn hàng thành công", List.of(response)));

        mockMvc.perform(get("/api/orders/my-orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].status").value("PENDING"));
    }
}
