package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.AiConfigRequest;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.request.ManualKnowledgeRequest;
import ra.project.server.model.dto.response.AiConfigResponse;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.model.dto.response.KnowledgeChunkResponse;
import ra.project.server.model.dto.response.KnowledgeDocumentResponse;
import ra.project.server.model.dto.response.KnowledgeStatsResponse;
import ra.project.server.service.AiConfigService;
import ra.project.server.service.AiService;
import ra.project.server.service.KnowledgeBaseService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminAiController {

    private final AiService aiService;
    private final KnowledgeBaseService knowledgeBaseService;
    private final AiConfigService aiConfigService;

    @PostMapping("/generate-description")
    public ResponseEntity<ApiResponse<AiGenerateDescriptionResponse>> generateDescription(
            @Valid @RequestBody AiGenerateDescriptionRequest request
    ) {
        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo mô tả sản phẩm chuẩn SEO thành công", response));
    }

    @PostMapping("/generate-article")
    public ResponseEntity<ApiResponse<ra.project.server.model.dto.response.AiGenerateArticleResponse>> generateArticle(
            @Valid @RequestBody ra.project.server.model.dto.request.AiGenerateArticleRequest request
    ) {
        ra.project.server.model.dto.response.AiGenerateArticleResponse response = aiService.generateArticleContent(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo nội dung bài viết bằng AI thành công", response));
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

    // ========================================================
    // CẤU HÌNH TRÍ TUỆ & GIỚI HẠN AI (AI INTELLIGENCE & LIMITS)
    // ========================================================

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<AiConfigResponse>> getAiConfig() {
        AiConfigResponse config = aiConfigService.getConfig();
        return ResponseEntity.ok(ApiResponse.success("Lấy cấu hình trí tuệ và giới hạn AI thành công", config));
    }

    @PutMapping("/config")
    public ResponseEntity<ApiResponse<AiConfigResponse>> updateAiConfig(
            @Valid @RequestBody AiConfigRequest request
    ) {
        AiConfigResponse updated = aiConfigService.updateConfig(request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cấu hình AI thành công", updated));
    }

    @PostMapping("/config/test")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testAiConnection(
            @RequestBody(required = false) Map<String, String> body
    ) {
        String provider = body != null ? body.get("provider") : null;
        String model = body != null ? body.get("model") : null;
        Map<String, Object> testResult = aiConfigService.testConnection(provider, model);
        return ResponseEntity.ok(ApiResponse.success("Kiểm tra kết nối AI thành công", testResult));
    }
}
