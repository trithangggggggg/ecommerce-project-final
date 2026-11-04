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
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.model.dto.request.PromotionApplyRequest;
import ra.project.server.model.entity.Promotion;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.PromotionRepository;
import ra.project.server.repository.UserRepository;

import java.math.BigDecimal;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PromotionControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

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
        Promotion promo = Promotion.builder()
                .id(1L)
                .code("DISCOUNT10")
                .title("Giảm 10%")
                .discount("10%")
                .status("ACTIVE")
                .usedCount(0)
                .maxUsage(100)
                .expiry("2030-12-31")
                .type("ORDER")
                .build();

        when(promotionRepository.findByCodeIgnoreCase("DISCOUNT10")).thenReturn(Optional.of(promo));

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
        when(promotionRepository.findByCodeIgnoreCase(anyString())).thenReturn(Optional.empty());

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
}
