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
import ra.project.server.model.dto.request.AiConfigRequest;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.request.ManualKnowledgeRequest;
import ra.project.server.model.dto.response.AiConfigResponse;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.model.dto.response.KnowledgeDocumentResponse;
import ra.project.server.model.dto.response.KnowledgeStatsResponse;
import ra.project.server.service.AiConfigService;
import ra.project.server.service.AiService;
import ra.project.server.service.KnowledgeBaseService;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminAiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private AiService aiService;

    @Mock
    private KnowledgeBaseService knowledgeBaseService;

    @Mock
    private AiConfigService aiConfigService;

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

    @Test
    @DisplayName("Admin gửi yêu cầu sinh mô tả với name, brand, specs dạng JSON")
    void testGenerateDescription_WithNameBrandSpecs_Success() throws Exception {
        Map<String, Object> payload = Map.of(
                "name", "MacBook Pro M4",
                "brand", "Apple",
                "categoryName", "Laptop",
                "specs", Map.of("RAM", "24GB", "Chip", "M4 Pro"),
                "keywords", List.of("macbook", "m4", "apple")
        );

        AiGenerateDescriptionResponse mockResponse = AiGenerateDescriptionResponse.builder()
                .productName("MacBook Pro M4")
                .brand("Apple")
                .categoryName("Laptop")
                .description("## MacBook Pro M4 – Đỉnh Cao Công Nghệ...")
                .seoTitle("Apple MacBook Pro M4 - Chính Hãng | NEXOR")
                .seoKeywords("apple, macbook pro m4, laptop chính hãng")
                .provider("SMART_SEO_ENGINE (Fallback)")
                .build();

        when(aiService.generateProductDescription(any(AiGenerateDescriptionRequest.class)))
                .thenReturn(mockResponse);

        mockMvc.perform(post("/api/admin/ai/generate-description")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.productName").value("MacBook Pro M4"))
                .andExpect(jsonPath("$.data.brand").value("Apple"));
    }
    @Test
    @DisplayName("Lấy danh sách tài liệu tri thức thành công")
    void testGetAllKnowledgeDocuments() throws Exception {
        KnowledgeDocumentResponse doc = KnowledgeDocumentResponse.builder()
                .id(1L)
                .fileName("chinh_sach.txt")
                .fileType("TXT")
                .category("POLICY")
                .status("INDEXED")
                .chunkCount(3)
                .build();

        when(knowledgeBaseService.getAllDocuments(any(), any(), any()))
                .thenReturn(List.of(doc));

        mockMvc.perform(get("/api/admin/ai/knowledge"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].fileName").value("chinh_sach.txt"));
    }

    @Test
    @DisplayName("Lấy thống kê Knowledge Base thành công")
    void testGetKnowledgeStats() throws Exception {
        KnowledgeStatsResponse stats = KnowledgeStatsResponse.builder()
                .totalFiles(5)
                .totalSize(10240L)
                .totalChunks(15)
                .fileTypeDistribution(Map.of("TXT", 3L, "PDF", 2L))
                .build();

        when(knowledgeBaseService.getStats()).thenReturn(stats);

        mockMvc.perform(get("/api/admin/ai/knowledge/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalFiles").value(5))
                .andExpect(jsonPath("$.data.totalChunks").value(15));
    }

    @Test
    @DisplayName("Tạo tài liệu tri thức thủ công")
    void testCreateManualKnowledge() throws Exception {
        ManualKnowledgeRequest req = ManualKnowledgeRequest.builder()
                .title("Chính sách trả góp")
                .content("Hỗ trợ trả góp 0% lãi suất.")
                .category("FAQ")
                .build();

        KnowledgeDocumentResponse doc = KnowledgeDocumentResponse.builder()
                .id(2L)
                .fileName("Chính sách trả góp")
                .fileType("MANUAL")
                .status("INDEXED")
                .chunkCount(1)
                .build();

        when(knowledgeBaseService.createManualEntry(any(ManualKnowledgeRequest.class))).thenReturn(doc);

        mockMvc.perform(post("/api/admin/ai/knowledge/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fileName").value("Chính sách trả góp"));
    }

    @Test
    @DisplayName("Xóa tài liệu tri thức")
    void testDeleteKnowledgeDocument() throws Exception {
        doNothing().when(knowledgeBaseService).deleteDocument(1L);

        mockMvc.perform(delete("/api/admin/ai/knowledge/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(knowledgeBaseService).deleteDocument(1L);
    }

    @Test
    @DisplayName("Lấy cấu hình trí tuệ & giới hạn AI")
    void testGetAiConfig() throws Exception {
        AiConfigResponse config = AiConfigResponse.builder()
                .provider("GOOGLE_GEMINI")
                .modelName("gemini-1.5-flash")
                .rateLimitPerMinute(15)
                .maxInputLength(500)
                .temperature(0.7)
                .build();

        when(aiConfigService.getConfig()).thenReturn(config);

        mockMvc.perform(get("/api/admin/ai/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.provider").value("GOOGLE_GEMINI"))
                .andExpect(jsonPath("$.data.rateLimitPerMinute").value(15));
    }

    @Test
    @DisplayName("Cập nhật cấu hình trí tuệ & giới hạn AI")
    void testUpdateAiConfig() throws Exception {
        AiConfigRequest req = AiConfigRequest.builder()
                .provider("GOOGLE_GEMINI")
                .modelName("gemini-1.5-pro")
                .rateLimitPerMinute(20)
                .maxInputLength(600)
                .temperature(0.5)
                .build();

        AiConfigResponse updated = AiConfigResponse.builder()
                .provider("GOOGLE_GEMINI")
                .modelName("gemini-1.5-pro")
                .rateLimitPerMinute(20)
                .maxInputLength(600)
                .temperature(0.5)
                .build();

        when(aiConfigService.updateConfig(any(AiConfigRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/api/admin/ai/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.modelName").value("gemini-1.5-pro"))
                .andExpect(jsonPath("$.data.rateLimitPerMinute").value(20));
    }

    @Test
    @DisplayName("Kiểm tra kết nối AI ping test")
    void testTestAiConnection() throws Exception {
        Map<String, Object> testRes = Map.of(
                "success", true,
                "provider", "GOOGLE_GEMINI (gemini-1.5-flash)",
                "latencyMs", 150,
                "status", "HEALTHY"
        );

        when(aiConfigService.testConnection(any(), any())).thenReturn(testRes);

        mockMvc.perform(post("/api/admin/ai/config/test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("HEALTHY"))
                .andExpect(jsonPath("$.data.latencyMs").value(150));
    }
}
