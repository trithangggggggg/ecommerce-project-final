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

    @GetMapping("/{id}/active-orders")
    public ResponseEntity<ApiResponse<java.util.List<ra.project.server.model.dto.response.OrderResponse>>> getActiveOrdersForProduct(@PathVariable Long id) {
        java.util.List<ra.project.server.model.dto.response.OrderResponse> activeOrders = productService.getActiveOrdersForProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn hàng đang đặt của sản phẩm thành công", activeOrders));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa sản phẩm thành công (Admin)", null));
    }

    @PutMapping("/{id}/stock")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProductStock(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, Object> body,
            @RequestParam(name = "stock", required = false) Integer stockParam
    ) {
        Integer targetStock = null;
        if (body != null && body.containsKey("stock")) {
            Object val = body.get("stock");
            if (val instanceof Number) {
                targetStock = ((Number) val).intValue();
            } else if (val != null) {
                try {
                    targetStock = Integer.parseInt(val.toString().trim());
                } catch (NumberFormatException ignored) {}
            }
        } else if (stockParam != null) {
            targetStock = stockParam;
        }

        if (targetStock == null || targetStock < 0) {
            throw new ra.project.server.exception.BadRequestException("Số lượng tồn kho (stock) không hợp lệ");
        }

        ProductResponse response = productService.updateProductStock(id, targetStock);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật số lượng tồn kho thành công", response));
    }

    @PutMapping("/variants/{variantId}/stock")
    public ResponseEntity<ApiResponse<ra.project.server.model.dto.response.ProductVariantResponse>> updateVariantStock(
            @PathVariable Long variantId,
            @RequestBody(required = false) java.util.Map<String, Object> body,
            @RequestParam(name = "quantity", required = false) Integer quantityParam,
            @RequestParam(name = "isDelta", required = false) Boolean isDeltaParam
    ) {
        Integer targetQty = null;
        Boolean isDelta = Boolean.FALSE;

        if (body != null) {
            if (body.containsKey("quantity")) {
                Object val = body.get("quantity");
                if (val instanceof Number) {
                    targetQty = ((Number) val).intValue();
                } else if (val != null) {
                    try {
                        targetQty = Integer.parseInt(val.toString().trim());
                    } catch (NumberFormatException ignored) {}
                }
            } else if (body.containsKey("stock")) {
                Object val = body.get("stock");
                if (val instanceof Number) {
                    targetQty = ((Number) val).intValue();
                } else if (val != null) {
                    try {
                        targetQty = Integer.parseInt(val.toString().trim());
                    } catch (NumberFormatException ignored) {}
                }
            }

            if (body.containsKey("isDelta")) {
                Object deltaVal = body.get("isDelta");
                if (deltaVal instanceof Boolean) {
                    isDelta = (Boolean) deltaVal;
                } else if (deltaVal != null) {
                    isDelta = Boolean.parseBoolean(deltaVal.toString());
                }
            }
        }

        if (targetQty == null && quantityParam != null) {
            targetQty = quantityParam;
        }
        if (isDeltaParam != null) {
            isDelta = isDeltaParam;
        }

        if (targetQty == null) {
            throw new ra.project.server.exception.BadRequestException("Số lượng biến thể không hợp lệ");
        }

        ra.project.server.model.dto.response.ProductVariantResponse response =
                productService.updateVariantStock(variantId, targetQty, isDelta);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật số lượng tồn kho biến thể thành công", response));
    }

    @PostMapping("/{productId}/variants")
    public ResponseEntity<ApiResponse<ra.project.server.model.dto.response.ProductVariantResponse>> createProductVariant(
            @PathVariable Long productId,
            @RequestBody java.util.Map<String, Object> body
    ) {
        ra.project.server.model.dto.response.ProductVariantResponse response =
                productService.createVariant(productId, body != null ? body : java.util.Collections.emptyMap());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo biến thể mới thành công (Admin)", response));
    }
}
