package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.mapper.ArticleMapper;
import ra.project.server.model.dto.request.ArticleRequest;
import ra.project.server.model.dto.response.ArticleResponse;
import ra.project.server.model.entity.Article;
import ra.project.server.repository.ArticleRepository;
import ra.project.server.service.impl.ArticleServiceImpl;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleServiceImplTest {

    @Mock
    private ArticleRepository articleRepository;

    @Spy
    private ArticleMapper articleMapper = new ArticleMapper();

    @InjectMocks
    private ArticleServiceImpl articleService;

    private Article sampleArticle;

    @BeforeEach
    void setUp() {
        sampleArticle = Article.builder()
                .id(1L)
                .title("Đánh giá Laptop Gaming")
                .slug("danh-gia-laptop-gaming")
                .summary("Tóm tắt bài viết mẫu")
                .content("<p>Nội dung chi tiết định dạng HTML từ CKEditor 5</p>")
                .thumbnail("/uploads/sample.jpg")
                .category("Đánh giá")
                .views(10L)
                .status(true)
                .build();
    }

    @Test
    @DisplayName("Nên lấy danh sách bài viết public thành công")
    void testGetPublicArticles() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Article> page = new PageImpl<>(List.of(sampleArticle), pageable, 1);
        when(articleRepository.findPublicArticles(eq("Đánh giá"), eq("Gaming"), eq(pageable))).thenReturn(page);

        PageResponse<ArticleResponse> result = articleService.getPublicArticles("Đánh giá", "Gaming", pageable);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("Đánh giá Laptop Gaming", result.getContent().get(0).getTitle());
    }

    @Test
    @DisplayName("Nên lấy chi tiết bài viết theo slug và tự động tăng lượt xem (views)")
    void testGetArticleBySlug_IncrementsViews() {
        when(articleRepository.findBySlug("danh-gia-laptop-gaming")).thenReturn(Optional.of(sampleArticle));

        ArticleResponse response = articleService.getArticleBySlug("danh-gia-laptop-gaming");

        assertNotNull(response);
        assertEquals("danh-gia-laptop-gaming", response.getSlug());
        assertEquals(11L, response.getViews());
        verify(articleRepository, times(1)).incrementViews(1L);
    }

    @Test
    @DisplayName("Nên ném ngoại lệ khi không tìm thấy bài viết theo slug")
    void testGetArticleBySlug_NotFound() {
        when(articleRepository.findBySlug("khong-ton-tai")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> articleService.getArticleBySlug("khong-ton-tai"));
    }

    @Test
    @DisplayName("Nên tạo bài viết mới và tự sinh slug chuẩn SEO không dấu")
    void testCreateArticle_AutoGeneratesSeoSlug() {
        ArticleRequest request = ArticleRequest.builder()
                .title("Hướng Dẫn Lập Trình Spring Boot 3 & React 19")
                .summary("Tóm tắt hướng dẫn")
                .content("<p>Nội dung bài viết CKEditor</p>")
                .category("Công nghệ")
                .status(true)
                .build();

        when(articleRepository.existsBySlug(anyString())).thenReturn(false);
        when(articleRepository.save(any(Article.class))).thenAnswer(invocation -> {
            Article a = invocation.getArgument(0);
            a.setId(2L);
            return a;
        });

        ArticleResponse response = articleService.createArticle(request);

        assertNotNull(response);
        assertEquals("huong-dan-lap-trinh-spring-boot-3-react-19", response.getSlug());
        assertEquals("Hướng Dẫn Lập Trình Spring Boot 3 & React 19", response.getTitle());
    }

    @Test
    @DisplayName("Nên tự động thêm hậu tố khi slug bị trùng lặp")
    void testCreateArticle_HandlesDuplicateSlug() {
        ArticleRequest request = ArticleRequest.builder()
                .title("Đánh giá Laptop Gaming")
                .content("<p>Nội dung test</p>")
                .build();

        when(articleRepository.existsBySlug("danh-gia-laptop-gaming")).thenReturn(true);
        when(articleRepository.existsBySlug("danh-gia-laptop-gaming-1")).thenReturn(false);
        when(articleRepository.save(any(Article.class))).thenAnswer(invocation -> {
            Article a = invocation.getArgument(0);
            a.setId(3L);
            return a;
        });

        ArticleResponse response = articleService.createArticle(request);

        assertNotNull(response);
        assertEquals("danh-gia-laptop-gaming-1", response.getSlug());
    }

    @Test
    @DisplayName("Nên xóa bài viết theo ID thành công")
    void testDeleteArticle_Success() {
        when(articleRepository.findById(1L)).thenReturn(Optional.of(sampleArticle));

        articleService.deleteArticle(1L);

        verify(articleRepository, times(1)).delete(sampleArticle);
    }
}

