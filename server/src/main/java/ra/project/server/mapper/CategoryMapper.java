package ra.project.server.mapper;

import org.springframework.stereotype.Component;
import ra.project.server.model.dto.request.CategoryRequest;
import ra.project.server.model.dto.response.CategoryResponse;
import ra.project.server.model.entity.Category;

@Component
public class CategoryMapper {

    public Category toEntity(CategoryRequest request) {
        if (request == null) {
            return null;
        }
        return Category.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : true)
                .build();
    }

    public CategoryResponse toResponse(Category entity) {
        if (entity == null) {
            return null;
        }
        return CategoryResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .productCount(entity.getProducts() != null ? entity.getProducts().size() : 0)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public void updateEntity(Category entity, CategoryRequest request) {
        if (entity == null || request == null) {
            return;
        }
        entity.setName(request.getName().trim());
        entity.setDescription(request.getDescription());
        if (request.getStatus() != null) {
            entity.setStatus(request.getStatus());
        }
    }
}
