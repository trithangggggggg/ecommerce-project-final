package ra.project.server.service;

import org.springframework.web.multipart.MultipartFile;
import ra.project.server.model.dto.request.ManualKnowledgeRequest;
import ra.project.server.model.dto.response.KnowledgeChunkResponse;
import ra.project.server.model.dto.response.KnowledgeDocumentResponse;
import ra.project.server.model.dto.response.KnowledgeStatsResponse;

import java.util.List;

public interface KnowledgeBaseService {

    List<KnowledgeDocumentResponse> getAllDocuments(String category, String status, String search);

    KnowledgeDocumentResponse getDocumentById(Long id);

    KnowledgeStatsResponse getStats();

    KnowledgeDocumentResponse uploadDocument(MultipartFile file, String category);

    KnowledgeDocumentResponse createManualEntry(ManualKnowledgeRequest request);

    void deleteDocument(Long id);

    KnowledgeDocumentResponse reindexDocument(Long id);

    List<KnowledgeChunkResponse> getChunksByDocumentId(Long id);

    /**
     * Tìm kiếm ngữ cảnh tri thức liên quan nhất (RAG Knowledge Retrieval)
     * phục vụ nạp vào System Prompt của Chatbot AI.
     *
     * @param query Câu hỏi của khách hàng
     * @param maxChunks Số lượng đoạn chunk tối đa
     * @return Danh sách các đoạn trích xuất liên quan
     */
    List<String> findRelevantChunks(String query, int maxChunks);
}

