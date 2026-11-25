package ra.project.server.mapper;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import ra.project.server.model.dto.request.CategoryRequest;
import ra.project.server.model.dto.response.CategoryResponse;
import ra.project.server.model.entity.Category;
import ra.project.server.util.SlugUtil;

@Component
public class CategoryMapper {

    public Category toEntity(CategoryRequest request) {
        if (request == null) {
            return null;
        }
        String name = request.getName().trim();
        String slug = StringUtils.hasText(request.getSlug())
                ? SlugUtil.toSlug(request.getSlug())
                : SlugUtil.toSlug(name);
        return Category.builder()
                .name(name)
                .slug(slug)
                .description(request.getDescription())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .showOnHome(request.getShowOnHome() != null ? request.getShowOnHome() : true)
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
                .slug(StringUtils.hasText(entity.getSlug()) ? entity.getSlug() : SlugUtil.toSlug(entity.getName()))
                .description(entity.getDescription())
                .displayOrder(entity.getDisplayOrder() != null ? entity.getDisplayOrder() : 0)
                .showOnHome(entity.getShowOnHome() != null ? entity.getShowOnHome() : true)
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
        String name = request.getName().trim();
        entity.setName(name);
        if (StringUtils.hasText(request.getSlug())) {
            entity.setSlug(SlugUtil.toSlug(request.getSlug()));
        } else if (!StringUtils.hasText(entity.getSlug())) {
            entity.setSlug(SlugUtil.toSlug(name));
        }
        entity.setDescription(request.getDescription());
        if (request.getDisplayOrder() != null) {
            entity.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getShowOnHome() != null) {
            entity.setShowOnHome(request.getShowOnHome());
        }
        if (request.getStatus() != null) {
            entity.setStatus(request.getStatus());
        }
    }
}
