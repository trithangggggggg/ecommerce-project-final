package ra.project.server.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.mapper.OrderMapper;
import ra.project.server.model.dto.request.CheckoutRequest;
import ra.project.server.model.dto.request.OrderItemRequest;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.entity.*;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.repository.ProductVariantRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.service.impl.OrderServiceImpl;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User customer;
    private Product product1;
    private ProductVariant variant1;

    @BeforeEach
    void setUp() {
        customer = User.builder()
                .id(1L)
                .username("customer1")
                .fullName("Nguyen Van Khach")
                .role(Role.CUSTOMER)
                .status(true)
                .build();

        product1 = Product.builder()
                .id(10L)
                .name("Tai nghe Bluetooth")
                .price(BigDecimal.valueOf(500000))
                .stock(15)
                .status(true)
                .build();

        variant1 = ProductVariant.builder()
                .id(101L)
                .product(product1)
                .sku("HEADPHONE-BLK")
                .price(BigDecimal.valueOf(500000))
                .stock(15)
                .status(true)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockAuthentication(String username) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(username);
        when(authentication.getName()).thenReturn(username);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void whenCheckoutSuccess_withVariantId_thenDeductStockAndSaveOrder() {
        mockAuthentication("customer1");
        when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));
        when(productVariantRepository.findById(101L)).thenReturn(Optional.of(variant1));
        when(productVariantRepository.deductStock(101L, 2)).thenReturn(1);

        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });

        OrderResponse expectedResponse = OrderResponse.builder()
                .id(100L)
                .userId(customer.getId())
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.COD)
                .totalAmount(BigDecimal.valueOf(1000000))
                .build();
        when(orderMapper.toResponse(any(Order.class))).thenReturn(expectedResponse);

        CheckoutRequest request = CheckoutRequest.builder()
                .receiverName("Nguyen Van Khach")
                .phoneNumber("0988776655")
                .shippingAddress("123 Duong Le Loi, Q1, TP. HCM")
                .items(List.of(
                        OrderItemRequest.builder().variantId(101L).quantity(2).build()
                ))
                .build();

        ApiResponse<OrderResponse> result = orderService.checkout(request);

        assertNotNull(result);
        assertTrue(result.isSuccess());
        assertEquals(201, result.getStatus());
        assertEquals(OrderStatus.PENDING, result.getData().getStatus());
        assertEquals(PaymentMethod.COD, result.getData().getPaymentMethod());

        verify(productVariantRepository, times(1)).deductStock(101L, 2);
        verify(productRepository, times(1)).syncProductTotalStock(10L);
        verify(orderRepository, times(1)).save(any(Order.class));
    }

    @Test
    void whenCheckoutSuccess_withLegacyProductId_thenDeductStockOnDefaultVariant() {
        mockAuthentication("customer1");
        when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product1));
        when(productVariantRepository.findByProductIdAndStatusTrue(10L)).thenReturn(List.of(variant1));
        when(productVariantRepository.deductStock(101L, 1)).thenReturn(1);

        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId(105L);
            return saved;
        });

        OrderResponse expectedResponse = OrderResponse.builder()
                .id(105L)
                .status(OrderStatus.PENDING)
                .build();
        when(orderMapper.toResponse(any(Order.class))).thenReturn(expectedResponse);

        CheckoutRequest request = CheckoutRequest.builder()
                .receiverName("Nguyen Van Khach")
                .phoneNumber("0988776655")
                .shippingAddress("123 Duong Le Loi, Q1, TP. HCM")
                .items(List.of(
                        OrderItemRequest.builder().productId(10L).quantity(1).build()
                ))
                .build();

        ApiResponse<OrderResponse> result = orderService.checkout(request);

        assertNotNull(result);
        assertTrue(result.isSuccess());
        verify(productVariantRepository, times(1)).deductStock(101L, 1);
        verify(productRepository, times(1)).syncProductTotalStock(10L);
    }

    @Test
    void whenCheckoutOutOfStock_thenThrowBadRequestException() {
        mockAuthentication("customer1");
        when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));
        when(productVariantRepository.findById(101L)).thenReturn(Optional.of(variant1));
        when(productVariantRepository.deductStock(101L, 20)).thenReturn(0); // 0 affected rows = not enough stock!

        CheckoutRequest request = CheckoutRequest.builder()
                .receiverName("Nguyen Van Khach")
                .phoneNumber("0988776655")
                .shippingAddress("123 Duong Le Loi, Q1, TP. HCM")
                .items(List.of(
                        OrderItemRequest.builder().variantId(101L).quantity(20).build()
                ))
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> orderService.checkout(request));
        assertTrue(ex.getMessage().contains("không đủ số lượng tồn kho"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void whenCheckoutUnauthenticated_thenThrowUnauthorizedException() {
        when(securityContext.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(securityContext);

        CheckoutRequest request = CheckoutRequest.builder()
                .receiverName("Nguyen Van Khach")
                .phoneNumber("0988776655")
                .shippingAddress("123 Duong Le Loi, Q1, TP. HCM")
                .items(List.of(
                        OrderItemRequest.builder().variantId(101L).quantity(1).build()
                ))
                .build();

        assertThrows(UnauthorizedException.class, () -> orderService.checkout(request));
    }

    @Test
    void whenGetMyOrders_thenReturnListOfOrders() {
        mockAuthentication("customer1");
        when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));

        Order order = Order.builder()
                .id(100L)
                .user(customer)
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.valueOf(500000))
                .build();

        when(orderRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(order));
        when(orderMapper.toResponse(order)).thenReturn(OrderResponse.builder().id(100L).status(OrderStatus.PENDING).build());

        ApiResponse<List<OrderResponse>> response = orderService.getMyOrders();

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals(1, response.getData().size());
        assertEquals(100L, response.getData().get(0).getId());
    }

    @Test
    void whenUpdateStatusSequence_thenTransitionCorrectly() {
        Order order = Order.builder()
                .id(101L)
                .user(customer)
                .status(OrderStatus.PENDING)
                .build();

        when(orderRepository.findById(101L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            return OrderResponse.builder().id(o.getId()).status(o.getStatus()).build();
        });

        // 1. PENDING -> PROCESSING
        ApiResponse<OrderResponse> r1 = orderService.updateOrderStatus(101L, OrderStatus.PROCESSING);
        assertEquals(OrderStatus.PROCESSING, r1.getData().getStatus());

        // 2. PROCESSING -> SHIPPING
        ApiResponse<OrderResponse> r2 = orderService.updateOrderStatus(101L, OrderStatus.SHIPPING);
        assertEquals(OrderStatus.SHIPPING, r2.getData().getStatus());

        // 3. SHIPPING -> COMPLETED
        ApiResponse<OrderResponse> r3 = orderService.updateOrderStatus(101L, OrderStatus.COMPLETED);
        assertEquals(OrderStatus.COMPLETED, r3.getData().getStatus());

        // 4. COMPLETED cannot transition to any other status
        BadRequestException ex = assertThrows(BadRequestException.class, () -> orderService.updateOrderStatus(101L, OrderStatus.CANCELLED));
        assertTrue(ex.getMessage().contains("COMPLETED"));
    }

    @Test
    void whenCancelOrder_thenRestoreVariantStock() {
        OrderItem item = OrderItem.builder()
                .product(product1)
                .variant(variant1)
                .quantity(3)
                .price(BigDecimal.valueOf(500000))
                .totalPrice(BigDecimal.valueOf(1500000))
                .build();
        List<OrderItem> items = new ArrayList<>();
        items.add(item);

        Order order = Order.builder()
                .id(102L)
                .user(customer)
                .status(OrderStatus.PROCESSING)
                .orderItems(items)
                .build();

        when(orderRepository.findById(102L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> OrderResponse.builder().id(102L).status(OrderStatus.CANCELLED).build());

        ApiResponse<OrderResponse> resp = orderService.updateOrderStatus(102L, OrderStatus.CANCELLED);

        assertEquals(OrderStatus.CANCELLED, resp.getData().getStatus());
        verify(productVariantRepository, times(1)).restoreStock(101L, 3);
        verify(productRepository, times(1)).syncProductTotalStock(10L);
    }
}
