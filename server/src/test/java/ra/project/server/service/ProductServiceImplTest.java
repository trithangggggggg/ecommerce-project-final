package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.dto.response.ProductVariantResponse;
import ra.project.server.model.entity.*;
import ra.project.server.repository.CategoryRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.impl.ProductServiceImpl;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

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
        // Setup options
        ProductOption optStorage = ProductOption.builder().id(1L).product(testProduct).name("Dung lượng").position(0).build();
        ProductOptionValue v256 = ProductOptionValue.builder().id(11L).option(optStorage).value("256GB").position(0).build();
        ProductOptionValue v512 = ProductOptionValue.builder().id(12L).option(optStorage).value("512GB").position(1).build();
        optStorage.setValues(List.of(v256, v512));
        testProduct.getOptions().add(optStorage);

        // Setup variants
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

        // Setup specs
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
        assertEquals(25, response.getStock()); // 15 + 10 = 25
        assertNotNull(response.getVariants());
        assertEquals(2, response.getVariants().size());

        // Check variant 1 discount calculation (31.990.000 -> 28.490.000: diff 3.500.000 = ~11%)
        ProductVariantResponse v1Resp = response.getVariants().get(0);
        assertEquals("IPAD-256", v1Resp.getSku());
        assertEquals(11, v1Resp.getDiscountPercent());
        assertEquals("256GB", v1Resp.getTitle());
        assertEquals("256GB", v1Resp.getOptionValues().get("Dung lượng"));

        // Check specs
        assertNotNull(response.getSpecs());
        assertEquals(1, response.getSpecs().size());
        assertEquals("Kích thước", response.getSpecs().get(0).getSpecKey());
    }
}
