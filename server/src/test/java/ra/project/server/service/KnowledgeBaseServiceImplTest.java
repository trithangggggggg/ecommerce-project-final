package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import ra.project.server.model.dto.request.ManualKnowledgeRequest;
import ra.project.server.model.dto.response.KnowledgeDocumentResponse;
import ra.project.server.model.dto.response.KnowledgeStatsResponse;
import ra.project.server.model.entity.KnowledgeChunk;
import ra.project.server.model.entity.KnowledgeDocument;
import ra.project.server.repository.KnowledgeChunkRepository;
import ra.project.server.repository.KnowledgeDocumentRepository;
import ra.project.server.service.impl.KnowledgeBaseServiceImpl;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KnowledgeBaseServiceImplTest {

    @Mock
    private KnowledgeDocumentRepository documentRepository;

    @Mock
    private KnowledgeChunkRepository chunkRepository;

    @InjectMocks
    private KnowledgeBaseServiceImpl knowledgeBaseService;

    private KnowledgeDocument sampleDoc;

    @BeforeEach
    void setUp() {
        sampleDoc = KnowledgeDocument.builder()
                .id(1L)
                .fileName("chinh_sach_bao_hanh.txt")
                .fileType("TXT")
                .fileSize(1024L)
                .category("POLICY")
                .status("INDEXED")
                .chunkCount(2)
                .rawContent("Nội dung chính sách bảo hành 1 đổi 1 trong 30 ngày")
                .build();
    }

    @Test
    @DisplayName("Lấy danh sách tất cả tài liệu tri thức")
    void getAllDocuments_returnsList() {
        when(documentRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(sampleDoc));

        List<KnowledgeDocumentResponse> result = knowledgeBaseService.getAllDocuments("ALL", "ALL", null);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("chinh_sach_bao_hanh.txt", result.get(0).getFileName());
    }

    @Test
    @DisplayName("Thống kê tổng quan tri thức chính xác")
    void getStats_returnsCorrectAggregation() {
        when(documentRepository.findAll()).thenReturn(List.of(sampleDoc));

        KnowledgeStatsResponse stats = knowledgeBaseService.getStats();

        assertNotNull(stats);
        assertEquals(1, stats.getTotalFiles());
        assertEquals(1024L, stats.getTotalSize());
        assertEquals(2, stats.getTotalChunks());
        assertTrue(stats.getFileTypeDistribution().containsKey("TXT"));
    }

    @Test
    @DisplayName("Nạp tri thức thủ công thành công và sinh chunks")
    void createManualEntry_success() {
        ManualKnowledgeRequest req = ManualKnowledgeRequest.builder()
                .title("Hướng dẫn thanh toán")
                .content("Hỗ trợ thanh toán qua chuyển khoản ngân hàng và thẻ tín dụng 0% lãi suất.")
                .category("FAQ")
                .build();

        when(documentRepository.save(any(KnowledgeDocument.class))).thenAnswer(inv -> {
            KnowledgeDocument doc = inv.getArgument(0);
            doc.setId(2L);
            return doc;
        });

        KnowledgeDocumentResponse res = knowledgeBaseService.createManualEntry(req);

        assertNotNull(res);
        assertEquals("Hướng dẫn thanh toán", res.getFileName());
        assertEquals("MANUAL", res.getFileType());
        verify(chunkRepository, atLeastOnce()).saveAll(any());
    }

    @Test
    @DisplayName("Tải lên tài liệu TXT và lưu trữ các chunks")
    void uploadDocument_txt_success() {
        String content = "Chính sách freeship toàn quốc từ 500k cho khách hàng NEXOR.";
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "freeship.txt",
                "text/plain",
                content.getBytes(StandardCharsets.UTF_8)
        );

        when(documentRepository.save(any(KnowledgeDocument.class))).thenAnswer(inv -> {
            KnowledgeDocument doc = inv.getArgument(0);
            doc.setId(3L);
            return doc;
        });

        KnowledgeDocumentResponse res = knowledgeBaseService.uploadDocument(file, "POLICY");

        assertNotNull(res);
        assertEquals("freeship.txt", res.getFileName());
        assertEquals("TXT", res.getFileType());
        assertEquals("INDEXED", res.getStatus());
    }

    @Test
    @DisplayName("Tìm kiếm chunks liên quan cho truy vấn RAG")
    void findRelevantChunks_matchesKeywords() {
        KnowledgeChunk chunk = KnowledgeChunk.builder()
                .id(1L)
                .document(sampleDoc)
                .chunkIndex(0)
                .content("Bảo hành 1 đổi 1 trong 30 ngày cho lỗi phần cứng")
                .build();

        when(chunkRepository.findAll()).thenReturn(List.of(chunk));

        List<String> results = knowledgeBaseService.findRelevantChunks("chính sách bảo hành", 3);

        assertNotNull(results);
        assertFalse(results.isEmpty());
        assertTrue(results.get(0).contains("Bảo hành 1 đổi 1"));
    }

    @Test
    @DisplayName("Xóa tài liệu và các chunks liên quan")
    void deleteDocument_success() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(sampleDoc));

        knowledgeBaseService.deleteDocument(1L);

        verify(chunkRepository).deleteAllByDocumentId(1L);
        verify(documentRepository).delete(sampleDoc);
    }
}

