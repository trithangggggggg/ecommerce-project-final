package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.DisplayName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.request.*;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.dto.response.ProductVariantResponse;
import ra.project.server.model.entity.*;
import ra.project.server.repository.*;
import ra.project.server.service.impl.ProductServiceImpl;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductOptionRepository productOptionRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Spy
    private ProductMapper productMapper = new ProductMapper();

    @InjectMocks
    private ProductServiceImpl productService;

    private Product testProduct;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        testCategory = Category.builder()
                .id(1L)
                .name("Máy tính bảng")
                .build();

        testProduct = Product.builder()
                .id(10L)
                .name("iPad Pro 11 inch M4")
                .description("Tuyệt tác mỏng nhẹ")
                .price(new BigDecimal("28490000"))
                .stock(25)
                .imageUrl("https://example.com/ipad.jpg")
                .category(testCategory)
                .status(true)
                .options(new ArrayList<>())
                .variants(new ArrayList<>())
                .specs(new ArrayList<>())
                .images(new ArrayList<>())
                .build();
    }

    @Test
    void whenGetProductById_withoutVariants_thenReturnDefaultPrice() {
        when(productRepository.findById(10L)).thenReturn(Optional.of(testProduct));

        ProductResponse response = productService.getProductById(10L);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals("iPad Pro 11 inch M4", response.getName());
        assertEquals(new BigDecimal("28490000"), response.getPrice());
        assertEquals(new BigDecimal("28490000"), response.getMinPrice());
        assertEquals(new BigDecimal("28490000"), response.getMaxPrice());
        assertEquals(25, response.getStock());
    }

    @Test
    void whenGetProductById_withVariants_thenReturnDetailedVariantsAndMinPrice() {
        ProductOption optStorage = ProductOption.builder().id(1L).product(testProduct).name("Dung lượng").position(0).build();
        ProductOptionValue v256 = ProductOptionValue.builder().id(11L).option(optStorage).value("256GB").position(0).build();
        ProductOptionValue v512 = ProductOptionValue.builder().id(12L).option(optStorage).value("512GB").position(1).build();
        optStorage.setValues(List.of(v256, v512));
        testProduct.getOptions().add(optStorage);

        ProductVariant var1 = ProductVariant.builder()
                .id(101L)
                .product(testProduct)
                .sku("IPAD-256")
                .price(new BigDecimal("28490000"))
                .originalPrice(new BigDecimal("31990000"))
                .stock(15)
                .status(true)
                .optionValues(List.of(v256))
                .build();

        ProductVariant var2 = ProductVariant.builder()
                .id(102L)
                .product(testProduct)
                .sku("IPAD-512")
                .price(new BigDecimal("34490000"))
                .originalPrice(new BigDecimal("37990000"))
                .stock(10)
                .status(true)
                .optionValues(List.of(v512))
                .build();

        testProduct.getVariants().add(var1);
        testProduct.getVariants().add(var2);

        testProduct.getSpecs().add(ProductSpec.builder()
                .id(1L)
                .product(testProduct)
                .groupName("Màn hình")
                .specKey("Kích thước")
                .specValue("11 inch OLED")
                .build());

        when(productRepository.findById(10L)).thenReturn(Optional.of(testProduct));

        ProductResponse response = productService.getProductById(10L);

        assertNotNull(response);
        assertEquals(new BigDecimal("28490000"), response.getMinPrice());
        assertEquals(new BigDecimal("34490000"), response.getMaxPrice());
        assertEquals(25, response.getStock());
        assertNotNull(response.getVariants());
        assertEquals(2, response.getVariants().size());

        ProductVariantResponse v1Resp = response.getVariants().get(0);
        assertEquals("IPAD-256", v1Resp.getSku());
        assertEquals(11, v1Resp.getDiscountPercent());
        assertEquals("256GB", v1Resp.getTitle());
        assertEquals("256GB", v1Resp.getOptionValues().get("Dung lượng"));

        assertNotNull(response.getSpecs());
        assertEquals(1, response.getSpecs().size());
        assertEquals("Kích thước", response.getSpecs().get(0).getSpecKey());
    }

    @Test
    void whenCreateProduct_withVariantsAndOptions_thenSuccess() {
        ProductRequest request = ProductRequest.builder()
                .name("iPad Air M2")
                .description("Siêu mạnh mẽ")
                .categoryId(1L)
                .options(List.of(
                        OptionRequest.builder().name("Dung lượng").values(List.of("128GB", "256GB")).build()
                ))
                .variants(List.of(
                        VariantRequest.builder()
                                .sku("AIR-M2-128")
                                .optionValues(Map.of("Dung lượng", "128GB"))
                                .price(new BigDecimal("16990000"))
                                .originalPrice(new BigDecimal("18990000"))
                                .stock(20)
                                .build(),
                        VariantRequest.builder()
                                .sku("AIR-M2-256")
                                .optionValues(Map.of("Dung lượng", "256GB"))
                                .price(new BigDecimal("19990000"))
                                .originalPrice(new BigDecimal("21990000"))
                                .stock(10)
                                .build()
                ))
                .specs(List.of(
                        SpecRequest.builder().group("Hiệu năng").key("Chip").value("Apple M2").build()
                ))
                .build();

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(testCategory));
        when(productRepository.existsByNameIgnoreCase("iPad Air M2")).thenReturn(false);
        when(productVariantRepository.findBySkuIgnoreCase(anyString())).thenReturn(Optional.empty());

        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product p = invocation.getArgument(0);
            if (p.getId() == null) p.setId(20L);
            return p;
        });

        ProductResponse response = productService.createProduct(request);

        assertNotNull(response);
        assertEquals(20L, response.getId());
        assertEquals("iPad Air M2", response.getName());
        assertEquals(new BigDecimal("16990000"), response.getMinPrice());
        assertEquals(new BigDecimal("19990000"), response.getMaxPrice());
        assertEquals(30, response.getStock());
        assertEquals(2, response.getVariants().size());
        assertEquals(1, response.getOptions().size());
        assertEquals(1, response.getSpecs().size());
    }

    @Test
    void whenCreateProduct_withDuplicateSkuInRequest_thenThrowsBadRequestException() {
        ProductRequest request = ProductRequest.builder()
                .name("iPhone 16")
                .categoryId(1L)
                .variants(List.of(
                        VariantRequest.builder().sku("IP16-BLACK").price(new BigDecimal("22000000")).stock(5).build(),
                        VariantRequest.builder().sku("IP16-BLACK").price(new BigDecimal("23000000")).stock(5).build()
                ))
                .build();

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(testCategory));
        when(productRepository.existsByNameIgnoreCase("iPhone 16")).thenReturn(false);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> productService.createProduct(request));
        assertTrue(ex.getMessage().contains("bị trùng lặp"));
    }

    @Test
    void whenCreateProduct_withOriginalPriceLowerThanPrice_thenThrowsBadRequestException() {
        ProductRequest request = ProductRequest.builder()
                .name("MacBook Neo")
                .categoryId(1L)
                .variants(List.of(
                        VariantRequest.builder()
                                .sku("MAC-NEO")
                                .price(new BigDecimal("30000000"))
                                .originalPrice(new BigDecimal("25000000"))
                                .stock(5)
                                .build()
                ))
                .build();

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(testCategory));
        when(productRepository.existsByNameIgnoreCase("MacBook Neo")).thenReturn(false);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> productService.createProduct(request));
        assertTrue(ex.getMessage().contains("Giá gốc phải lớn hơn hoặc bằng giá bán"));
    }

    @Test
    void whenCreateProduct_withDuplicateOptionCombination_thenThrowsBadRequestException() {
        ProductRequest request = ProductRequest.builder()
                .name("Magic Mouse 3")
                .categoryId(1L)
                .variants(List.of(
                        VariantRequest.builder()
                                .sku("MM-BLK-1")
                                .optionValues(Map.of("Màu sắc", "Đen"))
                                .price(new BigDecimal("2000000"))
                                .stock(5)
                                .build(),
                        VariantRequest.builder()
                                .sku("MM-BLK-2")
                                .optionValues(Map.of("Màu sắc", "Đen"))
                                .price(new BigDecimal("2100000"))
                                .stock(5)
                                .build()
                ))
                .build();

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(testCategory));
        when(productRepository.existsByNameIgnoreCase("Magic Mouse 3")).thenReturn(false);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> productService.createProduct(request));
        assertTrue(ex.getMessage().contains("Tổ hợp tùy chọn"));
    }

    @Test
    void whenCreateProduct_withoutVariants_thenCreatesDefaultVariant() {
        ProductRequest request = ProductRequest.builder()
                .name("Củ sạc 20W")
                .categoryId(1L)
                .price(new BigDecimal("500000"))
                .stock(50)
                .build();

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(testCategory));
        when(productRepository.existsByNameIgnoreCase("Củ sạc 20W")).thenReturn(false);
        when(productVariantRepository.existsBySkuIgnoreCase(anyString())).thenReturn(false);

        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product p = invocation.getArgument(0);
            if (p.getId() == null) p.setId(30L);
            return p;
        });

        ProductResponse response = productService.createProduct(request);

        assertNotNull(response);
        assertEquals(1, response.getVariants().size());
        assertEquals(new BigDecimal("500000"), response.getPrice());
        assertEquals(50, response.getStock());
    }

    @Test
    void whenUpdateProduct_preserveOrderedVariant_softDisables() {
        // testProduct currently has 1 variant (varOld) with orders
        ProductVariant varOld = ProductVariant.builder()
                .id(999L)
                .product(testProduct)
                .sku("OLD-SKU")
                .price(new BigDecimal("20000000"))
                .stock(5)
                .status(true)
                .build();
        testProduct.getVariants().add(varOld);

        ProductRequest updateRequest = ProductRequest.builder()
                .name("iPad Pro 11 inch M4")
                .categoryId(1L)
                .variants(List.of(
                        VariantRequest.builder()
                                .sku("NEW-SKU")
                                .price(new BigDecimal("29000000"))
                                .stock(10)
                                .build()
                ))
                .build();

        when(productRepository.findById(10L)).thenReturn(Optional.of(testProduct));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(testCategory));
        when(productRepository.existsByNameIgnoreCaseAndIdNot("iPad Pro 11 inch M4", 10L)).thenReturn(false);
        when(productVariantRepository.findBySkuIgnoreCase("NEW-SKU")).thenReturn(Optional.empty());
        when(orderItemRepository.existsByVariantId(999L)).thenReturn(true); // varOld has orders!

        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = productService.updateProduct(10L, updateRequest);

        assertNotNull(response);
        // The old variant should still exist in variants list, but with status=false
        Optional<ProductVariant> foundOld = testProduct.getVariants().stream().filter(v -> "OLD-SKU".equals(v.getSku())).findFirst();
        assertTrue(foundOld.isPresent());
        assertFalse(foundOld.get().getStatus());
    }

    // ==========================================
    // NHIỆM VỤ TEST_01: PHÂN TRANG, TÌM KIẾM, LỌC KẾT HỢP, DETAIL KHÔNG TỒN TẠI (404)
    // ==========================================

    @Test
    @DisplayName("TC_PROD_01: Lấy chi tiết sản phẩm không tồn tại -> Ném ResourceNotFoundException (404)")
    void whenGetProductById_notFound_thenThrowsResourceNotFoundException() {
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> productService.getProductById(999L));

        assertTrue(ex.getMessage().contains("Không tìm thấy sản phẩm với ID: 999"));
        verify(productRepository).findById(999L);
    }

    @Test
    @DisplayName("TC_PROD_02: Phân trang danh sách sản phẩm (Pagination) thành công")
    void whenGetAllProducts_withPagination_thenReturnPageResponse() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> mockPage = new PageImpl<>(List.of(testProduct), pageable, 1);

        when(productRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(mockPage);

        PageResponse<ProductResponse> response = productService.getAllProducts(null, null, null, true, pageable);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals(1, response.getTotalElements());
        assertEquals(0, response.getPageNumber());
        assertEquals(10, response.getPageSize());
        assertEquals("iPad Pro 11 inch M4", response.getContent().get(0).getName());
    }

    @Test
    @DisplayName("TC_PROD_03: Tìm kiếm sản phẩm theo từ khóa (Keyword search) thành công")
    void whenSearchProducts_withKeyword_thenReturnMatchingProducts() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> mockPage = new PageImpl<>(List.of(testProduct), pageable, 1);

        when(productRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(mockPage);

        PageResponse<ProductResponse> response = productService.searchProducts("iPad", null, null, null, null, true, pageable);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("iPad Pro 11 inch M4", response.getContent().get(0).getName());
    }

    @Test
    @DisplayName("TC_PROD_04: Lọc kết hợp nhiều tiêu chí (Keyword, Category, Brand, Price Range, Status)")
    void whenSearchProducts_withCombinedFilter_thenReturnFilteredPage() {
        Pageable pageable = PageRequest.of(0, 5);
        Page<Product> mockPage = new PageImpl<>(List.of(testProduct), pageable, 1);

        when(productRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(mockPage);

        PageResponse<ProductResponse> response = productService.searchProducts(
                "iPad",
                1L,
                "Apple",
                new BigDecimal("20000000"),
                new BigDecimal("35000000"),
                true,
                pageable
        );

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("iPad Pro 11 inch M4", response.getContent().get(0).getName());
        verify(productRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    @DisplayName("TC_PROD_05: Lọc với khoảng giá không hợp lệ (minPrice > maxPrice) -> Ném BadRequestException")
    void whenSearchProducts_withMinPriceGreaterThanMaxPrice_thenThrowsBadRequestException() {
        Pageable pageable = PageRequest.of(0, 10);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                productService.searchProducts(
                        null,
                        null,
                        null,
                        new BigDecimal("50000000"),
                        new BigDecimal("20000000"),
                        true,
                        pageable
                )
        );

        assertTrue(ex.getMessage().contains("Giá tối thiểu (minPrice) không được lớn hơn giá tối đa (maxPrice)"));
        verify(productRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }
}
