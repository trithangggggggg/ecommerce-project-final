package ra.project.server.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ra.project.server.exception.BadRequestException;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.OrderDraft;
import ra.project.server.model.dto.request.AiChatRequest;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.request.CheckoutRequest;
import ra.project.server.model.dto.response.AiChatResponse;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.model.dto.response.OrderPreviewDto;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.Product;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.model.enums.PaymentStatus;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.ai.AiOrderTools;
import ra.project.server.service.impl.AiServiceImpl;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductMapper productMapper;

    @Mock
    private KnowledgeBaseService knowledgeBaseService;

    @Mock
    private AiConfigService aiConfigService;

    @Mock
    private OrderService orderService;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderDraftService orderDraftService;

    @Mock
    private AiOrderTools aiOrderTools;

    @InjectMocks
    private AiServiceImpl aiService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(aiService, "orderService", orderService);
        ReflectionTestUtils.setField(aiService, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(aiService, "orderDraftService", orderDraftService);
        ReflectionTestUtils.setField(aiService, "aiOrderTools", aiOrderTools);
        ReflectionTestUtils.setField(aiService, "aiConfigService", aiConfigService);
    }

    @Test
    @DisplayName("TC_AI_01: Sinh mô tả SEO với đầy đủ name, brand, specs (dạng Map) và keywords")
    void whenGenerateDescription_withNameBrandSpecsMap_thenReturnsStructuredMarkdown() {
        AiGenerateDescriptionRequest request = AiGenerateDescriptionRequest.builder()
                .name("MacBook Pro M4 14 inch")
                .brand("Apple")
                .categoryName("Laptop cao cấp")
                .specs(Map.of(
                        "Chip", "Apple M4 Pro 12-core",
                        "RAM", "24GB Unified Memory",
                        "SSD", "512GB PCIe"))
                .keywords(List.of("macbook pro m4", "laptop apple", "đồ họa chuyên nghiệp"))
                .build();

        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);

        assertNotNull(response);
        assertEquals("MacBook Pro M4 14 inch", response.getProductName());
        assertEquals("Apple", response.getBrand());
        assertEquals("Laptop cao cấp", response.getCategoryName());
        assertNotNull(response.getDescription());

        String desc = response.getDescription();
        assertTrue(desc.contains("MacBook Pro M4 14 inch"), "Mô tả phải chứa tên sản phẩm");
        assertTrue(desc.contains("Apple"), "Mô tả phải chứa thương hiệu Apple");
        assertTrue(desc.contains("Điểm nổi bật"), "Mô tả phải có mục Điểm nổi bật");
        assertTrue(desc.contains("Thông số kỹ thuật"), "Mô tả phải có mục Thông số kỹ thuật");
        assertTrue(desc.contains("Đối tượng phù hợp"), "Mô tả phải có mục Đối tượng phù hợp");
        assertTrue(desc.contains("Chip") && desc.contains("Apple M4 Pro"));
        assertTrue(desc.contains("RAM") && desc.contains("24GB"));

        assertNotNull(response.getSeoTitle());
        assertTrue(response.getSeoTitle().contains("Apple"));
        assertTrue(response.getSeoTitle().contains("MacBook Pro M4 14 inch"));
        assertNotNull(response.getSeoKeywords());
        assertTrue(response.getSeoKeywords().contains("macbook pro m4"));
    }

    @Test
    @DisplayName("TC_AI_02: Sinh mô tả SEO với specs dạng danh sách List<Map>")
    void whenGenerateDescription_withSpecsList_thenFormatsCorrectly() {
        AiGenerateDescriptionRequest request = AiGenerateDescriptionRequest.builder()
                .name("iPhone 16 Pro")
                .brand("Apple")
                .categoryName("Điện thoại")
                .specs(List.of(
                        Map.of("group", "Màn hình", "key", "Kích thước", "value", "6.3 inch Super Retina XDR"),
                        Map.of("group", "Hiệu năng", "key", "Vi xử lý", "value", "A18 Pro")))
                .build();

        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);

        assertNotNull(response);
        String desc = response.getDescription();
        assertTrue(desc.contains("6.3 inch Super Retina XDR"));
        assertTrue(desc.contains("A18 Pro"));
        assertTrue(desc.contains("Thông số kỹ thuật"));
    }

    @Test
    @DisplayName("TC_AI_03: Ném BadRequestException khi tên sản phẩm rỗng")
    void whenGenerateDescription_withEmptyName_thenThrowsBadRequestException() {
        AiGenerateDescriptionRequest request = AiGenerateDescriptionRequest.builder()
                .name("   ")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> aiService.generateProductDescription(request));
        assertTrue(ex.getMessage().contains("không được để trống"));
    }

    @Test
    @DisplayName("TC_AI_05: Làm sạch code fences thừa ```markdown và ```")
    void testCleanMarkdownOutput_RemovesCodeFences() {
        String rawWithMarkdownFence = "```markdown\n## Tiêu đề bài viết\nNội dung chi tiết ở đây.\n```";
        String cleaned1 = aiService.cleanMarkdownOutput(rawWithMarkdownFence);
        assertFalse(cleaned1.startsWith("```"));
        assertFalse(cleaned1.endsWith("```"));
        assertTrue(cleaned1.startsWith("## Tiêu đề bài viết"));
        assertTrue(cleaned1.endsWith("Nội dung chi tiết ở đây."));

        String rawWithoutFence = "## Đỉnh Cao Công Nghệ\nNội dung không có fence.";
        String cleaned3 = aiService.cleanMarkdownOutput(rawWithoutFence);
        assertEquals(rawWithoutFence, cleaned3);
    }

    @Test
    @DisplayName("TC_AI_06: Khách hàng hỏi sản phẩm kho không có -> Fallback từ chối lịch sự")
    void whenCustomerAsksForOutOfStockLogitechMouse_thenBotDeclinesPolitely() {
        Product iphone = Product.builder()
                .id(1L)
                .name("iPhone 16 Pro Max 256GB Titan Tự Nhiên")
                .description("Flagship Apple")
                .price(BigDecimal.valueOf(34990000))
                .status("ACTIVE")
                .build();
        when(productRepository.findAll()).thenReturn(List.of(iphone));

        AiChatRequest request = AiChatRequest.builder()
                .message("tôi muốn mua chuột logitech")
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        assertNull(response.getCreatedOrder(), "Không được tự động tạo đơn hàng");
        assertTrue(response.getReply().contains("chưa kinh doanh") || response.getReply().contains("chưa có"),
                "Bot phải thông báo rằng shop chưa kinh doanh sản phẩm này");
    }

    @Test
    @DisplayName("TC_AI_07: confirmDraftOrder tạo đơn thật qua orderService và xóa draft")
    void whenConfirmDraftOrder_thenCallsOrderServiceAndRemovesDraft() {
        String draftId = "DRAFT-TEST-123";
        OrderDraft draft = OrderDraft.builder()
                .draftId(draftId)
                .productId(3L)
                .productName("ASUS ROG Strix G16")
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(36990000))
                .totalAmount(BigDecimal.valueOf(36990000))
                .receiverName("Nguyễn Trí Thắng")
                .phoneNumber("0333743206")
                .shippingAddress("Ngõ 33 Đồng Mới, Cự Khê, Thanh Oai, Hà Nội")
                .paymentMethod(PaymentMethod.COD)
                .build();

        when(orderDraftService.getDraft(draftId)).thenReturn(Optional.of(draft));

        OrderResponse mockOrder = OrderResponse.builder()
                .id(101L)
                .receiverName("Nguyễn Trí Thắng")
                .phoneNumber("0333743206")
                .shippingAddress("Ngõ 33 Đồng Mới, Cự Khê, Thanh Oai, Hà Nội")
                .totalAmount(BigDecimal.valueOf(36990000))
                .paymentMethod(PaymentMethod.COD)
                .status(OrderStatus.PENDING)
                .build();

        ArgumentCaptor<CheckoutRequest> captor = ArgumentCaptor.forClass(CheckoutRequest.class);
        when(orderService.createOrderForAiAssistant(captor.capture()))
                .thenReturn(ra.project.server.common.response.ApiResponse.success(mockOrder));

        OrderResponse result = aiService.confirmDraftOrder(draftId);

        assertNotNull(result);
        assertEquals(101L, result.getId());
        assertEquals("Nguyễn Trí Thắng", result.getReceiverName());

        CheckoutRequest passedReq = captor.getValue();
        assertEquals("Nguyễn Trí Thắng", passedReq.getReceiverName());
        assertEquals("0333743206", passedReq.getPhoneNumber());
        assertEquals(3L, passedReq.getItems().get(0).getProductId());

        verify(orderDraftService, times(1)).removeDraft(draftId);
    }

    @Test
    @DisplayName("TC_AI_08: confirmDraftOrder ném BadRequestException nếu draft không tồn tại hoặc đã hết hạn")
    void whenConfirmDraftOrder_notFound_thenThrowsBadRequestException() {
        String draftId = "DRAFT-EXPIRED";
        when(orderDraftService.getDraft(draftId)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> aiService.confirmDraftOrder(draftId));
        verify(orderService, never()).createOrderForAiAssistant(any());
    }

    @Test
    @DisplayName("TC_AI_09: cancelDraftOrder xóa đơn nháp khỏi OrderDraftService")
    void whenCancelDraftOrder_thenRemovesFromOrderDraftService() {
        String draftId = "DRAFT-TO-CANCEL";

        aiService.cancelDraftOrder(draftId);

        verify(orderDraftService, times(1)).removeDraft(draftId);
    }

    @Test
    @DisplayName("TC_AI_10: AiOrderTools validate tên chứa từ cấm ('tôi chưa thấy mã QR', 'thôi', 'hủy')")
    void testAiOrderTools_RejectsForbiddenReceiverNames() {
        AiOrderTools tools = new AiOrderTools(productRepository, orderRepository, orderDraftService);

        // Case 1: Tên là câu hỏi / nhầm lẫn mã QR
        String res1 = tools.prepareOrder("1", 1, "tôi chưa thấy mã QR", "0912345678", "Hà Đông Hà Nội", null, "COD");
        assertTrue(res1.contains("không hợp lệ") || res1.contains("nhầm lẫn"), "Phải từ chối tên chứa 'tôi', 'chưa', 'mã', 'qr'");

        // Case 2: Tên là câu đùa / trêu
        String res2 = tools.prepareOrder("1", 1, "thôi không mua nữa đâu", "0912345678", "Hà Đông Hà Nội", null, "COD");
        assertTrue(res2.contains("không hợp lệ") || res2.contains("nhầm lẫn"), "Phải từ chối tên chứa 'thôi', 'không'");

        // Case 3: Tên chứa từ "hủy"
        String res3 = tools.prepareOrder("1", 1, "Hủy đơn cho tôi", "0912345678", "Hà Đông Hà Nội", null, "COD");
        assertTrue(res3.contains("không hợp lệ") || res3.contains("nhầm lẫn"), "Phải từ chối tên chứa 'hủy'");
    }

    @Test
    @DisplayName("TC_AI_11: AiOrderTools prepareOrder thành công tạo OrderDraft với TTL 15 phút")
    void testAiOrderTools_PrepareOrder_Success() {
        Product rog = Product.builder()
                .id(3L)
                .name("Laptop Gaming ASUS ROG Strix G16 (2024)")
                .price(BigDecimal.valueOf(36990000))
                .stock(10)
                .status("ACTIVE")
                .build();
        when(productRepository.findById(3L)).thenReturn(Optional.of(rog));

        AiOrderTools tools = new AiOrderTools(productRepository, orderRepository, orderDraftService);

        String result = tools.prepareOrder(
                "3", 1, "nguyễn trí thắng", "0333743206", "HPC Landmark 105, La Khê, Hà Đông, Hà Nội", "Giao ban ngày", "COD"
        );

        assertNotNull(result);
        assertTrue(result.contains("thành công"));
        assertTrue(result.contains("DRAFT-"));

        OrderPreviewDto preview = tools.getAndClearCurrentDraft();
        assertNotNull(preview);
        assertEquals("Nguyễn Trí Thắng", preview.getReceiverName(), "Họ tên phải được viết hoa chữ cái đầu");
        assertEquals("0333743206", preview.getPhoneNumber());
        assertTrue(preview.isAwaitingConfirmation());
        assertNotNull(preview.getDraftId());

        verify(orderDraftService, times(1)).saveDraft(any());
    }

    @Test
    @DisplayName("TC_AI_12: AiOrderTools trackOrder tra cứu đơn theo ID hoặc SĐT")
    void testAiOrderTools_TrackOrder() {
        Order mockOrder = Order.builder()
                .id(24L)
                .receiverName("Nguyễn Trí Thắng")
                .phoneNumber("0333743206")
                .shippingAddress("Hà Nội")
                .totalAmount(BigDecimal.valueOf(50000))
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.COD)
                .paymentStatus(PaymentStatus.UNPAID)
                .build();

        when(orderRepository.findById(24L)).thenReturn(Optional.of(mockOrder));

        AiOrderTools tools = new AiOrderTools(productRepository, orderRepository, orderDraftService);
        String trackResult = tools.trackOrder("24", null);

        assertNotNull(trackResult);
        assertTrue(trackResult.contains("#NXR-24"));
        assertTrue(trackResult.contains("Nguyễn Trí Thắng"));
        assertTrue(trackResult.contains("Chờ xử lý"));
    }

    @Test
    @DisplayName("TC_AI_13: AiOrderTools cancelOrder chỉ cho phép hủy khi PENDING")
    void testAiOrderTools_CancelOrder_PendingOnly() {
        Order pendingOrder = Order.builder()
                .id(25L)
                .status(OrderStatus.PENDING)
                .build();
        Order shippingOrder = Order.builder()
                .id(26L)
                .status(OrderStatus.SHIPPING)
                .build();

        when(orderRepository.findById(25L)).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.findById(26L)).thenReturn(Optional.of(shippingOrder));

        AiOrderTools tools = new AiOrderTools(productRepository, orderRepository, orderDraftService);

        // Đơn PENDING -> Hủy thành công
        String resPending = tools.cancelOrder("25", "Đổi ý");
        assertTrue(resPending.contains("Đã hủy thành công"));
        assertEquals(OrderStatus.CANCELLED, pendingOrder.getStatus());

        // Đơn SHIPPING -> Từ chối hủy
        String resShipping = tools.cancelOrder("26", "Không thích nữa");
        assertTrue(resShipping.contains("không thể hủy"));
    }

    @Test
    @DisplayName("TC_AI_14: AiOrderTools updateAddress chỉ cho phép cập nhật khi PENDING")
    void testAiOrderTools_UpdateAddress_PendingOnly() {
        Order pendingOrder = Order.builder()
                .id(27L)
                .shippingAddress("Địa chỉ cũ")
                .status(OrderStatus.PENDING)
                .build();
        Order completedOrder = Order.builder()
                .id(28L)
                .shippingAddress("Địa chỉ cũ")
                .status(OrderStatus.COMPLETED)
                .build();

        when(orderRepository.findById(27L)).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.findById(28L)).thenReturn(Optional.of(completedOrder));

        AiOrderTools tools = new AiOrderTools(productRepository, orderRepository, orderDraftService);

        // Đơn PENDING -> Đổi địa chỉ thành công
        String resPending = tools.updateAddress("27", "Ngõ 33 Đồng Mới, Thanh Oai, Hà Nội");
        assertTrue(resPending.contains("thành công"));
        assertEquals("Ngõ 33 Đồng Mới, Thanh Oai, Hà Nội", pendingOrder.getShippingAddress());

        // Đơn COMPLETED -> Từ chối đổi
        String resCompleted = tools.updateAddress("28", "Ngõ 33 Đồng Mới, Thanh Oai, Hà Nội");
        assertTrue(resCompleted.contains("không thể thay đổi"));
    }
}
