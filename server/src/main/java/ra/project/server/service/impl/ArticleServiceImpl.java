package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.mapper.ArticleMapper;
import ra.project.server.model.dto.request.ArticleRequest;
import ra.project.server.model.dto.response.ArticleResponse;
import ra.project.server.model.entity.Article;
import ra.project.server.repository.ArticleRepository;
import ra.project.server.service.ArticleService;
import ra.project.server.util.SlugUtil;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArticleServiceImpl implements ArticleService {

    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "gif", "svg"
    );

    private static final String UPLOAD_SUBDIR = "uploads/articles";

    private final ArticleRepository articleRepository;
    private final ArticleMapper articleMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ArticleResponse> getPublicArticles(String category, String keyword, Pageable pageable) {
        String cleanCategory = StringUtils.hasText(category) ? category.trim() : null;
        String cleanKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;

        Page<Article> page = articleRepository.findPublicArticles(cleanCategory, cleanKeyword, pageable);
        return PageResponse.from(page.map(articleMapper::toResponse));
    }

    @Override
    @Transactional
    public ArticleResponse getArticleBySlug(String slug) {
        if (!StringUtils.hasText(slug)) {
            throw new BadRequestException("Slug bài viết không được để trống");
        }

        Article article = articleRepository.findBySlug(slug.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết với đường dẫn: " + slug));

        if (Boolean.FALSE.equals(article.getStatus())) {
            throw new ResourceNotFoundException("Bài viết hiện đang ở chế độ nháp hoặc tạm ẩn");
        }

        // Tăng lượt xem bằng UPDATE query để không ghi đè updatedAt
        long nextViews = (article.getViews() != null ? article.getViews() : 0L) + 1L;
        articleRepository.incrementViews(article.getId());
        article.setViews(nextViews);

        return articleMapper.toResponse(article);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getPublicCategories() {
        return articleRepository.findDistinctPublicCategories();
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAllCategories() {
        return articleRepository.findDistinctAllCategories();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ArticleResponse> getAdminArticles(Boolean status, String category, String keyword, Pageable pageable) {
        String cleanCategory = StringUtils.hasText(category) ? category.trim() : null;
        String cleanKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;

        Page<Article> page = articleRepository.findAdminArticles(status, cleanCategory, cleanKeyword, pageable);
        return PageResponse.from(page.map(articleMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public ArticleResponse getArticleById(Long id) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết với ID: " + id));
        return articleMapper.toResponse(article);
    }

    @Override
    @Transactional
    public ArticleResponse createArticle(ArticleRequest request) {
        if (request == null) {
            throw new BadRequestException("Dữ liệu bài viết không được để trống");
        }

        String targetSlug = generateUniqueSlug(request.getTitle(), request.getSlug(), null);
        Article article = articleMapper.toEntity(request, targetSlug);
        Article saved = articleRepository.save(article);
        log.info(">>> Tạo bài viết mới thành công: ID={}, Title='{}', Slug='{}'", saved.getId(), saved.getTitle(), saved.getSlug());
        return articleMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public ArticleResponse updateArticle(Long id, ArticleRequest request) {
        if (request == null) {
            throw new BadRequestException("Dữ liệu cập nhật bài viết không được để trống");
        }

        Article existing = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết với ID: " + id));

        String newSlug = null;
        if (StringUtils.hasText(request.getSlug())) {
            newSlug = generateUniqueSlug(request.getTitle(), request.getSlug(), id);
        } else if (!existing.getTitle().equalsIgnoreCase(request.getTitle().trim())) {
            newSlug = generateUniqueSlug(request.getTitle(), null, id);
        }

        articleMapper.updateEntity(existing, request, newSlug);
        Article saved = articleRepository.save(existing);
        log.info(">>> Cập nhật bài viết thành công: ID={}, Slug='{}'", saved.getId(), saved.getSlug());
        return articleMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public ArticleResponse toggleArticleStatus(Long id, Boolean status) {
        Article existing = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết với ID: " + id));
        boolean nextStatus = status != null ? status : !Boolean.TRUE.equals(existing.getStatus());
        existing.setStatus(nextStatus);
        Article saved = articleRepository.save(existing);
        log.info(">>> Đổi trạng thái bài viết ID={} sang {}", id, nextStatus ? "PUBLISHED" : "DRAFT");
        return articleMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteArticle(Long id) {
        Article existing = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết với ID: " + id));
        articleRepository.delete(existing);
        log.info(">>> Đã xóa bài viết: ID={}, Title='{}'", id, existing.getTitle());
    }

    @Override
    public String uploadThumbnail(MultipartFile file) {
        return storeImage(file, "thumbnail");
    }

    @Override
    public String uploadCkEditorImage(MultipartFile file) {
        return storeImage(file, "ckeditor");
    }

    private String generateUniqueSlug(String title, String customSlug, Long currentId) {
        String baseSource = StringUtils.hasText(customSlug) ? customSlug : title;
        String baseSlug = SlugUtil.toSlug(baseSource);
        String candidateSlug = baseSlug;
        int counter = 1;

        while (isSlugTaken(candidateSlug, currentId)) {
            candidateSlug = baseSlug + "-" + counter;
            counter++;
        }

        return candidateSlug;
    }

    private boolean isSlugTaken(String slug, Long currentId) {
        if (currentId == null) {
            return articleRepository.existsBySlug(slug);
        }
        return articleRepository.existsBySlugAndIdNot(slug, currentId);
    }

    private String storeImage(MultipartFile file, String prefix) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn tập tin hình ảnh");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        }

        if (!ALLOWED_IMAGE_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Định dạng file không hợp lệ! Chỉ chấp nhận: " + String.join(", ", ALLOWED_IMAGE_EXTENSIONS));
        }

        try {
            Path targetDir = Paths.get(UPLOAD_SUBDIR).toAbsolutePath().normalize();
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }

            String cleanFileName = StringUtils.hasText(originalFilename)
                    ? SlugUtil.toSlug(originalFilename.substring(0, originalFilename.lastIndexOf(".")))
                    : "img";
            String uniqueFileName = prefix + "_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + "." + extension;

            Path destination = targetDir.resolve(uniqueFileName);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destination, StandardCopyOption.REPLACE_EXISTING);
            }

            log.info(">>> Đã lưu trữ ảnh thành công tại: {}", destination);
            return "/" + UPLOAD_SUBDIR + "/" + uniqueFileName;
        } catch (IOException e) {
            log.error(">>> Lỗi khi lưu tập tin ảnh: {}", e.getMessage(), e);
            throw new BadRequestException("Không thể lưu tập tin tải lên: " + e.getMessage());
        }
    }
}

