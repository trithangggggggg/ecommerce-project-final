package ra.project.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.model.dto.request.OptionRequest;
import ra.project.server.model.dto.request.ProductRequest;
import ra.project.server.model.dto.request.VariantRequest;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.dto.response.ProductVariantResponse;
import ra.project.server.service.ProductService;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminProductControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private ProductService productService;

    @InjectMocks
    private AdminProductController adminProductController;

    private ProductResponse mockProductResponse;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders
                .standaloneSetup(adminProductController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        mockProductResponse = ProductResponse.builder()
                .id(1L)
                .name("iPhone 16 Pro Max")
                .brand("Apple")
                .price(new BigDecimal("34990000"))
                .minPrice(new BigDecimal("34990000"))
                .maxPrice(new BigDecimal("46990000"))
                .stock(50)
                .status(true)
                .categoryId(1L)
                .categoryName("Điện thoại")
                .variants(List.of(
                        ProductVariantResponse.builder()
                                .id(101L)
                                .sku("IP16PM-256-DESERT")
                                .price(new BigDecimal("34990000"))
                                .stock(30)
                                .status(true)
                                .build()
                ))
                .build();
    }

    @Test
    @DisplayName("Admin lấy danh sách sản phẩm phân trang & tìm kiếm (kể cả sản phẩm tạm ngừng)")
    void testGetAllAdminProducts_Success() throws Exception {
        PageResponse<ProductResponse> pageResponse = PageResponse.<ProductResponse>builder()
                .content(List.of(mockProductResponse))
                .pageNumber(0)
                .pageSize(10)
                .totalElements(1L)
                .totalPages(1)
                .last(true)
                .build();

        when(productService.getAllAdminProducts(any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(pageResponse);

        mockMvc.perform(get("/api/admin/products")
                        .param("keyword", "iPhone")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].name").value("iPhone 16 Pro Max"))
                .andExpect(jsonPath("$.data.content[0].stock").value(50));
    }

    @Test
    @DisplayName("Admin lấy chi tiết một sản phẩm theo ID")
    void testGetAdminProductById_Success() throws Exception {
        when(productService.getProductById(1L)).thenReturn(mockProductResponse);

        mockMvc.perform(get("/api/admin/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("iPhone 16 Pro Max"));
    }

    @Test
    @DisplayName("Admin tạo mới sản phẩm với Master + Variants an toàn trong 1 transaction")
    void testCreateProduct_Success() throws Exception {
        ProductRequest request = ProductRequest.builder()
                .name("Samsung Galaxy S24 Ultra")
                .categoryId(1L)
                .brand("Samsung")
                .options(List.of(
                        OptionRequest.builder().name("Màu sắc").values(List.of("Xám Titan", "Đen Titan")).build()
                ))
                .variants(List.of(
                        VariantRequest.builder()
                                .sku("SS-S24U-256-GRAY")
                                .price(new BigDecimal("29990000"))
                                .stock(20)
                                .optionValues(Map.of("Màu sắc", "Xám Titan"))
                                .build()
                ))
                .build();

        when(productService.createProduct(any(ProductRequest.class))).thenReturn(mockProductResponse);

        mockMvc.perform(post("/api/admin/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("iPhone 16 Pro Max"));
    }

    @Test
    @DisplayName("Admin cập nhật thông tin sản phẩm và các biến thể")
    void testUpdateProduct_Success() throws Exception {
        ProductRequest request = ProductRequest.builder()
                .name("iPhone 16 Pro Max Updated")
                .categoryId(1L)
                .variants(List.of(
                        VariantRequest.builder()
                                .sku("IP16PM-256-DESERT")
                                .price(new BigDecimal("33990000"))
                                .stock(40)
                                .build()
                ))
                .build();

        when(productService.updateProduct(eq(1L), any(ProductRequest.class))).thenReturn(mockProductResponse);

        mockMvc.perform(put("/api/admin/products/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Admin bật/tắt trạng thái kinh doanh (status toggle)")
    void testToggleProductStatus_Success() throws Exception {
        mockProductResponse.setStatus(false);
        when(productService.toggleProductStatus(eq(1L), eq(false))).thenReturn(mockProductResponse);

        mockMvc.perform(patch("/api/admin/products/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value(false));
    }

    @Test
    @DisplayName("Admin xóa mềm sản phẩm (is_deleted=true)")
    void testDeleteProduct_Success() throws Exception {
        doNothing().when(productService).deleteProduct(1L);

        mockMvc.perform(delete("/api/admin/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(productService).deleteProduct(1L);
    }

    @Test
    @DisplayName("Admin cập nhật tồn kho biến thể SKU")
    void testUpdateVariantStock_Success() throws Exception {
        ProductVariantResponse variantResponse = ProductVariantResponse.builder()
                .id(101L)
                .sku("IP16PM-256-DESERT")
                .stock(45)
                .build();

        when(productService.updateVariantStock(eq(101L), eq(45), eq(false))).thenReturn(variantResponse);

        mockMvc.perform(put("/api/admin/products/variants/101/stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stock\": 45, \"isDelta\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.stock").value(45));
    }
}

