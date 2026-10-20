package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.request.ProductRequest;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.entity.Category;
import ra.project.server.model.entity.Product;
import ra.project.server.repository.CategoryRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.repository.ProductSpecification;
import ra.project.server.service.ProductService;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductMapper productMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getAllProducts(Long categoryId, Boolean status, Pageable pageable) {
        Specification<Product> spec = ProductSpecification.filter(null, categoryId, null, null, status);
        Page<Product> productPage = productRepository.findAll(spec, pageable);
        return PageResponse.from(productPage.map(productMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));
        return productMapper.toResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getProductsByCategoryId(Long categoryId, Pageable pageable) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + categoryId);
        }

        Page<Product> productPage = productRepository.findByCategoryId(categoryId, pageable);
        return PageResponse.from(productPage.map(productMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> searchProducts(
            String keyword,
            Long categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean status,
            Pageable pageable
    ) {
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new BadRequestException("Giá tối thiểu (minPrice) không được lớn hơn giá tối đa (maxPrice)!");
        }

        Specification<Product> spec = ProductSpecification.filter(keyword, categoryId, minPrice, maxPrice, status);
        Page<Product> productPage = productRepository.findAll(spec, pageable);
        return PageResponse.from(productPage.map(productMapper::toResponse));
    }

    @Override
    public ProductResponse createProduct(ProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + request.getCategoryId()));

        if (productRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw new BadRequestException("Tên sản phẩm '" + request.getName().trim() + "' đã tồn tại!");
        }

        Product product = productMapper.toEntity(request, category);
        Product savedProduct = productRepository.save(product);
        return productMapper.toResponse(savedProduct);
    }

    @Override
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + request.getCategoryId()));

        if (productRepository.existsByNameIgnoreCaseAndIdNot(request.getName().trim(), id)) {
            throw new BadRequestException("Tên sản phẩm '" + request.getName().trim() + "' đã tồn tại ở sản phẩm khác!");
        }

        productMapper.updateEntity(product, request, category);
        Product updatedProduct = productRepository.save(product);
        return productMapper.toResponse(updatedProduct);
    }

    @Override
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));

        productRepository.delete(product);
    }
}
