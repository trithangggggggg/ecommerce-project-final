package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import ra.project.server.exception.BadRequestException;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.response.ProductVariantResponse;
import ra.project.server.model.dto.response.VisualSearchProductItem;
import ra.project.server.model.dto.response.VisualSearchResponse;
import ra.project.server.model.entity.Category;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.ProductOptionValue;
import ra.project.server.model.entity.ProductVariant;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.impl.AiVisualSearchServiceImpl;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

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

    // ==================== Dữ liệu mẫu dùng chung ====================
    private Category categoryLaptop;
    private Category categoryPhone;
    private Category categoryTablet;
    private Category categoryHeadphone;

    private Product laptopApple;
    private Product laptopDell;
    private Product phoneIphone;
    private Product phoneSamsung;
    private Product tabletIpad;
    private Product headphoneSony;

    private ProductVariantResponse mockVariantResponse;

    @BeforeEach
    void setUp() {
        // Danh mục
        categoryLaptop = Category.builder().id(1L).name("Laptop").build();
        categoryPhone = Category.builder().id(2L).name("Điện thoại").build();
        categoryTablet = Category.builder().id(3L).name("Máy tính bảng").build();
        categoryHeadphone = Category.builder().id(4L).name("Thiết bị âm thanh").build();

        // Variant cho Laptop Apple
        ProductVariant variantAppleInStock = ProductVariant.builder()
                .id(101L).sku("MBP-M3-GRAY")
                .price(new BigDecimal("45000000")).originalPrice(new BigDecimal("48000000"))
                .stock(10).status(true).build();

        ProductVariant variantAppleOutOfStock = ProductVariant.builder()
                .id(102L).sku("MBP-M3-SILVER")
                .price(new BigDecimal("43000000")).originalPrice(new BigDecimal("48000000"))
                .stock(0).status(true).build();

        laptopApple = Product.builder()
                .id(1L).name("MacBook Pro 14 M3 Pro Space Gray").brand("Apple")
                .description("Laptop Apple MacBook Pro M3 màu xám không gian")
                .price(new BigDecimal("45000000")).imageUrl("https://example.com/macbook.png")
                .category(categoryLaptop).status("ACTIVE").isDeleted(false)
                .variants(List.of(variantAppleInStock, variantAppleOutOfStock))
                .build();

        // Variant cho Laptop Dell
        ProductVariant variantDell = ProductVariant.builder()
                .id(201L).sku("DELL-XPS-13")
                .price(new BigDecimal("35000000")).originalPrice(new BigDecimal("38000000"))
                .stock(5).status(true).build();

        laptopDell = Product.builder()
                .id(2L).name("Dell XPS 13 Plus Bạc").brand("Dell")
                .description("Laptop Dell XPS cao cấp màu bạc")
                .price(new BigDecimal("35000000"))
                .category(categoryLaptop).status("ACTIVE").isDeleted(false)
                .variants(List.of(variantDell))
                .build();

        // iPhone
        ProductVariant variantIphone = ProductVariant.builder()
                .id(301L).sku("IP15PM-256-NAT")
                .price(new BigDecimal("29490000")).originalPrice(new BigDecimal("34990000"))
                .stock(8).status(true).build();

        phoneIphone = Product.builder()
                .id(3L).name("iPhone 15 Pro Max 256GB Titan Tự Nhiên").brand("Apple")
                .description("Điện thoại Apple iPhone 15 Pro Max chính hãng")
                .price(new BigDecimal("29490000"))
                .category(categoryPhone).status("ACTIVE").isDeleted(false)
                .variants(List.of(variantIphone))
                .build();

        // Samsung
        ProductVariant variantSamsung = ProductVariant.builder()
                .id(401L).sku("SS-S24U-256")
                .price(new BigDecimal("25990000")).originalPrice(new BigDecimal("31990000"))
                .stock(12).status(true).build();

        phoneSamsung = Product.builder()
                .id(4L).name("Samsung Galaxy S24 Ultra 256GB Đen").brand("Samsung")
                .description("Điện thoại Samsung Galaxy S24 Ultra cao cấp màu đen")
                .price(new BigDecimal("25990000"))
                .category(categoryPhone).status("ACTIVE").isDeleted(false)
                .variants(List.of(variantSamsung))
                .build();

        // iPad
        ProductVariant variantIpad = ProductVariant.builder()
                .id(501L).sku("IPAD-AIR-M2")
                .price(new BigDecimal("16990000")).originalPrice(new BigDecimal("18990000"))
                .stock(6).status(true).build();

        tabletIpad = Product.builder()
                .id(5L).name("iPad Air M2 11 inch WiFi 128GB Xanh").brand("Apple")
                .description("Máy tính bảng Apple iPad Air M2 thế hệ mới")
                .price(new BigDecimal("16990000"))
                .category(categoryTablet).status("ACTIVE").isDeleted(false)
                .variants(List.of(variantIpad))
                .build();

        // Tai nghe Sony
        ProductVariant variantSony = ProductVariant.builder()
                .id(601L).sku("SONY-WH1000XM5")
                .price(new BigDecimal("7990000")).originalPrice(new BigDecimal("8990000"))
                .stock(15).status(true).build();

        headphoneSony = Product.builder()
                .id(6L).name("Sony WH-1000XM5 Đen").brand("Sony")
                .description("Tai nghe chống ồn Sony WH-1000XM5 cao cấp màu đen")
                .price(new BigDecimal("7990000"))
                .category(categoryHeadphone).status("ACTIVE").isDeleted(false)
                .variants(List.of(variantSony))
                .build();

        // Mock variant response mặc định
        mockVariantResponse = ProductVariantResponse.builder()
                .id(101L).sku("MBP-M3-GRAY").price(new BigDecimal("45000000")).build();
    }

    // ====================================================================
    //  NHÓM 1: VALIDATE FILE ẢNH ĐẦU VÀO
    // ====================================================================
    @Nested
    @DisplayName("1. Validate File Ảnh Đầu Vào")
    class ValidateImageFile {

        @Test
        @DisplayName("1.1 Ném BadRequestException khi file là null")
        void whenImageNull_thenThrowBadRequestException() {
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> visualSearchService.searchByImage(null));
            assertTrue(ex.getMessage().contains("tải lên"));
        }

        @Test
        @DisplayName("1.2 Ném BadRequestException khi file rỗng (0 byte)")
        void whenImageEmpty_thenThrowBadRequestException() {
            MockMultipartFile emptyFile = new MockMultipartFile("image", "empty.jpg", "image/jpeg", new byte[0]);
            assertThrows(BadRequestException.class, () -> visualSearchService.searchByImage(emptyFile));
        }

        @Test
        @DisplayName("1.3 Ném BadRequestException khi file vượt quá 5MB")
        void whenImageExceeds5MB_thenThrowBadRequestException() {
            byte[] largeBytes = new byte[6 * 1024 * 1024]; // 6MB
            MockMultipartFile largeFile = new MockMultipartFile("image", "large.png", "image/png", largeBytes);

            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> visualSearchService.searchByImage(largeFile));
            assertTrue(ex.getMessage().contains("5MB"));
        }

        @Test
        @DisplayName("1.4 Chấp nhận file đúng 5MB (biên giới hạn)")
        void whenImageExactly5MB_thenNoException() {
            byte[] exactBytes = new byte[5 * 1024 * 1024]; // Chính xác 5MB
            MockMultipartFile file = new MockMultipartFile("image", "exact.jpg", "image/jpeg", exactBytes);

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            assertDoesNotThrow(() -> visualSearchService.searchByImage(file));
        }

        @Test
        @DisplayName("1.5 Ném BadRequestException khi định dạng file là text/plain (.txt)")
        void whenFormatTxt_thenThrowBadRequestException() {
            MockMultipartFile txtFile = new MockMultipartFile("image", "test.txt", "text/plain", "abc".getBytes());
            assertThrows(BadRequestException.class, () -> visualSearchService.searchByImage(txtFile));
        }

        @Test
        @DisplayName("1.6 Ném BadRequestException khi định dạng file là PDF")
        void whenFormatPdf_thenThrowBadRequestException() {
            MockMultipartFile pdfFile = new MockMultipartFile("image", "doc.pdf", "application/pdf", "pdf-data".getBytes());
            assertThrows(BadRequestException.class, () -> visualSearchService.searchByImage(pdfFile));
        }

        @Test
        @DisplayName("1.7 Ném BadRequestException khi định dạng file là GIF")
        void whenFormatGif_thenThrowBadRequestException() {
            MockMultipartFile gifFile = new MockMultipartFile("image", "anim.gif", "image/gif", "gif-data".getBytes());
            assertThrows(BadRequestException.class, () -> visualSearchService.searchByImage(gifFile));
        }

        @Test
        @DisplayName("1.8 Chấp nhận file JPEG (contentType = image/jpeg)")
        void whenFormatJpeg_thenAccepted() {
            MockMultipartFile file = new MockMultipartFile("image", "photo.jpeg", "image/jpeg", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            assertDoesNotThrow(() -> visualSearchService.searchByImage(file));
        }

        @Test
        @DisplayName("1.9 Chấp nhận file PNG")
        void whenFormatPng_thenAccepted() {
            MockMultipartFile file = new MockMultipartFile("image", "photo.png", "image/png", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            assertDoesNotThrow(() -> visualSearchService.searchByImage(file));
        }

        @Test
        @DisplayName("1.10 Chấp nhận file WEBP")
        void whenFormatWebp_thenAccepted() {
            MockMultipartFile file = new MockMultipartFile("image", "photo.webp", "image/webp", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            assertDoesNotThrow(() -> visualSearchService.searchByImage(file));
        }

        @Test
        @DisplayName("1.11 Chấp nhận file có extension .jpg khi contentType bị null")
        void whenContentTypeNull_butExtensionJpg_thenAccepted() {
            MockMultipartFile file = new MockMultipartFile("image", "photo.jpg", null, "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            assertDoesNotThrow(() -> visualSearchService.searchByImage(file));
        }
    }

    // ====================================================================
    //  NHÓM 2: SMART FALLBACK ENGINE (Khi chưa có Gemini API Key)
    // ====================================================================
    @Nested
    @DisplayName("2. Smart Fallback - Nhận diện từ tên file")
    class SmartFallbackEngine {

        @Test
        @DisplayName("2.1 Nhận diện Laptop + Apple từ tên file chứa 'macbook'")
        void whenFilenameMacbook_thenDetectLaptopApple() {
            MockMultipartFile file = new MockMultipartFile("image", "macbook-pro-m3.jpg", "image/jpeg", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple, laptopDell));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertEquals("Laptop", response.getDetectedAttributes().getCategory());
            assertEquals("Apple", response.getDetectedAttributes().getBrand());
            assertEquals("NEXOR Smart Fallback", response.getProvider());
            assertTrue(response.getDetectedAttributes().getKeywords().contains("MacBook"));
        }

        @Test
        @DisplayName("2.2 Nhận diện Laptop + Dell từ tên file chứa 'dell'")
        void whenFilenameDell_thenDetectLaptopDell() {
            MockMultipartFile file = new MockMultipartFile("image", "dell-xps-15.png", "image/png", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple, laptopDell));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertEquals("Laptop", response.getDetectedAttributes().getCategory());
            assertEquals("Dell", response.getDetectedAttributes().getBrand());
        }

        @Test
        @DisplayName("2.3 Nhận diện Điện thoại + Apple từ tên file chứa 'iphone'")
        void whenFilenameIphone_thenDetectPhoneApple() {
            MockMultipartFile file = new MockMultipartFile("image", "iphone-15-pro.jpg", "image/jpeg", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(phoneIphone, phoneSamsung));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertEquals("Điện thoại", response.getDetectedAttributes().getCategory());
            assertEquals("Apple", response.getDetectedAttributes().getBrand());
            assertTrue(response.getDetectedAttributes().getKeywords().contains("iPhone"));
        }

        @Test
        @DisplayName("2.4 Nhận diện Điện thoại + Samsung từ tên file chứa 'samsung'")
        void whenFilenameSamsung_thenDetectPhoneSamsung() {
            MockMultipartFile file = new MockMultipartFile("image", "samsung-galaxy-s24.webp", "image/webp", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(phoneIphone, phoneSamsung));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertEquals("Điện thoại", response.getDetectedAttributes().getCategory());
            assertEquals("Samsung", response.getDetectedAttributes().getBrand());
            assertTrue(response.getDetectedAttributes().getKeywords().contains("Galaxy"));
        }

        @Test
        @DisplayName("2.5 Nhận diện Máy tính bảng từ tên file chứa 'ipad'")
        void whenFilenameIpad_thenDetectTablet() {
            MockMultipartFile file = new MockMultipartFile("image", "ipad-air-m2.jpg", "image/jpeg", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(tabletIpad));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertEquals("Máy tính bảng", response.getDetectedAttributes().getCategory());
            assertEquals("Apple", response.getDetectedAttributes().getBrand());
        }

        @Test
        @DisplayName("2.6 Nhận diện Thiết bị âm thanh từ tên file chứa 'headphone'")
        void whenFilenameHeadphone_thenDetectAudio() {
            MockMultipartFile file = new MockMultipartFile("image", "headphone-sony-xm5.jpg", "image/jpeg", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(headphoneSony));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertEquals("Thiết bị âm thanh", response.getDetectedAttributes().getCategory());
            assertEquals("Sony", response.getDetectedAttributes().getBrand());
        }

        @Test
        @DisplayName("2.7 Fallback mặc định 'Thiết bị điện tử' khi tên file không chứa từ khóa nào")
        void whenFilenameGeneric_thenDefaultCategory() {
            MockMultipartFile file = new MockMultipartFile("image", "IMG_20261110_082300.jpg", "image/jpeg", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertEquals("Thiết bị điện tử", response.getDetectedAttributes().getCategory());
            assertEquals("Apple", response.getDetectedAttributes().getBrand());
            assertEquals("NEXOR Smart Fallback", response.getProvider());
        }
    }

    // ====================================================================
    //  NHÓM 3: THUẬT TOÁN SO KHỚP & MATCHPERCENT
    // ====================================================================
    @Nested
    @DisplayName("3. Thuật toán So khớp & matchPercent")
    class MatchingAlgorithm {

        @Test
        @DisplayName("3.1 Khớp chính xác Danh mục (35%) + Thương hiệu (35%) = matchPercent >= 70%")
        void whenExactCategoryAndBrand_thenHighMatchPercent() {
            MockMultipartFile file = new MockMultipartFile("image", "macbook-pro.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple, laptopDell));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertFalse(response.getProducts().isEmpty());
            // Laptop Apple phải đứng đầu
            VisualSearchProductItem topProduct = response.getProducts().get(0);
            assertEquals(laptopApple.getId(), topProduct.getId());
            assertTrue(topProduct.getMatchPercent() >= 70, "matchPercent phải >= 70% khi khớp cả danh mục và thương hiệu");
        }

        @Test
        @DisplayName("3.2 Sản phẩm cùng danh mục nhưng khác thương hiệu có matchPercent thấp hơn")
        void whenSameCategoryDifferentBrand_thenLowerMatchPercent() {
            MockMultipartFile file = new MockMultipartFile("image", "macbook-pro.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple, laptopDell));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertTrue(response.getProducts().size() >= 2);
            // Apple phải xếp trên Dell
            VisualSearchProductItem apple = response.getProducts().stream()
                    .filter(p -> p.getId().equals(laptopApple.getId())).findFirst().orElse(null);
            VisualSearchProductItem dell = response.getProducts().stream()
                    .filter(p -> p.getId().equals(laptopDell.getId())).findFirst().orElse(null);

            assertNotNull(apple);
            assertNotNull(dell);
            assertTrue(apple.getMatchPercent() > dell.getMatchPercent(),
                    "Sản phẩm khớp thương hiệu phải có matchPercent cao hơn");
        }

        @Test
        @DisplayName("3.3 Sản phẩm khác danh mục hoàn toàn thì không vượt ngưỡng 15%")
        void whenDifferentCategory_thenBelowThreshold() {
            // Tìm Laptop nhưng database chỉ có Tai nghe
            MockMultipartFile file = new MockMultipartFile("image", "macbook-pro.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(headphoneSony));

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            // Không có sản phẩm nào khớp → Trả về gợi ý với matchPercent = 25
            assertFalse(response.getProducts().isEmpty());
            assertEquals(25, response.getProducts().get(0).getMatchPercent());
        }

        @Test
        @DisplayName("3.4 Sắp xếp kết quả giảm dần theo matchPercent")
        void whenMultipleProducts_thenSortedDescending() {
            MockMultipartFile file = new MockMultipartFile("image", "iphone-15.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(
                    List.of(laptopApple, phoneIphone, phoneSamsung, tabletIpad, headphoneSony));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            List<VisualSearchProductItem> products = response.getProducts();
            assertFalse(products.isEmpty());

            // Xác nhận sắp xếp giảm dần
            for (int i = 0; i < products.size() - 1; i++) {
                assertTrue(products.get(i).getMatchPercent() >= products.get(i + 1).getMatchPercent(),
                        "Kết quả phải sắp xếp giảm dần theo matchPercent");
            }
        }

        @Test
        @DisplayName("3.5 Trả về tối đa 10 sản phẩm dù database có hơn 10 sản phẩm khớp")
        void whenMoreThan10Matches_thenLimitTo10() {
            MockMultipartFile file = new MockMultipartFile("image", "laptop.jpg", "image/jpeg", "data".getBytes());

            // Tạo 15 sản phẩm Laptop
            List<Product> manyProducts = new ArrayList<>();
            for (int i = 1; i <= 15; i++) {
                ProductVariant v = ProductVariant.builder()
                        .id((long) (i * 100)).sku("SKU-" + i)
                        .price(new BigDecimal("10000000")).stock(5).status(true).build();
                manyProducts.add(Product.builder()
                        .id((long) i).name("Laptop Model " + i).brand("Brand")
                        .category(categoryLaptop).status("ACTIVE").isDeleted(false)
                        .price(new BigDecimal("10000000")).variants(List.of(v))
                        .build());
            }

            when(productRepository.findAllActiveForSearch()).thenReturn(manyProducts);
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertTrue(response.getProducts().size() <= 10,
                    "Kết quả phải giới hạn tối đa 10 sản phẩm");
        }

        @Test
        @DisplayName("3.6 Trả về matchReason mô tả tiếng Việt rõ ràng")
        void whenProductMatched_thenMatchReasonContainsVietnamese() {
            MockMultipartFile file = new MockMultipartFile("image", "macbook-pro.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertFalse(response.getProducts().isEmpty());
            String reason = response.getProducts().get(0).getMatchReason();
            assertNotNull(reason);
            assertFalse(reason.isBlank());
            // matchReason phải chứa mô tả tiếng Việt
            assertTrue(reason.contains("Khớp") || reason.contains("Trùng") || reason.contains("Gợi ý"),
                    "matchReason phải mô tả bằng tiếng Việt");
        }
    }

    // ====================================================================
    //  NHÓM 4: VARIANT GIÁ TỐT NHẤT
    // ====================================================================
    @Nested
    @DisplayName("4. Chọn Variant giá tốt nhất (bestVariant)")
    class BestVariantSelection {

        @Test
        @DisplayName("4.1 Chọn variant active + còn hàng có giá thấp nhất")
        void whenMultipleVariants_thenSelectCheapestInStock() {
            // Tạo 2 variant: giá cao còn hàng, giá thấp còn hàng
            ProductVariant expensive = ProductVariant.builder()
                    .id(1L).sku("V1").price(new BigDecimal("50000000")).stock(5).status(true).build();
            ProductVariant cheap = ProductVariant.builder()
                    .id(2L).sku("V2").price(new BigDecimal("40000000")).stock(3).status(true).build();

            Product product = Product.builder()
                    .id(1L).name("MacBook Pro Test").brand("Apple")
                    .category(categoryLaptop).status("ACTIVE").isDeleted(false)
                    .price(new BigDecimal("45000000"))
                    .variants(List.of(expensive, cheap))
                    .build();

            ProductVariantResponse cheapResponse = ProductVariantResponse.builder()
                    .id(2L).sku("V2").price(new BigDecimal("40000000")).build();

            MockMultipartFile file = new MockMultipartFile("image", "macbook.jpg", "image/jpeg", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(product));
            when(productMapper.toVariantResponse(cheap)).thenReturn(cheapResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertFalse(response.getProducts().isEmpty());
            assertNotNull(response.getProducts().get(0).getBestVariant());
            assertEquals(new BigDecimal("40000000"), response.getProducts().get(0).getBestVariant().getPrice());
        }

        @Test
        @DisplayName("4.2 Nếu tất cả variant hết hàng, chọn variant active có giá thấp nhất")
        void whenAllOutOfStock_thenSelectCheapestActive() {
            ProductVariant outOfStock1 = ProductVariant.builder()
                    .id(1L).sku("V1").price(new BigDecimal("50000000")).stock(0).status(true).build();
            ProductVariant outOfStock2 = ProductVariant.builder()
                    .id(2L).sku("V2").price(new BigDecimal("38000000")).stock(0).status(true).build();

            Product product = Product.builder()
                    .id(1L).name("Dell XPS Test").brand("Dell")
                    .category(categoryLaptop).status("ACTIVE").isDeleted(false)
                    .price(new BigDecimal("40000000"))
                    .variants(List.of(outOfStock1, outOfStock2))
                    .build();

            ProductVariantResponse cheaperResponse = ProductVariantResponse.builder()
                    .id(2L).sku("V2").price(new BigDecimal("38000000")).build();

            MockMultipartFile file = new MockMultipartFile("image", "dell-laptop.jpg", "image/jpeg", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(product));
            when(productMapper.toVariantResponse(outOfStock2)).thenReturn(cheaperResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertFalse(response.getProducts().isEmpty());
            assertNotNull(response.getProducts().get(0).getBestVariant());
            assertEquals(new BigDecimal("38000000"), response.getProducts().get(0).getBestVariant().getPrice());
        }

        @Test
        @DisplayName("4.3 Sản phẩm không có variant → bestVariant = null, dùng giá sản phẩm")
        void whenNoVariants_thenBestVariantNullAndUsesProductPrice() {
            Product noVariantProduct = Product.builder()
                    .id(1L).name("Laptop Giá Rẻ").brand("HP")
                    .category(categoryLaptop).status("ACTIVE").isDeleted(false)
                    .price(new BigDecimal("12000000"))
                    .variants(List.of())
                    .build();

            MockMultipartFile file = new MockMultipartFile("image", "laptop.jpg", "image/jpeg", "data".getBytes());
            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(noVariantProduct));

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertFalse(response.getProducts().isEmpty());
            assertNull(response.getProducts().get(0).getBestVariant());
            assertEquals(new BigDecimal("12000000"), response.getProducts().get(0).getPrice());
        }
    }

    // ====================================================================
    //  NHÓM 5: DATABASE TRỐNG & FALLBACK GỢI Ý
    // ====================================================================
    @Nested
    @DisplayName("5. Database trống & Cơ chế Fallback gợi ý")
    class EmptyDatabaseAndFallback {

        @Test
        @DisplayName("5.1 Database hoàn toàn trống → products = [], totalMatches = 0")
        void whenDatabaseEmpty_thenReturnEmptyProducts() {
            MockMultipartFile file = new MockMultipartFile("image", "macbook.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(Collections.emptyList());
            when(productRepository.findAll()).thenReturn(Collections.emptyList());

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertNotNull(response);
            assertNotNull(response.getDetectedAttributes());
            assertEquals(0, response.getTotalMatches());
            assertTrue(response.getProducts().isEmpty());
        }

        @Test
        @DisplayName("5.2 Không có sản phẩm khớp ngưỡng 15% → trả gợi ý với matchPercent = 25")
        void whenNoMatchAboveThreshold_thenReturnFeaturedRecommendations() {
            // Tìm Laptop Apple nhưng database chỉ có Tai nghe Sony
            MockMultipartFile file = new MockMultipartFile("image", "macbook.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(headphoneSony));

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertFalse(response.getProducts().isEmpty());
            assertEquals(25, response.getProducts().get(0).getMatchPercent());
            assertTrue(response.getProducts().get(0).getMatchReason().contains("Gợi ý"));
        }

        @Test
        @DisplayName("5.3 Tối đa 5 sản phẩm gợi ý khi không có sản phẩm nào khớp")
        void whenNoMatch_thenMaximum5Recommendations() {
            MockMultipartFile file = new MockMultipartFile("image", "random-image.jpg", "image/jpeg", "data".getBytes());

            // Tạo 10 sản phẩm hoàn toàn không liên quan
            List<Product> unrelated = new ArrayList<>();
            Category otherCat = Category.builder().id(99L).name("Phụ kiện khác").build();
            for (int i = 1; i <= 10; i++) {
                unrelated.add(Product.builder()
                        .id((long) i).name("Sản phẩm random " + i).brand("Unknown" + i)
                        .category(otherCat).status("ACTIVE").isDeleted(false)
                        .price(new BigDecimal("100000")).variants(List.of())
                        .build());
            }

            when(productRepository.findAllActiveForSearch()).thenReturn(unrelated);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertTrue(response.getProducts().size() <= 5,
                    "Gợi ý không được vượt quá 5 sản phẩm");
        }

        @Test
        @DisplayName("5.4 findAllActiveForSearch() lỗi → tự động fallback sang findAll()")
        void whenEntityGraphQueryFails_thenFallbackToFindAll() {
            MockMultipartFile file = new MockMultipartFile("image", "macbook.jpg", "image/jpeg", "data".getBytes());

            // Giả lập EntityGraph query ném exception
            when(productRepository.findAllActiveForSearch()).thenThrow(new RuntimeException("EntityGraph error"));
            when(productRepository.findAll()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertNotNull(response);
            assertFalse(response.getProducts().isEmpty());
            verify(productRepository).findAll();
        }
    }

    // ====================================================================
    //  NHÓM 6: CẤU TRÚC RESPONSE ĐẦU RA
    // ====================================================================
    @Nested
    @DisplayName("6. Cấu trúc Response đầu ra")
    class ResponseStructure {

        @Test
        @DisplayName("6.1 Response chứa đầy đủ detectedAttributes, totalMatches, products, provider")
        void whenSuccess_thenResponseHasAllFields() {
            MockMultipartFile file = new MockMultipartFile("image", "macbook.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertNotNull(response.getDetectedAttributes());
            assertNotNull(response.getDetectedAttributes().getCategory());
            assertNotNull(response.getDetectedAttributes().getBrand());
            assertNotNull(response.getDetectedAttributes().getColor());
            assertNotNull(response.getDetectedAttributes().getKeywords());
            assertNotNull(response.getTotalMatches());
            assertNotNull(response.getProducts());
            assertNotNull(response.getProvider());
        }

        @Test
        @DisplayName("6.2 totalMatches bằng đúng số lượng phần tử trong products")
        void whenSuccess_thenTotalMatchesEqualsProductsSize() {
            MockMultipartFile file = new MockMultipartFile("image", "macbook.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple, laptopDell));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertEquals(response.getProducts().size(), response.getTotalMatches());
        }

        @Test
        @DisplayName("6.3 Mỗi ProductItem chứa đủ id, name, brand, categoryName, price, matchPercent")
        void whenSuccess_thenEachProductItemComplete() {
            MockMultipartFile file = new MockMultipartFile("image", "macbook.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertFalse(response.getProducts().isEmpty());
            VisualSearchProductItem item = response.getProducts().get(0);
            assertNotNull(item.getId());
            assertNotNull(item.getName());
            assertNotNull(item.getBrand());
            assertNotNull(item.getCategoryName());
            assertNotNull(item.getPrice());
            assertNotNull(item.getMatchPercent());
            assertNotNull(item.getMatchReason());
            assertTrue(item.getMatchPercent() >= 0 && item.getMatchPercent() <= 100);
        }

        @Test
        @DisplayName("6.4 Provider hiển thị 'NEXOR Smart Fallback' khi chưa có Gemini API Key")
        void whenNoApiKey_thenProviderIsFallback() {
            MockMultipartFile file = new MockMultipartFile("image", "test.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertEquals("NEXOR Smart Fallback", response.getProvider());
        }
    }

    // ====================================================================
    //  NHÓM 7: SO KHỚP MÀU SẮC QUA OPTION VALUES CỦA VARIANT
    // ====================================================================
    @Nested
    @DisplayName("7. So khớp Màu sắc qua Option Values của Variant")
    class ColorMatchingViaOptionValues {

        @Test
        @DisplayName("7.1 Khớp màu sắc qua OptionValue của variant (+10% matchPercent)")
        void whenColorMatchesInOptionValue_thenScoreIncludes10Percent() {
            // Tạo OptionValue có màu "Đen"
            ProductOptionValue colorOption = ProductOptionValue.builder()
                    .id(1L).value("Đen").position(0).build();

            ProductVariant variantWithColor = ProductVariant.builder()
                    .id(1L).sku("SP-DEN").price(new BigDecimal("10000000")).stock(5).status(true)
                    .optionValues(List.of(colorOption))
                    .build();

            // Tạo sản phẩm mô tả KHÔNG chứa "đen" nhưng variant có OptionValue "Đen"
            Product productWithColorVariant = Product.builder()
                    .id(10L).name("Samsung Galaxy S24 Ultra").brand("Samsung")
                    .description("Điện thoại Samsung cao cấp")
                    .category(categoryPhone).status("ACTIVE").isDeleted(false)
                    .price(new BigDecimal("25000000"))
                    .variants(List.of(variantWithColor))
                    .build();

            // Fallback với tên file samsung → detect Điện thoại + Samsung + color "Đen / Bạc"
            MockMultipartFile file = new MockMultipartFile("image", "samsung-galaxy.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenReturn(List.of(productWithColorVariant));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            assertFalse(response.getProducts().isEmpty());
            // Phải có matchPercent > 35+35 = 70 nếu khớp cả danh mục + brand + color
            VisualSearchProductItem item = response.getProducts().get(0);
            assertTrue(item.getMatchPercent() >= 70);
        }
    }

    // ====================================================================
    //  NHÓM 8: SẢN PHẨM BỊ XÓA MỀM & INACTIVE PHẢI BỊ LOẠI
    // ====================================================================
    @Nested
    @DisplayName("8. Loại bỏ sản phẩm bị xóa mềm hoặc Inactive")
    class FilterDeletedAndInactive {

        @Test
        @DisplayName("8.1 Sản phẩm isDeleted=true không xuất hiện trong kết quả (qua findAll fallback)")
        void whenProductDeleted_thenExcludedFromResults() {
            Product deletedProduct = Product.builder()
                    .id(99L).name("MacBook Cũ Đã Xóa").brand("Apple")
                    .category(categoryLaptop).status("ACTIVE").isDeleted(true)
                    .price(new BigDecimal("30000000")).variants(List.of())
                    .build();

            MockMultipartFile file = new MockMultipartFile("image", "macbook.jpg", "image/jpeg", "data".getBytes());

            // findAllActiveForSearch ném lỗi → dùng findAll
            when(productRepository.findAllActiveForSearch()).thenThrow(new RuntimeException("err"));
            when(productRepository.findAll()).thenReturn(List.of(deletedProduct, laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            // Sản phẩm bị xóa phải bị loại khỏi kết quả
            boolean containsDeleted = response.getProducts().stream()
                    .anyMatch(p -> p.getId().equals(99L));
            assertFalse(containsDeleted, "Sản phẩm bị xóa mềm không được xuất hiện trong kết quả");
        }

        @Test
        @DisplayName("8.2 Sản phẩm status='INACTIVE' không xuất hiện trong kết quả (qua findAll fallback)")
        void whenProductInactive_thenExcludedFromResults() {
            Product inactiveProduct = Product.builder()
                    .id(98L).name("MacBook Pro Tạm Ẩn").brand("Apple")
                    .category(categoryLaptop).status("INACTIVE").isDeleted(false)
                    .price(new BigDecimal("40000000")).variants(List.of())
                    .build();

            MockMultipartFile file = new MockMultipartFile("image", "macbook.jpg", "image/jpeg", "data".getBytes());

            when(productRepository.findAllActiveForSearch()).thenThrow(new RuntimeException("err"));
            when(productRepository.findAll()).thenReturn(List.of(inactiveProduct, laptopApple));
            when(productMapper.toVariantResponse(any(ProductVariant.class))).thenReturn(mockVariantResponse);

            VisualSearchResponse response = visualSearchService.searchByImage(file);

            boolean containsInactive = response.getProducts().stream()
                    .anyMatch(p -> p.getId().equals(98L));
            assertFalse(containsInactive, "Sản phẩm INACTIVE không được xuất hiện trong kết quả");
        }
    }
}
