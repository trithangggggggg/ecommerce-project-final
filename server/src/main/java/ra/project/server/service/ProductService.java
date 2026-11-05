package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.request.ProductRequest;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.dto.response.ProductVariantResponse;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface ProductService {

    PageResponse<ProductResponse> getAllProducts(String keyword, Long categoryId, Boolean status, Pageable pageable);

    PageResponse<ProductResponse> getAllProducts(String keyword, Long categoryId, String brand, Boolean status, Pageable pageable);

    PageResponse<ProductResponse> getAllAdminProducts(String keyword, Long categoryId, String brand, Boolean status, Boolean includeDeleted, Pageable pageable);

    ProductResponse getProductById(Long id);

    PageResponse<ProductResponse> getProductsByCategoryId(Long categoryId, Pageable pageable);

    PageResponse<ProductResponse> searchProducts(
            String keyword,
            Long categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean status,
            Pageable pageable
    );

    PageResponse<ProductResponse> searchProducts(
            String keyword,
            Long categoryId,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean status,
            Pageable pageable
    );

    ProductResponse createProduct(ProductRequest request);

    ProductResponse updateProduct(Long id, ProductRequest request);

    ProductResponse toggleProductStatus(Long id, Boolean status);

    ProductResponse updateProductStock(Long id, Integer stock);

    ProductVariantResponse updateVariantStock(Long variantId, Integer quantity, Boolean isDelta);

    ProductVariantResponse createVariant(Long productId, Map<String, Object> body);

    List<OrderResponse> getActiveOrdersForProduct(Long productId);

    void deleteProduct(Long id);
}
