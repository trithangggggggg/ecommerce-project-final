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
import ra.project.server.model.dto.request.AiChatRequest;
import ra.project.server.model.dto.response.AiChatResponse;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.service.AiService;
import ra.project.server.service.RateLimiterService;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private AiService aiService;

    @Mock
    private RateLimiterService rateLimiterService;

    @InjectMocks
    private AiController aiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(aiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("Khách hàng gửi câu hỏi chat AI thành công và nhận về gợi ý sản phẩm")
    void testChatWithCustomer_Success() throws Exception {
        AiChatRequest request = AiChatRequest.builder()
                .message("Tư vấn cho mình laptop MacBook làm việc văn phòng")
                .history(Collections.emptyList())
                .build();

        ProductResponse p = ProductResponse.builder()
                .id(1L)
                .name("MacBook Air M3")
                .price(BigDecimal.valueOf(27990000))
                .build();

        AiChatResponse response = AiChatResponse.builder()
                .reply("Dạ em chào anh/chị! Dòng MacBook Air M3 rất phù hợp...")
                .suggestedProducts(List.of(p))
                .recommendedProducts(List.of(p))
                .provider("NEXOR AI Assistant")
                .build();

        when(rateLimiterService.allowChatRequest(any())).thenReturn(true);
        when(aiService.chatWithCustomer(any(AiChatRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reply").isNotEmpty())
                .andExpect(jsonPath("$.data.suggestedProducts[0].name").value("MacBook Air M3"))
                .andExpect(jsonPath("$.data.recommendedProducts[0].name").value("MacBook Air M3"))
                .andExpect(jsonPath("$.data.provider").value("NEXOR AI Assistant"));
    }

    @Test
    @DisplayName("Chặn và phản hồi lịch sự khi bị Rate Limit chống spam")
    void testChatWithCustomer_RateLimited() throws Exception {
        AiChatRequest request = AiChatRequest.builder()
                .message("Spam tin nhắn")
                .build();

        when(rateLimiterService.allowChatRequest(any())).thenReturn(false);
        when(rateLimiterService.getRemainingSeconds(any())).thenReturn(25L);

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reply").value(org.hamcrest.Matchers.containsString("Bạn đang gửi tin nhắn quá nhanh")))
                .andExpect(jsonPath("$.data.provider").value("NEXOR Rate Limiter"));

        verify(aiService, never()).chatWithCustomer(any());
    }

    @Test
    @DisplayName("Validation Error: Câu hỏi trống")
    void testChatWithCustomer_BlankMessage_BadRequest() throws Exception {
        AiChatRequest request = AiChatRequest.builder()
                .message("   ")
                .build();

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Validation Error: Câu hỏi vượt quá 500 ký tự")
    void testChatWithCustomer_MessageTooLong_BadRequest() throws Exception {
        String longText = "a".repeat(501);
        AiChatRequest request = AiChatRequest.builder()
                .message(longText)
                .build();

        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}

