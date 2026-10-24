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
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.service.OrderService;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminOrderControllerTest {

    private MockMvc mockMvc;

    @Mock
    private OrderService orderService;

    @InjectMocks
    private AdminOrderController adminOrderController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(adminOrderController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void whenGetAllOrders_thenReturn200() throws Exception {
        OrderResponse o1 = OrderResponse.builder()
                .id(1L)
                .receiverName("Khach Hang A")
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.COD)
                .totalAmount(BigDecimal.valueOf(100000))
                .build();

        when(orderService.getAllOrders(null))
                .thenReturn(ApiResponse.success("Lấy danh sách đơn hàng thành công (Admin)", List.of(o1)));

        mockMvc.perform(get("/api/admin/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].status").value("PENDING"));
    }

    @Test
    void whenUpdateOrderStatusWithBody_thenReturn200() throws Exception {
        OrderResponse updated = OrderResponse.builder()
                .id(1L)
                .status(OrderStatus.PROCESSING)
                .build();

        when(orderService.updateOrderStatus(eq(1L), eq(OrderStatus.PROCESSING)))
                .thenReturn(ApiResponse.success("Cập nhật trạng thái đơn hàng thành công", updated));

        String body = """
                {
                    "status": "PROCESSING"
                }
                """;

        mockMvc.perform(put("/api/admin/orders/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PROCESSING"));
    }

    @Test
    void whenUpdateOrderStatusWithQueryParam_thenReturn200() throws Exception {
        OrderResponse updated = OrderResponse.builder()
                .id(1L)
                .status(OrderStatus.SHIPPING)
                .build();

        when(orderService.updateOrderStatus(eq(1L), eq(OrderStatus.SHIPPING)))
                .thenReturn(ApiResponse.success("Cập nhật trạng thái đơn hàng thành công", updated));

        mockMvc.perform(put("/api/admin/orders/1/status?status=SHIPPING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SHIPPING"));
    }
}
