package ra.project.server.mapper;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import ra.project.server.model.dto.request.ArticleRequest;
import ra.project.server.model.dto.response.ArticleResponse;
import ra.project.server.model.entity.Article;

@Component
public class ArticleMapper {

    public Article toEntity(ArticleRequest request, String generatedSlug) {
        if (request == null) {
            return null;
        }

        String category = StringUtils.hasText(request.getCategory()) ? request.getCategory().trim() : null;
        return Article.builder()
                .title(request.getTitle().trim())
                .slug(generatedSlug)
                .summary(request.getSummary() != null ? request.getSummary().trim() : null)
                .content(request.getContent())
                .thumbnail(request.getThumbnail() != null ? request.getThumbnail().trim() : null)
                .category(category)
                .views(0L)
                .status(request.getStatus() != null ? request.getStatus() : true)
                .build();
    }

    public ArticleResponse toResponse(Article entity) {
        if (entity == null) {
            return null;
        }
        return ArticleResponse.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .slug(entity.getSlug())
                .summary(entity.getSummary())
                .content(entity.getContent())
                .thumbnail(entity.getThumbnail())
                .category(entity.getCategory())
                .views(entity.getViews() != null ? entity.getViews() : 0L)
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public void updateEntity(Article entity, ArticleRequest request, String newSlug) {
        if (entity == null || request == null) {
            return;
        }
        entity.setTitle(request.getTitle().trim());
        if (StringUtils.hasText(newSlug)) {
            entity.setSlug(newSlug);
        }
        entity.setSummary(request.getSummary() != null ? request.getSummary().trim() : null);
        entity.setContent(request.getContent());
        if (request.getThumbnail() != null) {
            entity.setThumbnail(request.getThumbnail().trim());
        }
        if (request.getCategory() != null) {
            entity.setCategory(StringUtils.hasText(request.getCategory()) ? request.getCategory().trim() : null);
        }
        if (request.getStatus() != null) {
            entity.setStatus(request.getStatus());
        }
    }
}

