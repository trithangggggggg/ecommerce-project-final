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
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.request.ManualKnowledgeRequest;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.model.dto.response.KnowledgeDocumentResponse;
import ra.project.server.model.dto.response.KnowledgeStatsResponse;
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
}
