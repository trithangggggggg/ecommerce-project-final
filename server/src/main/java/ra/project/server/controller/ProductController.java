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

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductService productService;

    private Pageable buildProductPageable(Integer page, Integer size, String sort) {
        String normalized = "createdAt,desc";
        if (org.springframework.util.StringUtils.hasText(sort)) {
            String s = sort.trim().toLowerCase();
            normalized = switch (s) {
                case "price_asc", "price,asc", "price-asc" -> "price,asc";
                case "price_desc", "price,desc", "price-desc" -> "price,desc";
                case "name_asc", "name,asc", "name-asc" -> "name,asc";
                case "name_desc", "name,desc", "name-desc" -> "name,desc";
                case "oldest", "createdat,asc", "id,asc" -> "createdAt,asc";
                case "popular", "bestseller", "id,desc" -> "id,desc";
                case "newest", "createdat,desc" -> "createdAt,desc";
                default -> (s.startsWith("price,") || s.startsWith("name,") || s.startsWith("createdat,") || s.startsWith("id,") || s.startsWith("stock,"))
                        ? sort.trim()
                        : "createdAt,desc";
            };
        }
        return PaginationUtil.createPageable(page, size, normalized);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> getAllProducts(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "categoryId", required = false) Long categoryId,
            @RequestParam(name = "brand", required = false) String brand,
            @RequestParam(name = "status", required = false) Boolean status,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size,
            @RequestParam(name = "sort", defaultValue = "createdAt,desc") String sort
    ) {
        String searchKeyword = org.springframework.util.StringUtils.hasText(keyword) ? keyword : q;
        Pageable pageable = buildProductPageable(page, size, sort);
        PageResponse<ProductResponse> products = productService.getAllProducts(searchKeyword, categoryId, brand, status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm thành công", products));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        ProductResponse product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết sản phẩm thành công", product));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> getProductsByCategory(
            @PathVariable Long categoryId,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size,
            @RequestParam(name = "sort", defaultValue = "createdAt,desc") String sort
    ) {
        Pageable pageable = buildProductPageable(page, size, sort);
        PageResponse<ProductResponse> products = productService.getProductsByCategoryId(categoryId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm theo danh mục thành công", products));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> searchProducts(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "categoryId", required = false) Long categoryId,
            @RequestParam(name = "brand", required = false) String brand,
            @RequestParam(name = "minPrice", required = false) BigDecimal minPrice,
            @RequestParam(name = "maxPrice", required = false) BigDecimal maxPrice,
            @RequestParam(name = "status", required = false) Boolean status,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size,
            @RequestParam(name = "sort", defaultValue = "createdAt,desc") String sort
    ) {
        String searchKeyword = org.springframework.util.StringUtils.hasText(keyword) ? keyword : q;
        Pageable pageable = buildProductPageable(page, size, sort);
        PageResponse<ProductResponse> products = productService.searchProducts(searchKeyword, categoryId, brand, minPrice, maxPrice, status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Tìm kiếm sản phẩm thành công", products));
    }
}

