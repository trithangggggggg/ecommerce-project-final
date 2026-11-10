package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import ra.project.server.exception.BadRequestException;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.response.ProductVariantResponse;
import ra.project.server.model.dto.response.VisualSearchResponse;
import ra.project.server.model.entity.Category;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.ProductVariant;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.impl.AiVisualSearchServiceImpl;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiVisualSearchServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductMapper productMapper;

    @Mock
    private AiConfigService aiConfigService;

    @InjectMocks
    private AiVisualSearchServiceImpl visualSearchService;

    private Product laptopApple;
    private Product laptopDell;

    @BeforeEach
    void setUp() {
        Category categoryLaptop = Category.builder()
                .id(1L)
                .name("Laptop")
                .build();

        ProductVariant variantApple = ProductVariant.builder()
                .id(101L)
                .sku("MBP-M3-GRAY")
                .price(new BigDecimal("45000000"))
                .originalPrice(new BigDecimal("48000000"))
                .stock(10)
                .status(true)
                .build();

        laptopApple = Product.builder()
                .id(1L)
                .name("MacBook Pro 14 M3 Pro Space Gray")
                .brand("Apple")
                .description("Laptop Apple MacBook Pro M3 màu xám không gian")
                .price(new BigDecimal("45000000"))
                .category(categoryLaptop)
                .status("ACTIVE")
                .isDeleted(false)
                .variants(List.of(variantApple))
                .build();

        ProductVariant variantDell = ProductVariant.builder()
                .id(102L)
                .sku("DELL-XPS-13")
                .price(new BigDecimal("35000000"))
                .originalPrice(new BigDecimal("38000000"))
                .stock(5)
                .status(true)
                .build();

        laptopDell = Product.builder()
                .id(2L)
                .name("Dell XPS 13 Plus Bạc")
                .brand("Dell")
                .description("Laptop Dell XPS cao cấp màu bạc")
                .price(new BigDecimal("35000000"))
                .category(categoryLaptop)
                .status("ACTIVE")
                .isDeleted(false)
                .variants(List.of(variantDell))
                .build();
    }

    @Test
    @DisplayName("Ném BadRequestException khi file ảnh rỗng hoặc null")
    void whenImageNullOrEmpty_thenThrowBadRequestException() {
        assertThrows(BadRequestException.class, () -> visualSearchService.searchByImage(null));

        MockMultipartFile emptyFile = new MockMultipartFile("image", "empty.jpg", "image/jpeg", new byte[0]);
        assertThrows(BadRequestException.class, () -> visualSearchService.searchByImage(emptyFile));
    }

    @Test
    @DisplayName("Ném BadRequestException khi file vượt quá 5MB")
    void whenImageExceeds5MB_thenThrowBadRequestException() {
        byte[] largeBytes = new byte[6 * 1024 * 1024]; // 6MB
        MockMultipartFile largeFile = new MockMultipartFile("image", "large.png", "image/png", largeBytes);

        assertThrows(BadRequestException.class, () -> visualSearchService.searchByImage(largeFile));
    }

    @Test
    @DisplayName("Ném BadRequestException khi định dạng file không phải JPEG, PNG hoặc WEBP")
    void whenInvalidFileFormat_thenThrowBadRequestException() {
        MockMultipartFile textFile = new MockMultipartFile("image", "test.txt", "text/plain", "abc".getBytes());

        assertThrows(BadRequestException.class, () -> visualSearchService.searchByImage(textFile));
    }

    @Test
    @DisplayName("Tìm kiếm bằng ảnh thành công với Smart Fallback khi chưa cấu hình Gemini API Key")
    void whenSearchByImage_withNoApiKey_thenFallbackAndMatchProducts() {
        MockMultipartFile file = new MockMultipartFile("image", "macbook-pro.jpg", "image/jpeg", "fake-image-bytes".getBytes());

        when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple, laptopDell));
        when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(
                ProductVariantResponse.builder()
                        .id(101L)
                        .sku("MBP-M3-GRAY")
                        .price(new BigDecimal("45000000"))
                        .build()
        );

        VisualSearchResponse response = visualSearchService.searchByImage(file);

        assertNotNull(response);
        assertNotNull(response.getDetectedAttributes());
        assertEquals("Laptop", response.getDetectedAttributes().getCategory());
        assertEquals("Apple", response.getDetectedAttributes().getBrand());
        assertTrue(response.getTotalMatches() > 0);

        // Sản phẩm Apple phải đứng đầu với matchPercent cao hơn
        assertEquals(laptopApple.getId(), response.getProducts().get(0).getId());
        assertTrue(response.getProducts().get(0).getMatchPercent() >= 70);
        assertNotNull(response.getProducts().get(0).getBestVariant());
    }

    @Test
    @DisplayName("Fallback trả về danh sách gợi ý khi không có sản phẩm nào vượt qua ngưỡng 15%")
    void whenNoProductMatchesThreshold_thenReturnsFeaturedRecommendations() {
        MockMultipartFile file = new MockMultipartFile("image", "random.jpg", "image/jpeg", "fake-bytes".getBytes());

        // Tạo 1 sản phẩm hoàn toàn không khớp
        Category otherCategory = Category.builder().id(99L).name("Khác").build();
        Product unrelatedProduct = Product.builder()
                .id(999L)
                .name("Sản phẩm linh tinh XYZ")
                .brand("UnknownBrand")
                .category(otherCategory)
                .status("ACTIVE")
                .price(new BigDecimal("100000"))
                .isDeleted(false)
                .variants(List.of())
                .build();

        when(productRepository.findAllActiveForSearch()).thenReturn(List.of(unrelatedProduct));

        VisualSearchResponse response = visualSearchService.searchByImage(file);

        assertNotNull(response);
        assertFalse(response.getProducts().isEmpty());
        assertEquals(1, response.getProducts().size());
        assertEquals(999L, response.getProducts().get(0).getId());
        assertEquals(25, response.getProducts().get(0).getMatchPercent());
    }
}

