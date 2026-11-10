package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.request.ArticleRequest;
import ra.project.server.model.dto.response.ArticleResponse;
import ra.project.server.service.ArticleService;
import ra.project.server.util.PaginationUtil;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ArticleController {

    private final ArticleService articleService;

    // =========================================================================
    // 1. PUBLIC APIS
    // =========================================================================

    /**
     * Lấy danh sách bài viết công khai (hỗ trợ phân trang, lọc theo danh mục, tìm kiếm từ khóa)
     * GET /api/articles?page=0&size=10&category=cong-nghe&keyword=iphone
     */
    @GetMapping("/api/articles")
    public ResponseEntity<ApiResponse<PageResponse<ArticleResponse>>> getPublicArticles(
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size,
            @RequestParam(name = "sort", defaultValue = "createdAt,desc") String sort
    ) {
        String searchKeyword = StringUtils.hasText(keyword) ? keyword : q;
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<ArticleResponse> response = articleService.getPublicArticles(category, searchKeyword, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bài viết thành công", response));
    }

    /**
     * Lấy chi tiết bài viết theo Slug SEO và tự động tăng lượt xem (views)
     * GET /api/articles/{slug}
     */
    @GetMapping("/api/articles/{slug}")
    public ResponseEntity<ApiResponse<ArticleResponse>> getArticleBySlug(@PathVariable String slug) {
        ArticleResponse response = articleService.getArticleBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết bài viết thành công", response));
    }

    // =========================================================================
    // 2. ADMIN APIS (Quản lý bài viết & CKEditor 5)
    // =========================================================================

    /**
     * Lấy danh sách bài viết dành cho Admin (bao gồm cả bài viết ẩn/nháp)
     * GET /api/admin/articles
     */
    @GetMapping("/api/admin/articles")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ArticleResponse>>> getAdminArticles(
            @RequestParam(name = "status", required = false) Boolean status,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size,
            @RequestParam(name = "sort", defaultValue = "createdAt,desc") String sort
    ) {
        String searchKeyword = StringUtils.hasText(keyword) ? keyword : q;
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<ArticleResponse> response = articleService.getAdminArticles(status, category, searchKeyword, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bài viết quản trị thành công", response));
    }

    /**
     * Lấy chi tiết bài viết theo ID dành cho Admin
     * GET /api/admin/articles/{id}
     */
    @GetMapping("/api/admin/articles/{id:[0-9]+}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<ArticleResponse>> getAdminArticleById(@PathVariable Long id) {
        ArticleResponse response = articleService.getArticleById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin bài viết thành công", response));
    }

    /**
     * Thêm mới bài viết (tự sinh slug chuẩn SEO không dấu, chống trùng lặp)
     * POST /api/admin/articles hoặc POST /api/articles
     */
    @PostMapping({"/api/admin/articles", "/api/articles"})
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<ArticleResponse>> createArticle(@Valid @RequestBody ArticleRequest request) {
        ArticleResponse response = articleService.createArticle(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo bài viết mới thành công", response));
    }

    /**
     * Sửa bài viết (cập nhật thông tin, tự động cập nhật slug nếu tiêu đề thay đổi)
     * PUT /api/admin/articles/{id} hoặc PUT /api/articles/{id}
     */
    @PutMapping({"/api/admin/articles/{id:[0-9]+}", "/api/articles/{id:[0-9]+}"})
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<ArticleResponse>> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody ArticleRequest request
    ) {
        ArticleResponse response = articleService.updateArticle(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật bài viết thành công", response));
    }

    /**
     * Xóa bài viết
     * DELETE /api/admin/articles/{id} hoặc DELETE /api/articles/{id}
     */
    @DeleteMapping({"/api/admin/articles/{id:[0-9]+}", "/api/articles/{id:[0-9]+}"})
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteArticle(@PathVariable Long id) {
        articleService.deleteArticle(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa bài viết thành công", null));
    }

    /**
     * Upload ảnh đại diện (thumbnail) bài viết
     * POST /api/admin/articles/upload-thumbnail
     */
    @PostMapping(value = {"/api/admin/articles/upload-thumbnail", "/api/articles/upload-thumbnail"}, consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadThumbnail(
            @RequestParam("file") MultipartFile file
    ) {
        String url = articleService.uploadThumbnail(file);
        return ResponseEntity.ok(ApiResponse.success("Upload ảnh đại diện bài viết thành công", Map.of("url", url)));
    }

    /**
     * Upload ảnh chèn trong bài viết dùng cho CKEditor 5
     * Chuẩn adapter CKEditor 5 SimpleUploadAdapter yêu cầu trả về: { "url": "..." }
     * POST /api/admin/articles/upload-image
     */
    @PostMapping(value = {"/api/admin/articles/upload-image", "/api/articles/upload-image"}, consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadCkEditorImage(
            @RequestParam(value = "upload", required = false) MultipartFile upload,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        MultipartFile targetFile = upload != null ? upload : file;
        String url = articleService.uploadCkEditorImage(targetFile);
        return ResponseEntity.ok(Map.of(
                "uploaded", true,
                "url", url,
                "urls", Map.of("default", url)
        ));
    }
}

