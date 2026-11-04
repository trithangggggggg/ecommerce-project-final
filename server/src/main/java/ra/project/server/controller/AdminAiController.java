package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.request.ManualKnowledgeRequest;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.model.dto.response.KnowledgeChunkResponse;
import ra.project.server.model.dto.response.KnowledgeDocumentResponse;
import ra.project.server.model.dto.response.KnowledgeStatsResponse;
import ra.project.server.service.AiService;
import ra.project.server.service.KnowledgeBaseService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminAiController {

    private final AiService aiService;
    private final KnowledgeBaseService knowledgeBaseService;

    @PostMapping("/generate-description")
    public ResponseEntity<ApiResponse<AiGenerateDescriptionResponse>> generateDescription(
            @Valid @RequestBody AiGenerateDescriptionRequest request
    ) {
        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo mô tả sản phẩm chuẩn SEO thành công", response));
    }

    // ========================================================
    // QUẢN LÝ TRI THỨC AI (AI KNOWLEDGE BASE MANAGEMENT)
    // ========================================================

    @GetMapping("/knowledge")
    public ResponseEntity<ApiResponse<List<KnowledgeDocumentResponse>>> getAllDocuments(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        List<KnowledgeDocumentResponse> list = knowledgeBaseService.getAllDocuments(category, status, search);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tài liệu tri thức thành công", list));
    }

    @GetMapping("/knowledge/stats")
    public ResponseEntity<ApiResponse<KnowledgeStatsResponse>> getKnowledgeStats() {
        KnowledgeStatsResponse stats = knowledgeBaseService.getStats();
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu thống kê tri thức thành công", stats));
    }

    @GetMapping("/knowledge/{id}")
    public ResponseEntity<ApiResponse<KnowledgeDocumentResponse>> getDocumentById(@PathVariable Long id) {
        KnowledgeDocumentResponse doc = knowledgeBaseService.getDocumentById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tài liệu thành công", doc));
    }

    @PostMapping(value = "/knowledge/upload", consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<KnowledgeDocumentResponse>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", required = false, defaultValue = "GENERAL") String category
    ) {
        KnowledgeDocumentResponse doc = knowledgeBaseService.uploadDocument(file, category);
        return ResponseEntity.ok(ApiResponse.success("Tải lên và nạp tri thức thành công", doc));
    }

    @PostMapping("/knowledge/manual")
    public ResponseEntity<ApiResponse<KnowledgeDocumentResponse>> createManualKnowledge(
            @Valid @RequestBody ManualKnowledgeRequest request
    ) {
        KnowledgeDocumentResponse doc = knowledgeBaseService.createManualEntry(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo mục tri thức thủ công thành công", doc));
    }

    @DeleteMapping("/knowledge/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long id) {
        knowledgeBaseService.deleteDocument(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa tài liệu và dữ liệu vector/chunks thành công", null));
    }

    @PostMapping("/knowledge/{id}/reindex")
    public ResponseEntity<ApiResponse<KnowledgeDocumentResponse>> reindexDocument(@PathVariable Long id) {
        KnowledgeDocumentResponse doc = knowledgeBaseService.reindexDocument(id);
        return ResponseEntity.ok(ApiResponse.success("Tái lập chỉ mục tri thức thành công", doc));
    }

    @GetMapping("/knowledge/{id}/chunks")
    public ResponseEntity<ApiResponse<List<KnowledgeChunkResponse>>> getDocumentChunks(@PathVariable Long id) {
        List<KnowledgeChunkResponse> chunks = knowledgeBaseService.getChunksByDocumentId(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chunks của tài liệu thành công", chunks));
    }
}
