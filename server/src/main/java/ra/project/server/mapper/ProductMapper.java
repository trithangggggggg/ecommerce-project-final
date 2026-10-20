package ra.project.server.mapper;

import org.springframework.stereotype.Component;
import ra.project.server.model.dto.request.ProductRequest;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.entity.Category;
import ra.project.server.model.entity.Product;

@Component
public class ProductMapper {

    public Product toEntity(ProductRequest request, Category category) {
        if (request == null) {
            return null;
        }
        return Product.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .price(request.getPrice())
                .stock(request.getStock())
                .imageUrl(request.getImageUrl())
                .status(request.getStatus() != null ? request.getStatus() : true)
                .category(category)
                .build();
    }

    public ProductResponse toResponse(Product entity) {
        if (entity == null) {
            return null;
        }
        return ProductResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .price(entity.getPrice())
                .stock(entity.getStock())
                .imageUrl(entity.getImageUrl())
                .status(entity.getStatus())
                .categoryId(entity.getCategory() != null ? entity.getCategory().getId() : null)
                .categoryName(entity.getCategory() != null ? entity.getCategory().getName() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public void updateEntity(Product entity, ProductRequest request, Category category) {
        if (entity == null || request == null) {
            return;
        }
        entity.setName(request.getName().trim());
        entity.setDescription(request.getDescription());
        entity.setPrice(request.getPrice());
        entity.setStock(request.getStock());
        entity.setImageUrl(request.getImageUrl());
        if (request.getStatus() != null) {
            entity.setStatus(request.getStatus());
        }
        if (category != null) {
            entity.setCategory(category);
        }
    }
}
