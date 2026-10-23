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
import ra.project.server.model.dto.request.ProductRequest;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.service.ProductService;
import ra.project.server.util.PaginationUtil;

@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> getAllAdminProducts(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "categoryId", required = false) Long categoryId,
            @RequestParam(name = "status", required = false) Boolean status,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size,
            @RequestParam(name = "sort", defaultValue = "id,desc") String sort
    ) {
        String searchKeyword = org.springframework.util.StringUtils.hasText(keyword) ? keyword : q;
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<ProductResponse> products = productService.getAllProducts(searchKeyword, categoryId, status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm quản trị thành công", products));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(@Valid @RequestBody ProductRequest request) {
        ProductResponse createdProduct = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm sản phẩm mới thành công (Admin)", createdProduct));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request
    ) {
        ProductResponse updatedProduct = productService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật sản phẩm thành công (Admin)", updatedProduct));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa sản phẩm thành công (Admin)", null));
    }
}
