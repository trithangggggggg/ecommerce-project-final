package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.request.ProductRequest;
import ra.project.server.model.dto.response.ProductResponse;

import java.math.BigDecimal;

public interface ProductService {

    PageResponse<ProductResponse> getAllProducts(String keyword, Long categoryId, Boolean status, Pageable pageable);

    PageResponse<ProductResponse> getAllProducts(String keyword, Long categoryId, String brand, Boolean status, Pageable pageable);

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

    void deleteProduct(Long id);
}
