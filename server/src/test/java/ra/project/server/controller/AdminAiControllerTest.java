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
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.service.AiService;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminAiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private AiService aiService;

    @InjectMocks
    private AdminAiController adminAiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminAiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    void testGenerateDescription_Success() throws Exception {
        AiGenerateDescriptionRequest request = AiGenerateDescriptionRequest.builder()
                .productName("iPhone 16 Pro Max")
                .categoryName("Điện thoại")
                .keywords(List.of("Titan", "A18 Pro"))
                .build();

        AiGenerateDescriptionResponse mockResponse = AiGenerateDescriptionResponse.builder()
                .productName("iPhone 16 Pro Max")
                .categoryName("Điện thoại")
                .description("Mô tả sản phẩm chuẩn SEO cho iPhone 16 Pro Max...")
                .seoTitle("iPhone 16 Pro Max - Chính Hãng")
                .seoKeywords("iphone 16 pro max, titan, a18 pro")
                .provider("SPRING_AI")
                .build();

        when(aiService.generateProductDescription(any(AiGenerateDescriptionRequest.class)))
                .thenReturn(mockResponse);

        mockMvc.perform(post("/api/admin/ai/generate-description")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.productName").value("iPhone 16 Pro Max"))
                .andExpect(jsonPath("$.data.description").exists())
                .andExpect(jsonPath("$.data.provider").value("SPRING_AI"));
    }

    @Test
    void testGenerateDescription_ValidationError_EmptyName() throws Exception {
        AiGenerateDescriptionRequest request = AiGenerateDescriptionRequest.builder()
                .productName("")
                .build();

        mockMvc.perform(post("/api/admin/ai/generate-description")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(400));
    }
}
