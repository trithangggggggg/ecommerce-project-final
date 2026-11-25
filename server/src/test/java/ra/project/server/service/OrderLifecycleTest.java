package ra.project.server.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.mapper.OrderMapper;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.entity.*;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.*;
import ra.project.server.service.impl.OrderServiceImpl;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit Test chuyên sâu cho Vòng đời đơn hàng (TEST_05):
 * 1. PENDING -> PROCESSING -> SHIPPING -> COMPLETED
 * 2. Ngăn chặn chuyển trạng thái bất hợp lệ
 * 3. Hủy đơn tự động hoàn kho (stock)
 * 4. Hủy đơn tự động hoàn lượt dùng voucher (promotion usedCount)
 */
@ExtendWith(MockitoExtension.class)
class OrderLifecycleTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShippingCarrierRepository shippingCarrierRepository;

    @Mock
    private OrderMapper orderMapper;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User testCustomer;
    private Product testProduct;
    private ProductVariant testVariant;
    private Promotion testOrderPromo;
    private Promotion testShippingPromo;
    private ShippingCarrier testCarrier;

    @BeforeEach
    void setUp() {
        testCustomer = User.builder()
                .id(1L)
                .username("test_customer")
                .role(Role.CUSTOMER)
                .status(true)
                .build();

        testProduct = Product.builder()
                .id(10L)
                .name("MacBook Pro M3 Max")
                .stock(20)
                .build();

        testVariant = ProductVariant.builder()
                .id(101L)
                .sku("MBP-M3-MAX-1TB")
                .product(testProduct)
                .stock(10)
                .price(new BigDecimal("79990000"))
                .build();

        testOrderPromo = Promotion.builder()
                .id(1L)
                .code("GIAM500K")
                .usedCount(1)
                .maxUsage(100)
                .status("ACTIVE")
                .build();

        testShippingPromo = Promotion.builder()
                .id(2L)
                .code("FREESHIP30K")
                .usedCount(1)
                .maxUsage(100)
                .status("ACTIVE")
                .type("SHIPPING")
                .build();

        testCarrier = ShippingCarrier.builder()
                .id(5L)
                .code("SPX")
                .name("Shopee Express")
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockAuthentication(String username) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(username);
        when(auth.isAuthenticated()).thenReturn(true);
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    @DisplayName("Vòng đời đơn hàng chuẩn: PENDING -> PROCESSING -> SHIPPING -> COMPLETED")
    void testFullOrderLifecycleSuccess() {
        Order order = Order.builder()
                .id(100L)
                .user(testCustomer)
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("79990000"))
                .build();

        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            return OrderResponse.builder().id(o.getId()).status(o.getStatus()).trackingCode(o.getTrackingCode()).build();
        });

        // 1. Chuyển từ PENDING sang PROCESSING
        ApiResponse<OrderResponse> step1 = orderService.updateOrderStatus(100L, OrderStatus.PROCESSING);
        assertNotNull(step1);
        assertEquals(OrderStatus.PROCESSING, step1.getData().getStatus());
        assertEquals(OrderStatus.PROCESSING, order.getStatus());

        // 2. Chuyển từ PROCESSING sang SHIPPING (có gán đơn vị vận chuyển & mã vận đơn)
        when(shippingCarrierRepository.findById(5L)).thenReturn(Optional.of(testCarrier));
        ApiResponse<OrderResponse> step2 = orderService.updateOrderStatus(100L, OrderStatus.SHIPPING, 5L, "SPX-VN-12345678");
        assertNotNull(step2);
        assertEquals(OrderStatus.SHIPPING, step2.getData().getStatus());
        assertEquals("SPX-VN-12345678", step2.getData().getTrackingCode());
        assertEquals(testCarrier, order.getShippingCarrier());

        // 3. Chuyển từ SHIPPING sang COMPLETED (Giao hàng thành công)
        ApiResponse<OrderResponse> step3 = orderService.updateOrderStatus(100L, OrderStatus.COMPLETED);
        assertNotNull(step3);
        assertEquals(OrderStatus.COMPLETED, step3.getData().getStatus());
        assertEquals(OrderStatus.COMPLETED, order.getStatus());

        verify(orderRepository, times(3)).save(order);
    }

    @Test
    @DisplayName("Không được phép cập nhật đơn hàng khi đã COMPLETED hoặc CANCELLED")
    void testCannotUpdateTerminalOrderStatus() {
        Order completedOrder = Order.builder().id(201L).status(OrderStatus.COMPLETED).build();
        when(orderRepository.findById(201L)).thenReturn(Optional.of(completedOrder));

        BadRequestException ex1 = assertThrows(BadRequestException.class,
                () -> orderService.updateOrderStatus(201L, OrderStatus.CANCELLED));
        assertTrue(ex1.getMessage().contains("COMPLETED"));

        Order cancelledOrder = Order.builder().id(202L).status(OrderStatus.CANCELLED).build();
        when(orderRepository.findById(202L)).thenReturn(Optional.of(cancelledOrder));

        BadRequestException ex2 = assertThrows(BadRequestException.class,
                () -> orderService.updateOrderStatus(202L, OrderStatus.PROCESSING));
        assertTrue(ex2.getMessage().contains("CANCELLED"));
    }

    @Test
    @DisplayName("Admin hủy đơn hàng: Tự động hoàn kho stock và hoàn lại lượt dùng voucher")
    void testAdminCancelOrderRestoresStockAndVouchers() {
        OrderItem item = OrderItem.builder()
                .variant(testVariant)
                .product(testProduct)
                .quantity(2)
                .build();

        Order order = Order.builder()
                .id(301L)
                .status(OrderStatus.PROCESSING)
                .orderItems(List.of(item))
                .couponCode("GIAM500K")
                .shippingCouponCode("FREESHIP30K")
                .build();

        when(orderRepository.findById(301L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(promotionRepository.findByCodeIgnoreCase("GIAM500K")).thenReturn(Optional.of(testOrderPromo));
        when(promotionRepository.findByCodeIgnoreCase("FREESHIP30K")).thenReturn(Optional.of(testShippingPromo));
        when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            return OrderResponse.builder().id(o.getId()).status(o.getStatus()).build();
        });

        // Admin hủy đơn khi đang PROCESSING
        ApiResponse<OrderResponse> response = orderService.updateOrderStatus(301L, OrderStatus.CANCELLED);

        assertNotNull(response);
        assertEquals(OrderStatus.CANCELLED, response.getData().getStatus());

        // 1. Verify hoàn kho (stock)
        verify(productVariantRepository, times(1)).restoreStock(101L, 2);
        verify(productRepository, times(1)).syncProductTotalStock(10L);

        // 2. Verify hoàn voucher: usedCount giảm từ 1 xuống 0
        assertEquals(0, testOrderPromo.getUsedCount());
        verify(promotionRepository, times(1)).save(testOrderPromo);

        assertEquals(0, testShippingPromo.getUsedCount());
        verify(promotionRepository, times(1)).save(testShippingPromo);
    }

    @Test
    @DisplayName("Khách hàng tự hủy đơn: Tự động hoàn kho stock và hoàn voucher")
    void testCustomerCancelOrderRestoresStockAndVouchers() {
        mockAuthentication("test_customer");
        when(userRepository.findByUsername("test_customer")).thenReturn(Optional.of(testCustomer));

        OrderItem item = OrderItem.builder()
                .variant(testVariant)
                .product(testProduct)
                .quantity(1)
                .build();

        Order order = Order.builder()
                .id(401L)
                .user(testCustomer)
                .status(OrderStatus.PENDING)
                .orderItems(List.of(item))
                .couponCode("GIAM500K")
                .shippingCouponCode("FREESHIP30K")
                .build();

        when(orderRepository.findById(401L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(promotionRepository.findByCodeIgnoreCase("GIAM500K")).thenReturn(Optional.of(testOrderPromo));
        when(promotionRepository.findByCodeIgnoreCase("FREESHIP30K")).thenReturn(Optional.of(testShippingPromo));
        when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            return OrderResponse.builder().id(o.getId()).status(o.getStatus()).build();
        });

        ApiResponse<OrderResponse> response = orderService.cancelMyOrder(401L);

        assertNotNull(response);
        assertEquals(OrderStatus.CANCELLED, response.getData().getStatus());

        // Verify hoàn kho
        verify(productVariantRepository, times(1)).restoreStock(101L, 1);
        verify(productRepository, times(1)).syncProductTotalStock(10L);

        // Verify hoàn voucher
        assertEquals(0, testOrderPromo.getUsedCount());
        verify(promotionRepository, times(1)).save(testOrderPromo);
        assertEquals(0, testShippingPromo.getUsedCount());
        verify(promotionRepository, times(1)).save(testShippingPromo);
    }
}
