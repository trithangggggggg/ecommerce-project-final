package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.dto.request.FlashSaleRequest;
import ra.project.server.model.dto.response.FlashSaleResponse;
import ra.project.server.model.entity.FlashSale;
import ra.project.server.model.entity.FlashSaleItem;
import ra.project.server.model.entity.Product;
import ra.project.server.repository.FlashSaleRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.impl.FlashSaleServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: FlashSaleServiceImpl")
class FlashSaleServiceImplTest {

    @Mock
    private FlashSaleRepository flashSaleRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private FlashSaleServiceImpl flashSaleService;

    private Product product;
    private FlashSale liveFlashSale;

    @BeforeEach
    void setUp() {
        product = Product.builder()
                .id(10L)
                .name("MacBook Pro M4")
                .brand("Apple")
                .price(BigDecimal.valueOf(40_000_000))
                .imageUrl("/mbp.jpg")
                .build();

        liveFlashSale = FlashSale.builder()
                .id(1L)
                .title("Flash Sale Cuối Tuần")
                .badgeText("GIỜ VÀNG")
                .startTime(LocalDateTime.now().minusHours(1))
                .endTime(LocalDateTime.now().plusHours(2))
                .isActive(true)
                .items(new ArrayList<>())
                .build();

        liveFlashSale.getItems().add(FlashSaleItem.builder()
                .id(100L)
                .flashSale(liveFlashSale)
                .product(product)
                .originalPrice(BigDecimal.valueOf(40_000_000))
                .salePrice(BigDecimal.valueOf(36_000_000))
                .stockLimit(10)
                .soldCount(3)
                .displayOrder(1)
                .build());
    }

    @Test
    @DisplayName("getCurrentFlashSale trả về chương trình LIVE cùng phần trăm giảm và thời gian còn lại")
    void getCurrentFlashSale_returnsLiveDeal() {
        when(flashSaleRepository.findActiveFlashSales(any(LocalDateTime.class)))
                .thenReturn(List.of(liveFlashSale));

        FlashSaleResponse res = flashSaleService.getCurrentFlashSale();

        assertNotNull(res);
        assertEquals("LIVE", res.getRuntimeStatus());
        assertTrue(res.getRemainingSeconds() > 0);
        assertEquals(1, res.getItems().size());
        assertEquals(10, res.getItems().get(0).getDiscountPercent());
        assertEquals(7, res.getItems().get(0).getRemainingStock());
    }

    @Test
    @DisplayName("getCurrentFlashSale trả về null khi không có chương trình đang chạy")
    void getCurrentFlashSale_empty_returnsNull() {
        when(flashSaleRepository.findActiveFlashSales(any(LocalDateTime.class))).thenReturn(List.of());
        assertNull(flashSaleService.getCurrentFlashSale());
    }

    @Test
    @DisplayName("createFlashSale validate thời gian kết thúc sau thời gian bắt đầu và gắn đúng sản phẩm")
    void createFlashSale_successAndValidation() {
        FlashSaleRequest invalid = FlashSaleRequest.builder()
                .title("Sale lỗi giờ")
                .startTime(LocalDateTime.now().plusHours(3))
                .endTime(LocalDateTime.now().plusHours(1))
                .build();
        assertThrows(BadRequestException.class, () -> flashSaleService.createFlashSale(invalid));

        FlashSaleRequest valid = FlashSaleRequest.builder()
                .title("Flash Sale Mới")
                .startTime(LocalDateTime.now().plusHours(1))
                .endTime(LocalDateTime.now().plusHours(5))
                .items(List.of(FlashSaleRequest.FlashSaleItemRequest.builder()
                        .productId(10L)
                        .salePrice(BigDecimal.valueOf(35_000_000))
                        .stockLimit(15)
                        .build()))
                .build();

        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(flashSaleRepository.save(any(FlashSale.class))).thenAnswer(inv -> {
            FlashSale fs = inv.getArgument(0);
            fs.setId(5L);
            return fs;
        });

        FlashSaleResponse created = flashSaleService.createFlashSale(valid);
        assertEquals(5L, created.getId());
        assertEquals("UPCOMING", created.getRuntimeStatus());
        assertEquals(1, created.getItemCount());
    }

    @Test
    @DisplayName("getFlashSaleById ném ResourceNotFoundException nếu không tìm thấy")
    void getFlashSaleById_notFound() {
        when(flashSaleRepository.findWithItemsById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> flashSaleService.getFlashSaleById(99L));
    }
}

