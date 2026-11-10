package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.request.ArticleRequest;
import ra.project.server.model.dto.response.ArticleResponse;

public interface ArticleService {

    PageResponse<ArticleResponse> getPublicArticles(String category, String keyword, Pageable pageable);

    ArticleResponse getArticleBySlug(String slug);

    PageResponse<ArticleResponse> getAdminArticles(Boolean status, String category, String keyword, Pageable pageable);

    ArticleResponse getArticleById(Long id);

    ArticleResponse createArticle(ArticleRequest request);

    ArticleResponse updateArticle(Long id, ArticleRequest request);

    void deleteArticle(Long id);

    String uploadThumbnail(MultipartFile file);

    String uploadCkEditorImage(MultipartFile file);
}

