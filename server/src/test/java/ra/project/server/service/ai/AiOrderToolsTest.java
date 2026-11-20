package ra.project.server.service.ai;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ra.project.server.model.dto.OrderDraft;
import ra.project.server.model.dto.response.OrderPreviewDto;
import ra.project.server.model.entity.Product;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.OrderDraftService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiOrderToolsTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderDraftService orderDraftService;

    @InjectMocks
    private AiOrderTools aiOrderTools;

    private Product iphone16;
    private Product iphone15;

    @BeforeEach
    void setUp() {
        iphone16 = Product.builder()
                .id(1L)
                .name("iPhone 16 Pro Max 256GB Titan Tự Nhiên")
                .price(BigDecimal.valueOf(34990000))
                .stock(50)
                .status("ACTIVE")
                .build();

        iphone15 = Product.builder()
                .id(2L)
                .name("iPhone 15 Pro 128GB Titan Đen (Black Titanium)")
                .price(BigDecimal.valueOf(25990000))
                .stock(35)
                .status("ACTIVE")
                .build();
    }

    @Test
    @DisplayName("Chuẩn bị đơn hàng thành công khi khách đặt iPhone và làm sạch tên/địa chỉ")
    void testPrepareOrder_CleansSalutationAndAddress_Success() {
        when(productRepository.findAll()).thenReturn(List.of(iphone16, iphone15));
        when(orderDraftService.saveDraft(any(OrderDraft.class))).thenAnswer(i -> i.getArgument(0));

        String result = aiOrderTools.prepareOrder(
                "iPhone 15 Pro Max",
                1,
                "cho anh Nam SĐT",
                "0912345678",
                "Tôi muốn đặt 1 chiếc iPhone 15 Pro Max về 123 Cầu Giấy cho anh Nam SĐT",
                null,
                null // Khách chưa nói hình thức thanh toán -> mặc định COD
        );

        assertNotNull(result);
        assertTrue(result.contains("Đã tạo bản thảo đơn hàng thành công"));
        assertTrue(result.contains("Nam"));

        OrderPreviewDto preview = aiOrderTools.getAndClearCurrentDraft();
        assertNotNull(preview);
        assertEquals("Nam", preview.getReceiverName());
        assertEquals("0912345678", preview.getPhoneNumber());
        assertEquals("123 Cầu Giấy", preview.getShippingAddress());
        assertEquals(PaymentMethod.COD, preview.getPaymentMethod());
        assertEquals(1, preview.getQuantity());

        verify(orderDraftService, times(1)).saveDraft(any(OrderDraft.class));
    }

    @Test
    @DisplayName("Chuẩn bị đơn hàng thành công với phương thức VietQR Online")
    void testPrepareOrder_WithVietQr_Success() {
        when(productRepository.findAll()).thenReturn(List.of(iphone16, iphone15));
        when(orderDraftService.saveDraft(any(OrderDraft.class))).thenAnswer(i -> i.getArgument(0));

        String result = aiOrderTools.prepareOrder(
                "iPhone 16 Pro Max",
                2,
                "Nguyễn Văn An",
                "0988776655",
                "Số 10 ngõ 5 Hoàng Hoa Thám, Hà Nội",
                "Giao giờ hành chính",
                "VIETQR"
        );

        assertNotNull(result);
        assertTrue(result.contains("Đã tạo bản thảo đơn hàng thành công"));

        OrderPreviewDto preview = aiOrderTools.getAndClearCurrentDraft();
        assertNotNull(preview);
        assertEquals("Nguyễn Văn An", preview.getReceiverName());
        assertEquals(PaymentMethod.SEPAY, preview.getPaymentMethod());
        assertEquals(2, preview.getQuantity());
        assertEquals(BigDecimal.valueOf(69980000), preview.getTotalAmount());
    }

    @Test
    @DisplayName("Từ chối khi số điện thoại không hợp lệ")
    void testPrepareOrder_InvalidPhoneNumber() {
        String result = aiOrderTools.prepareOrder(
                "iPhone 16 Pro Max",
                1,
                "Nguyễn Văn A",
                "12345",
                "123 Cầu Giấy",
                null,
                "COD"
        );

        assertTrue(result.contains("không hợp lệ"));
        assertNull(aiOrderTools.getAndClearCurrentDraft());
        verify(orderDraftService, never()).saveDraft(any());
    }
}
