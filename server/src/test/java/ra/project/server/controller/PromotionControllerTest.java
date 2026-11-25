package ra.project.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.model.dto.request.PromotionApplyRequest;
import ra.project.server.model.dto.response.PromotionCheckResponse;
import ra.project.server.model.entity.Promotion;
import ra.project.server.service.PromotionService;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PromotionControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private PromotionService promotionService;

    @InjectMocks
    private PromotionController promotionController;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders
                .standaloneSetup(promotionController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void whenApplyPromotion_withValidActiveCode_thenReturn200() throws Exception {
        PromotionCheckResponse response = PromotionCheckResponse.builder()
                .code("DISCOUNT10")
                .title("Giảm 10%")
                .discount("10%")
                .discountAmount(BigDecimal.valueOf(100000))
                .subtotal(BigDecimal.valueOf(1000000))
                .finalTotal(BigDecimal.valueOf(900000))
                .type("ORDER")
                .isValid(true)
                .message("Áp dụng mã giảm giá thành công!")
                .build();

        when(promotionService.checkPromotion("DISCOUNT10", BigDecimal.valueOf(1000000), BigDecimal.valueOf(30000)))
                .thenReturn(ApiResponse.success("Áp dụng mã giảm giá thành công", response));

        PromotionApplyRequest request = PromotionApplyRequest.builder()
                .code("DISCOUNT10")
                .subtotal(BigDecimal.valueOf(1000000))
                .shippingFee(BigDecimal.valueOf(30000))
                .build();

        mockMvc.perform(post("/api/promotions/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("DISCOUNT10"))
                .andExpect(jsonPath("$.data.discountAmount").value(100000));
    }

    @Test
    void whenApplyPromotion_withNotFoundCode_thenReturn400() throws Exception {
        when(promotionService.checkPromotion(eq("INVALID_CODE"), any(), any()))
                .thenThrow(new BadRequestException("Mã giảm giá 'INVALID_CODE' không tồn tại"));

        PromotionApplyRequest request = PromotionApplyRequest.builder()
                .code("INVALID_CODE")
                .subtotal(BigDecimal.valueOf(500000))
                .build();

        mockMvc.perform(post("/api/promotions/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Mã giảm giá 'INVALID_CODE' không tồn tại"));
    }

    @Test
    void whenCheckPromotionViaGet_thenReturn200() throws Exception {
        PromotionCheckResponse response = PromotionCheckResponse.builder()
                .code("FREESHIP")
                .title("Miễn phí ship")
                .discount("100%")
                .discountAmount(BigDecimal.valueOf(30000))
                .subtotal(BigDecimal.valueOf(500000))
                .finalTotal(BigDecimal.ZERO)
                .type("SHIPPING")
                .isValid(true)
                .build();

        when(promotionService.checkPromotion("FREESHIP", BigDecimal.valueOf(500000), BigDecimal.valueOf(30000)))
                .thenReturn(ApiResponse.success("Áp dụng mã miễn/giảm phí vận chuyển thành công!", response));

        mockMvc.perform(get("/api/promotions/check")
                        .param("code", "FREESHIP")
                        .param("subtotal", "500000")
                        .param("shippingFee", "30000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("FREESHIP"))
                .andExpect(jsonPath("$.data.discountAmount").value(30000));
    }

    @Test
    void whenGetAvailablePromotions_thenReturnList() throws Exception {
        Promotion promo = Promotion.builder()
                .id(1L)
                .code("FREESHIP")
                .title("Freeship")
                .discount("100%")
                .type("SHIPPING")
                .status("ACTIVE")
                .build();

        when(promotionService.getAvailablePromotions())
                .thenReturn(ApiResponse.success("Lấy danh sách mã ưu đãi khả dụng thành công", List.of(promo)));

        mockMvc.perform(get("/api/promotions/available"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("FREESHIP"));
    }
}
