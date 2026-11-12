package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.model.dto.request.ProductRequest;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.dto.response.ProductVariantResponse;
import ra.project.server.service.ProductService;
import ra.project.server.util.PaginationUtil;

import java.util.Collections;
import java.util.List;
import java.util.Map;

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
            @RequestParam(name = "brand", required = false) String brand,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "includeDeleted", required = false, defaultValue = "false") Boolean includeDeleted,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size,
            @RequestParam(name = "sort", defaultValue = "id,desc") String sort
    ) {
        String searchKeyword = StringUtils.hasText(keyword) ? keyword : q;
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<ProductResponse> products = productService.getAllAdminProducts(
                searchKeyword, categoryId, brand, status, includeDeleted, pageable
        );
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm quản trị thành công", products));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getAdminProductById(@PathVariable Long id) {
        ProductResponse product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin chi tiết sản phẩm thành công (Admin)", product));
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

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ProductResponse>> toggleProductStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        Boolean status = null;
        if (body != null && body.containsKey("status")) {
            Object val = body.get("status");
            if (val instanceof Boolean) {
                status = (Boolean) val;
            } else if (val != null) {
                status = Boolean.parseBoolean(val.toString().trim());
            }
        }
        ProductResponse response = productService.toggleProductStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái sản phẩm thành công (Admin)", response));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProductStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        return toggleProductStatus(id, body);
    }

    @GetMapping("/{id}/active-orders")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getActiveOrdersForProduct(@PathVariable Long id) {
        List<OrderResponse> activeOrders = productService.getActiveOrdersForProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn hàng đang đặt của sản phẩm thành công", activeOrders));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa mềm sản phẩm thành công (Admin)", null));
    }

    @PutMapping("/{id}/stock")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProductStock(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
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
            throw new BadRequestException("Số lượng tồn kho (stock) không hợp lệ");
        }

        java.math.BigDecimal targetPrice = null;
        if (body != null && body.containsKey("price")) {
            Object pVal = body.get("price");
            if (pVal instanceof Number) {
                targetPrice = java.math.BigDecimal.valueOf(((Number) pVal).doubleValue());
            } else if (pVal != null) {
                try {
                    targetPrice = new java.math.BigDecimal(pVal.toString().trim());
                } catch (Exception ignored) {}
            }
        }

        ProductResponse response = productService.updateProductStock(id, targetStock, targetPrice);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật số lượng tồn kho thành công", response));
    }

    @PutMapping("/variants/{variantId}/stock")
    public ResponseEntity<ApiResponse<ProductVariantResponse>> updateVariantStock(
            @PathVariable Long variantId,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(name = "quantity", required = false) Integer quantityParam,
            @RequestParam(name = "isDelta", required = false) Boolean isDeltaParam
    ) {
        Integer targetQty = null;
        Boolean isDelta = Boolean.FALSE;
        java.math.BigDecimal targetPrice = null;
        java.math.BigDecimal targetOriginalPrice = null;

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

            if (body.containsKey("price")) {
                Object pVal = body.get("price");
                if (pVal instanceof Number) {
                    targetPrice = java.math.BigDecimal.valueOf(((Number) pVal).doubleValue());
                } else if (pVal != null) {
                    try {
                        targetPrice = new java.math.BigDecimal(pVal.toString().trim());
                    } catch (Exception ignored) {}
                }
            }

            if (body.containsKey("originalPrice")) {
                Object opVal = body.get("originalPrice");
                if (opVal instanceof Number) {
                    targetOriginalPrice = java.math.BigDecimal.valueOf(((Number) opVal).doubleValue());
                } else if (opVal != null) {
                    try {
                        targetOriginalPrice = new java.math.BigDecimal(opVal.toString().trim());
                    } catch (Exception ignored) {}
                }
            }
        }

        if (targetQty == null && quantityParam != null) {
            targetQty = quantityParam;
        }
        if (isDeltaParam != null) {
            isDelta = isDeltaParam;
        }

        String warehouse = (body != null && body.get("warehouse") != null) ? body.get("warehouse").toString() : null;
        String shelfLocation = (body != null && body.get("shelfLocation") != null) ? body.get("shelfLocation").toString() : null;
        boolean hasLocationUpdate = warehouse != null || shelfLocation != null;

        if (targetQty == null && !hasLocationUpdate) {
            throw new BadRequestException("Số lượng biến thể không hợp lệ");
        }

        ProductVariantResponse response = null;
        if (targetQty != null) {
            response = productService.updateVariantStock(
                    variantId, targetQty, isDelta, targetPrice, targetOriginalPrice
            );
        }
        if (hasLocationUpdate) {
            response = productService.updateVariantLocation(variantId, warehouse, shelfLocation);
        }
        return ResponseEntity.ok(ApiResponse.success("Cập nhật biến thể kho hàng thành công", response));
    }

    @PutMapping("/variants/{variantId}/location")
    public ResponseEntity<ApiResponse<ProductVariantResponse>> updateVariantLocation(
            @PathVariable Long variantId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String warehouse = body != null ? body.get("warehouse") : null;
        String shelfLocation = body != null ? body.get("shelfLocation") : null;
        ProductVariantResponse response = productService.updateVariantLocation(variantId, warehouse, shelfLocation);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vị trí kho & mã kệ thành công", response));
    }

    @PostMapping("/{productId}/variants")
    public ResponseEntity<ApiResponse<ProductVariantResponse>> createProductVariant(
            @PathVariable Long productId,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        ProductVariantResponse response = productService.createVariant(
                productId, body != null ? body : Collections.emptyMap()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo biến thể mới thành công (Admin)", response));
    }
}
