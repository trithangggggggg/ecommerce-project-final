package ra.project.server.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ra.project.server.exception.BadRequestException;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.request.AiChatRequest;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.request.CheckoutRequest;
import ra.project.server.model.dto.response.AiChatResponse;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.entity.Product;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.impl.AiServiceImpl;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
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
    private ra.project.server.service.OrderService orderService;

    @InjectMocks
    private AiServiceImpl aiService;

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
                        "SSD", "512GB PCIe"
                ))
                .keywords(List.of("macbook pro m4", "laptop apple", "đồ họa chuyên nghiệp"))
                .build();

        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);

        assertNotNull(response);
        assertEquals("MacBook Pro M4 14 inch", response.getProductName());
        assertEquals("Apple", response.getBrand());
        assertEquals("Laptop cao cấp", response.getCategoryName());
        assertNotNull(response.getDescription());

        String desc = response.getDescription();
        // Kiểm tra đầy đủ 4 phần cấu trúc Markdown chuẩn
        assertTrue(desc.contains("MacBook Pro M4 14 inch"), "Mô tả phải chứa tên sản phẩm");
        assertTrue(desc.contains("Apple"), "Mô tả phải chứa thương hiệu Apple");
        assertTrue(desc.contains("Điểm nổi bật"), "Mô tả phải có mục Điểm nổi bật");
        assertTrue(desc.contains("Thông số kỹ thuật"), "Mô tả phải có mục Thông số kỹ thuật");
        assertTrue(desc.contains("Đối tượng phù hợp"), "Mô tả phải có mục Đối tượng phù hợp");

        // Kiểm tra thông số kỹ thuật được định dạng
        assertTrue(desc.contains("Chip") && desc.contains("Apple M4 Pro"), "Mô tả phải chứa thông số Chip");
        assertTrue(desc.contains("RAM") && desc.contains("24GB"), "Mô tả phải chứa thông số RAM");

        // Kiểm tra SEO Title và Keywords
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
                        Map.of("group", "Hiệu năng", "key", "Vi xử lý", "value", "A18 Pro")
                ))
                .build();

        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);

        assertNotNull(response);
        String desc = response.getDescription();
        assertTrue(desc.contains("6.3 inch Super Retina XDR"));
        assertTrue(desc.contains("A18 Pro"));
        assertTrue(desc.contains("Thông số kỹ thuật"));
    }

    @Test
    @DisplayName("TC_AI_03: Sinh mô tả khi truyền productName (tương thích ngược)")
    void whenGenerateDescription_withProductNameAlias_thenSuccess() {
        AiGenerateDescriptionRequest request = AiGenerateDescriptionRequest.builder()
                .productName("Chuột Logitech MX Master 3S")
                .brand("Logitech")
                .build();

        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);

        assertNotNull(response);
        assertEquals("Chuột Logitech MX Master 3S", response.getProductName());
        assertTrue(response.getDescription().contains("Chuột Logitech MX Master 3S"));
    }

    @Test
    @DisplayName("TC_AI_04: Ném BadRequestException khi tên sản phẩm rỗng")
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

        String rawWithSimpleFence = "```\n### Giới thiệu\nTính năng nổi bật\n```";
        String cleaned2 = aiService.cleanMarkdownOutput(rawWithSimpleFence);
        assertFalse(cleaned2.contains("```"));
        assertTrue(cleaned2.contains("### Giới thiệu"));

        String rawWithoutFence = "## Đỉnh Cao Công Nghệ\nNội dung không có fence.";
        String cleaned3 = aiService.cleanMarkdownOutput(rawWithoutFence);
        assertEquals(rawWithoutFence, cleaned3);
    }

    @Test
    @DisplayName("TC_AI_06: Khách hàng hỏi chuột Logitech (kho không có) -> Bot không gợi ý iPhone 16 Pro Max và không đặt hàng")
    void whenCustomerAsksForOutOfStockLogitechMouse_thenBotDeclinesAndDoesNotRecommendIPhone() {
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
        assertFalse(response.getReply().contains("iPhone 16 Pro Max"),
                "Tuyệt đối không tự tiện gợi ý iPhone 16 Pro Max khi khách hỏi chuột Logitech");
    }

    @Test
    @DisplayName("TC_AI_07: Tách chuẩn Họ tên, SĐT, Địa chỉ từ chuỗi tự nhiên không dấu câu")
    void whenCustomerOrdersInNaturalString_thenExtractsNamePhoneAndAddressAccurately() {
        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderService", orderService);

        Product sonyHeadphone = Product.builder()
                .id(99L)
                .name("Tai nghe Sony WH-1000XM5")
                .description("Chống ồn cao cấp")
                .price(BigDecimal.valueOf(7990000))
                .status("ACTIVE")
                .build();
        when(productRepository.findAll()).thenReturn(List.of(sonyHeadphone));

        ArgumentCaptor<CheckoutRequest> captor = ArgumentCaptor.forClass(CheckoutRequest.class);
        OrderResponse mockOrderResponse = OrderResponse.builder()
                .id(1222L)
                .receiverName("Nguyễn Thị Thanh")
                .phoneNumber("0333743201")
                .shippingAddress("ngõ 36 đường Thanh Hóa")
                .totalAmount(BigDecimal.valueOf(7990000))
                .build();
        when(orderService.createOrderForAiAssistant(captor.capture()))
                .thenReturn(ra.project.server.common.response.ApiResponse.success(mockOrderResponse));

        AiChatRequest request = AiChatRequest.builder()
                .message("Đặt hộ tôi 1 tai nghe Sony WH-1000XM5, Nguyễn Thị Thanh 0333743201 nhận hàng tại ngõ 36 đường Thanh Hóa, thanh toán khi nhận hàng")
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        assertNotNull(response.getCreatedOrder(), "Đơn hàng phải được tạo thành công");

        CheckoutRequest passedReq = captor.getValue();
        assertNotNull(passedReq);
        assertEquals("Nguyễn Thị Thanh", passedReq.getReceiverName(), "Họ tên phải được trích xuất chính xác");
        assertEquals("0333743201", passedReq.getPhoneNumber(), "Số điện thoại phải chuẩn xác");
        assertEquals("ngõ 36 đường Thanh Hóa", passedReq.getShippingAddress(), "Địa chỉ không được chứa họ tên hoặc SĐT");
        assertEquals(99L, passedReq.getItems().get(0).getProductId(), "Sản phẩm được đặt phải là Sony WH-1000XM5");
    }

    @Test
    @DisplayName("TC_AI_08a: Khách gửi thông tin nhận hàng -> Chatbot ghi nhận thông tin và hỏi phương thức thanh toán")
    void whenCustomerProvidesDeliveryInfo_withoutPaymentMethod_thenAsksForPaymentMethod() {
        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderService", orderService);

        Product mouse = Product.builder()
                .id(50L)
                .name("Chuột không dây Logitech MX Master 3S")
                .description("Chuột công thái học")
                .price(BigDecimal.valueOf(2490000))
                .status("ACTIVE")
                .build();
        when(productRepository.findAll()).thenReturn(List.of(mouse));

        ra.project.server.model.dto.request.ChatMessageDto prevMsg = new ra.project.server.model.dto.request.ChatMessageDto();
        prevMsg.setRole("assistant");
        prevMsg.setContent("Dạ em hỗ trợ lên đơn ngay cho Chuột không dây Logitech MX Master 3S (2.490.000đ).\nAnh/chị vui lòng cung cấp thông tin nhận hàng gồm: Họ tên, Số điện thoại, Địa chỉ nhận hàng và Ghi chú nhé ạ!");

        AiChatRequest request = AiChatRequest.builder()
                .message("Nguyên Tuấn Minh 0333743203 số nhà 36 đường Thanh Hóa, ghi chú: giao trước 17h")
                .history(List.of(prevMsg))
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        assertNull(response.getCreatedOrder(), "Chưa tạo đơn hàng vì cần khách hàng chọn hình thức thanh toán");
        assertTrue(response.getReply().contains("Nguyên Tuấn Minh"), "Phải xác nhận họ tên");
        assertTrue(response.getReply().contains("0333743203"), "Phải xác nhận số điện thoại");
        assertTrue(response.getReply().contains("số nhà 36 đường Thanh Hóa"), "Phải xác nhận địa chỉ");
        assertTrue(response.getReply().contains("giao trước 17h"), "Phải trích xuất và hiển thị ghi chú");
        assertTrue(response.getReply().contains("Thanh toán khi nhận hàng (COD)"), "Phải hỏi lựa chọn COD");
        assertTrue(response.getReply().contains("Chuyển khoản VietQR Online (SePay)"), "Phải hỏi lựa chọn VietQR Online");
    }

    @Test
    @DisplayName("TC_AI_08b: Khách chọn hình thức COD (bằng số 1 hoặc từ khóa) -> Tạo đơn COD thành công")
    void whenCustomerChoosesCod_thenCreatesCodOrderSuccessfully() {
        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderService", orderService);

        Product mouse = Product.builder()
                .id(50L)
                .name("Chuột không dây Logitech MX Master 3S")
                .price(BigDecimal.valueOf(2490000))
                .status("ACTIVE")
                .build();
        when(productRepository.findAll()).thenReturn(List.of(mouse));

        ArgumentCaptor<CheckoutRequest> captor = ArgumentCaptor.forClass(CheckoutRequest.class);
        OrderResponse mockOrderResponse = OrderResponse.builder()
                .id(1223L)
                .receiverName("Nguyên Tuấn Minh")
                .phoneNumber("0333743203")
                .shippingAddress("số nhà 36 đường Thanh Hóa")
                .paymentMethod(ra.project.server.model.enums.PaymentMethod.COD)
                .totalAmount(BigDecimal.valueOf(2490000))
                .note("giao trước 17h")
                .build();
        when(orderService.createOrderForAiAssistant(captor.capture()))
                .thenReturn(ra.project.server.common.response.ApiResponse.success(mockOrderResponse));

        ra.project.server.model.dto.request.ChatMessageDto botMsg1 = new ra.project.server.model.dto.request.ChatMessageDto();
        botMsg1.setRole("assistant");
        botMsg1.setContent("Dạ em hỗ trợ lên đơn cho Chuột không dây Logitech MX Master 3S");

        ra.project.server.model.dto.request.ChatMessageDto userMsg1 = new ra.project.server.model.dto.request.ChatMessageDto();
        userMsg1.setRole("user");
        userMsg1.setContent("Nguyên Tuấn Minh 0333743203 số nhà 36 đường Thanh Hóa, ghi chú: giao trước 17h");

        ra.project.server.model.dto.request.ChatMessageDto botMsg2 = new ra.project.server.model.dto.request.ChatMessageDto();
        botMsg2.setRole("assistant");
        botMsg2.setContent("Dạ em đã ghi nhận thông tin:\n- Người nhận: Nguyên Tuấn Minh (0333743203)\n- Địa chỉ: số nhà 36 đường Thanh Hóa\n- Ghi chú: giao trước 17h\nAnh/chị vui lòng chọn hình thức thanh toán giúp em nhé:\n1️⃣ Thanh toán khi nhận hàng (COD)\n2️⃣ Chuyển khoản VietQR Online (SePay)");

        AiChatRequest request = AiChatRequest.builder()
                .message("1")
                .history(List.of(botMsg1, userMsg1, botMsg2))
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        assertNotNull(response.getCreatedOrder(), "Đơn hàng COD phải được tạo thành công!");
        assertEquals(ra.project.server.model.enums.PaymentMethod.COD, captor.getValue().getPaymentMethod());
        assertEquals("Nguyên Tuấn Minh", captor.getValue().getReceiverName());
        assertEquals("0333743203", captor.getValue().getPhoneNumber());
        assertEquals("số nhà 36 đường Thanh Hóa", captor.getValue().getShippingAddress());
        assertEquals("giao trước 17h", captor.getValue().getNote());
        assertTrue(response.getReply().contains("Đặt hàng thành công"));
        assertTrue(response.getReply().contains("Thanh toán khi nhận hàng (COD)"));
    }

    @Test
    @DisplayName("TC_AI_08c: Khách chọn hình thức Chuyển khoản Online -> Tạo đơn SePay, trả mã chuyển khoản và VietQR")
    void whenCustomerChoosesOnlinePayment_thenCreatesSepayOrderWithPaymentCodeAndQr() {
        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderService", orderService);

        Product mouse = Product.builder()
                .id(50L)
                .name("Chuột không dây Logitech MX Master 3S")
                .price(BigDecimal.valueOf(2490000))
                .status("ACTIVE")
                .build();
        when(productRepository.findAll()).thenReturn(List.of(mouse));

        ArgumentCaptor<CheckoutRequest> captor = ArgumentCaptor.forClass(CheckoutRequest.class);
        OrderResponse mockOrderResponse = OrderResponse.builder()
                .id(1225L)
                .receiverName("Nguyên Tuấn Minh")
                .phoneNumber("0333743203")
                .shippingAddress("số nhà 36 đường Thanh Hóa")
                .paymentMethod(ra.project.server.model.enums.PaymentMethod.SEPAY)
                .totalAmount(BigDecimal.valueOf(2490000))
                .build();
        when(orderService.createOrderForAiAssistant(captor.capture()))
                .thenReturn(ra.project.server.common.response.ApiResponse.success(mockOrderResponse));

        ra.project.server.model.dto.request.ChatMessageDto botMsg1 = new ra.project.server.model.dto.request.ChatMessageDto();
        botMsg1.setRole("assistant");
        botMsg1.setContent("Dạ em hỗ trợ lên đơn cho Chuột không dây Logitech MX Master 3S");

        ra.project.server.model.dto.request.ChatMessageDto userMsg1 = new ra.project.server.model.dto.request.ChatMessageDto();
        userMsg1.setRole("user");
        userMsg1.setContent("Nguyên Tuấn Minh 0333743203 số nhà 36 đường Thanh Hóa");

        ra.project.server.model.dto.request.ChatMessageDto botMsg2 = new ra.project.server.model.dto.request.ChatMessageDto();
        botMsg2.setRole("assistant");
        botMsg2.setContent("Dạ em đã ghi nhận thông tin:\n- Người nhận: Nguyên Tuấn Minh (0333743203)\n- Địa chỉ: số nhà 36 đường Thanh Hóa\nAnh/chị vui lòng chọn hình thức thanh toán:\n1️⃣ Thanh toán khi nhận hàng (COD)\n2️⃣ Chuyển khoản VietQR Online (SePay)");

        AiChatRequest request = AiChatRequest.builder()
                .message("chuyển khoản online nhé")
                .history(List.of(botMsg1, userMsg1, botMsg2))
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        assertNotNull(response.getCreatedOrder(), "Đơn hàng SePay phải được tạo thành công!");
        assertEquals(ra.project.server.model.enums.PaymentMethod.SEPAY, captor.getValue().getPaymentMethod());
        assertEquals("DH1225", response.getCreatedOrder().getSepayInvoiceNumber(), "Mã thanh toán SePay phải được gắn vào đơn");

        String reply = response.getReply();
        assertTrue(reply.contains("THÔNG TIN THANH TOÁN VIETQR ONLINE"), "Phải có tiêu đề thanh toán VietQR Online");
        assertTrue(reply.contains("DH1225"), "Phải gửi mã thanh toán / nội dung chuyển khoản cho người dùng");
        assertTrue(reply.contains("/payment/qr/1225"), "Phải có đường link mở trang quét mã QR thanh toán");
    }

    @Test
    @DisplayName("TC_AI_08d: Khách cung cấp đầy đủ thông tin nhận hàng và thanh toán online trong 1 câu -> Tạo đơn ngay")
    void whenCustomerProvidesAllInfoAndOnlinePayment_thenCreatesSepayOrderImmediately() {
        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderService", orderService);

        Product mouse = Product.builder()
                .id(50L)
                .name("Chuột không dây Logitech MX Master 3S")
                .price(BigDecimal.valueOf(2490000))
                .status("ACTIVE")
                .build();
        when(productRepository.findAll()).thenReturn(List.of(mouse));

        ArgumentCaptor<CheckoutRequest> captor = ArgumentCaptor.forClass(CheckoutRequest.class);
        OrderResponse mockOrderResponse = OrderResponse.builder()
                .id(1226L)
                .receiverName("Nguyên Tuấn Minh")
                .phoneNumber("0333743203")
                .shippingAddress("số nhà 36 đường Thanh Hóa")
                .paymentMethod(ra.project.server.model.enums.PaymentMethod.SEPAY)
                .totalAmount(BigDecimal.valueOf(2490000))
                .build();
        when(orderService.createOrderForAiAssistant(captor.capture()))
                .thenReturn(ra.project.server.common.response.ApiResponse.success(mockOrderResponse));

        AiChatRequest request = AiChatRequest.builder()
                .message("Tôi tên Nguyên Tuấn Minh 0333743203 số nhà 36 đường Thanh Hóa, mua chuột logitech thanh toán online")
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        assertNotNull(response.getCreatedOrder());
        assertEquals(ra.project.server.model.enums.PaymentMethod.SEPAY, captor.getValue().getPaymentMethod());
        assertEquals("Nguyên Tuấn Minh", captor.getValue().getReceiverName());
        assertEquals("0333743203", captor.getValue().getPhoneNumber());
        assertEquals("DH1226", response.getCreatedOrder().getSepayInvoiceNumber());
        assertTrue(response.getReply().contains("/payment/qr/1226"));
    }

    @Test
    @DisplayName("TC_AI_09: Khách hàng hỏi 'cho tôi xem đơn' -> Trả về thông tin đơn hàng và createdOrder")
    void whenCustomerAsksToViewOrder_thenReturnsOrderCardAndDetails() {
        OrderResponse mockOrderResponse = OrderResponse.builder()
                .id(1224L)
                .receiverName("Nguyễn Trí Thắng")
                .phoneNumber("0333743203")
                .shippingAddress("HPC Landmark")
                .totalAmount(BigDecimal.valueOf(200000))
                .status(ra.project.server.model.enums.OrderStatus.PENDING)
                .build();

        ra.project.server.model.entity.Order mockEntityOrder = ra.project.server.model.entity.Order.builder()
                .id(1224L)
                .receiverName("Nguyễn Trí Thắng")
                .phoneNumber("0333743203")
                .shippingAddress("HPC Landmark")
                .totalAmount(BigDecimal.valueOf(200000))
                .status(ra.project.server.model.enums.OrderStatus.PENDING)
                .build();

        ra.project.server.repository.OrderRepository mockOrderRepo = mock(ra.project.server.repository.OrderRepository.class);
        ra.project.server.mapper.OrderMapper mockOrderMapper = mock(ra.project.server.mapper.OrderMapper.class);

        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderRepository", mockOrderRepo);
        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderMapper", mockOrderMapper);

        when(mockOrderRepo.findById(1224L)).thenReturn(Optional.of(mockEntityOrder));
        when(mockOrderMapper.toResponse(mockEntityOrder)).thenReturn(mockOrderResponse);

        ra.project.server.model.dto.request.ChatMessageDto prevBotMsg = new ra.project.server.model.dto.request.ChatMessageDto();
        prevBotMsg.setRole("assistant");
        prevBotMsg.setContent("🎉 Đặt hàng thành công!\n- Mã đơn hàng: #NXR-1224\n- Sản phẩm: Que chọc sim (SL: 10)");

        AiChatRequest request = AiChatRequest.builder()
                .message("cho tôi xem đơn")
                .history(List.of(prevBotMsg))
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        assertNotNull(response.getCreatedOrder(), "Phải trả về thông tin đơn hàng để chatbot hiển thị Order Card");
        assertEquals(1224L, response.getCreatedOrder().getId());
        assertTrue(response.getSuggestedProducts().isEmpty(), "Không được hiển thị sản phẩm đề xuất bừa bãi khi khách đang xem đơn");
        assertTrue(response.getReply().contains("1224"));
    }

    @Test
    @DisplayName("TC_AI_10: Trích xuất chính xác Họ tên, SĐT, Địa chỉ dạng tòa nhà (HPC Landmark) và Ghi chú trong dấu ngoặc kép")
    void whenCustomerProvidesNaturalInputWithQuotesAndLandmarkAddress_thenExtractsAccurately() {
        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderService", orderService);

        Product simPin = Product.builder()
                .id(31L)
                .name("Que chọc sim")
                .price(BigDecimal.valueOf(20000))
                .status("ACTIVE")
                .build();
        when(productRepository.findAll()).thenReturn(List.of(simPin));

        ra.project.server.model.dto.request.ChatMessageDto prevMsg = new ra.project.server.model.dto.request.ChatMessageDto();
        prevMsg.setRole("assistant");
        prevMsg.setContent("Dạ em hỗ trợ lên đơn ngay cho Que chọc sim (20.000đ). Anh/chị vui lòng cung cấp thông tin nhận hàng gồm: Họ và tên người nhận, Số điện thoại, Địa chỉ nhận hàng, Ghi chú giao hàng (nếu có) nhé ạ!");

        AiChatRequest request = AiChatRequest.builder()
                .message("Nguyễn Tuấn Minh 0333743208 HPC Landmark \"giao hàng sớm\"")
                .history(List.of(prevMsg))
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        assertNull(response.getCreatedOrder(), "Chưa tạo đơn hàng vì chờ khách xác nhận và chọn phương thức thanh toán");
        assertTrue(response.getReply().contains("Nguyễn Tuấn Minh"), "Phải nhận diện đúng Họ và tên");
        assertTrue(response.getReply().contains("0333743208"), "Phải nhận diện đúng Số điện thoại");
        assertTrue(response.getReply().contains("HPC Landmark"), "Phải nhận diện đúng Địa chỉ kể cả tên tòa nhà/landmark");
        assertTrue(response.getReply().contains("giao hàng sớm"), "Phải trích xuất Ghi chú trong dấu ngoặc kép");
        assertTrue(response.getReply().contains("Thanh toán khi nhận hàng (COD)"));
        assertTrue(response.getReply().contains("Chuyển khoản VietQR Online (SePay)"));
    }

    @Test
    @DisplayName("TC_AI_11: Cho phép người dùng chỉnh sửa thông tin tạm trước khi chốt đơn")
    void whenCustomerEditsDraftAddressBeforeConfirming_thenUpdatesDraftAndReconfirms() {
        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderService", orderService);

        Product simPin = Product.builder()
                .id(31L)
                .name("Que chọc sim")
                .price(BigDecimal.valueOf(20000))
                .status("ACTIVE")
                .build();
        when(productRepository.findAll()).thenReturn(List.of(simPin));

        ra.project.server.model.dto.request.ChatMessageDto botMsg1 = new ra.project.server.model.dto.request.ChatMessageDto();
        botMsg1.setRole("assistant");
        botMsg1.setContent("Dạ em đã ghi nhận thông tin đặt hàng cho Que chọc sim (20.000đ):\n- Người nhận: Nguyễn Tuấn Minh (0333743208)\n- Địa chỉ: HPC Landmark\n- Ghi chú: giao hàng sớm\nAnh/chị vui lòng kiểm tra lại thông tin trên...");

        AiChatRequest request = AiChatRequest.builder()
                .message("đổi địa chỉ sang 36 đường Thanh Hóa giúp em nhé")
                .history(List.of(botMsg1))
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        assertNull(response.getCreatedOrder());
        assertTrue(response.getReply().contains("Nguyễn Tuấn Minh"), "Giữ nguyên họ tên cũ");
        assertTrue(response.getReply().contains("0333743208"), "Giữ nguyên SĐT cũ");
        assertTrue(response.getReply().contains("36 đường Thanh Hóa"), "Địa chỉ phải được cập nhật mới");
        assertTrue(response.getReply().contains("giao hàng sớm"), "Giữ nguyên ghi chú cũ");
    }

    @Test
    @DisplayName("TC_AI_12: Chỉnh sửa địa chỉ đơn hàng ĐÃ TẠO trên hệ thống theo yêu cầu")
    void whenCustomerEditsPlacedOrderAddress_thenUpdatesOrderInDatabase() {
        ra.project.server.model.entity.Order mockEntityOrder = ra.project.server.model.entity.Order.builder()
                .id(1228L)
                .receiverName("Nguyễn Tuấn Minh")
                .phoneNumber("0333743208")
                .shippingAddress("HPC Landmark")
                .status(ra.project.server.model.enums.OrderStatus.PENDING)
                .build();

        OrderResponse mockOrderResponse = OrderResponse.builder()
                .id(1228L)
                .receiverName("Nguyễn Tuấn Minh")
                .phoneNumber("0333743208")
                .shippingAddress("HPC Landmark 105")
                .status(ra.project.server.model.enums.OrderStatus.PENDING)
                .build();

        ra.project.server.repository.OrderRepository mockOrderRepo = mock(ra.project.server.repository.OrderRepository.class);
        ra.project.server.mapper.OrderMapper mockOrderMapper = mock(ra.project.server.mapper.OrderMapper.class);

        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderRepository", mockOrderRepo);
        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderMapper", mockOrderMapper);

        when(mockOrderRepo.findById(1228L)).thenReturn(Optional.of(mockEntityOrder));
        when(mockOrderMapper.toResponse(mockEntityOrder)).thenReturn(mockOrderResponse);

        ra.project.server.model.dto.request.ChatMessageDto botMsg = new ra.project.server.model.dto.request.ChatMessageDto();
        botMsg.setRole("assistant");
        botMsg.setContent("🎉 Đặt hàng thành công! Mã đơn hàng: #NXR-1228");

        AiChatRequest request = AiChatRequest.builder()
                .message("sửa lại địa chỉ thành HPC Landmark 105")
                .history(List.of(botMsg))
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        verify(mockOrderRepo, times(1)).save(mockEntityOrder);
        assertEquals("HPC Landmark 105", mockEntityOrder.getShippingAddress(), "Địa chỉ đơn hàng trong DB phải được cập nhật mới");
        assertTrue(response.getReply().contains("HPC Landmark 105"));
        assertTrue(response.getReply().contains("cập nhật địa chỉ"));
    }

    @Test
    @DisplayName("TC_AI_13: Hủy đơn hàng ĐÃ TẠO trên hệ thống theo yêu cầu")
    void whenCustomerCancelsPlacedOrder_thenSetsStatusToCancelled() {
        ra.project.server.model.entity.Order mockEntityOrder = ra.project.server.model.entity.Order.builder()
                .id(1229L)
                .receiverName("Nguyễn Tuấn Minh")
                .phoneNumber("0333743208")
                .shippingAddress("HPC Landmark")
                .status(ra.project.server.model.enums.OrderStatus.PENDING)
                .build();

        OrderResponse mockOrderResponse = OrderResponse.builder()
                .id(1229L)
                .receiverName("Nguyễn Tuấn Minh")
                .phoneNumber("0333743208")
                .shippingAddress("HPC Landmark")
                .status(ra.project.server.model.enums.OrderStatus.CANCELLED)
                .build();

        ra.project.server.repository.OrderRepository mockOrderRepo = mock(ra.project.server.repository.OrderRepository.class);
        ra.project.server.mapper.OrderMapper mockOrderMapper = mock(ra.project.server.mapper.OrderMapper.class);

        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderRepository", mockOrderRepo);
        org.springframework.test.util.ReflectionTestUtils.setField(aiService, "orderMapper", mockOrderMapper);

        when(mockOrderRepo.findById(1229L)).thenReturn(Optional.of(mockEntityOrder));
        when(mockOrderMapper.toResponse(mockEntityOrder)).thenReturn(mockOrderResponse);

        ra.project.server.model.dto.request.ChatMessageDto botMsg = new ra.project.server.model.dto.request.ChatMessageDto();
        botMsg.setRole("assistant");
        botMsg.setContent("🎉 Đặt hàng thành công! Mã đơn hàng: #NXR-1229");

        AiChatRequest request = AiChatRequest.builder()
                .message("tôi muốn hủy đơn này, không mua nữa")
                .history(List.of(botMsg))
                .build();

        AiChatResponse response = aiService.chatWithCustomer(request);
        assertNotNull(response);
        verify(mockOrderRepo, times(1)).save(mockEntityOrder);
        assertEquals(ra.project.server.model.enums.OrderStatus.CANCELLED, mockEntityOrder.getStatus(), "Trạng thái đơn hàng trong DB phải thành CANCELLED");
        assertTrue(response.getReply().contains("Đã hủy thành công đơn hàng"));
    }
}

