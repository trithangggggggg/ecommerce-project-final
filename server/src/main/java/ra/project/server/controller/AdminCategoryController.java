package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.request.CategoryRequest;
import ra.project.server.model.dto.response.CategoryResponse;
import ra.project.server.service.CategoryService;
import ra.project.server.util.PaginationUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminCategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CategoryResponse>>> searchCategories(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean status,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "displayOrder,asc") String sort
    ) {
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<CategoryResponse> res = categoryService.searchAdminCategories(keyword, status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách danh mục quản trị thành công", res));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết danh mục thành công", categoryService.getCategoryById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(@Valid @RequestBody CategoryRequest request) {
        CategoryResponse created = categoryService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm danh mục mới thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật danh mục thành công", categoryService.updateCategory(id, request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<CategoryResponse>> toggleStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Boolean> body
    ) {
        Boolean status = body != null ? body.get("status") : null;
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái danh mục thành công", categoryService.toggleCategoryStatus(id, status)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa danh mục thành công", null));
    }
}

