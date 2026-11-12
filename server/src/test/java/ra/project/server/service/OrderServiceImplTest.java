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
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;
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
import ra.project.server.repository.PromotionRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.repository.ShippingCarrierRepository;
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
        private PromotionRepository promotionRepository;

        @Mock
        private UserRepository userRepository;

        @Mock
        private ShippingCarrierRepository shippingCarrierRepository;

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
                                .status("ACTIVE")
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
                                                OrderItemRequest.builder().variantId(101L).quantity(2).build()))
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
                                                OrderItemRequest.builder().productId(10L).quantity(1).build()))
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
                when(productVariantRepository.deductStock(101L, 20)).thenReturn(0); // 0 affected rows = not enough
                                                                                    // stock!

                CheckoutRequest request = CheckoutRequest.builder()
                                .receiverName("Nguyen Van Khach")
                                .phoneNumber("0988776655")
                                .shippingAddress("123 Duong Le Loi, Q1, TP. HCM")
                                .items(List.of(
                                                OrderItemRequest.builder().variantId(101L).quantity(20).build()))
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
                                                OrderItemRequest.builder().variantId(101L).quantity(1).build()))
                                .build();

                assertThrows(UnauthorizedException.class, () -> orderService.checkout(request));
        }

        @Test
        void whenCheckout_withLockedAccount_thenThrowForbiddenException() {
                mockAuthentication("lockedUser");
                User lockedUser = User.builder()
                                .id(99L)
                                .username("lockedUser")
                                .role(Role.CUSTOMER)
                                .status(false) // Bị khóa
                                .build();
                when(userRepository.findByUsername("lockedUser")).thenReturn(Optional.of(lockedUser));

                CheckoutRequest request = CheckoutRequest.builder()
                                .receiverName("Khach Hang Bi Khoa")
                                .phoneNumber("0988776655")
                                .shippingAddress("123 Duong Le Loi, Q1, TP. HCM")
                                .items(List.of(
                                                OrderItemRequest.builder().variantId(101L).quantity(1).build()))
                                .build();

                assertThrows(ra.project.server.exception.ForbiddenException.class,
                                () -> orderService.checkout(request));
                verify(orderRepository, never()).save(any(Order.class));
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
                when(orderMapper.toResponse(order))
                                .thenReturn(OrderResponse.builder().id(100L).status(OrderStatus.PENDING).build());

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
                BadRequestException ex = assertThrows(BadRequestException.class,
                                () -> orderService.updateOrderStatus(101L, OrderStatus.CANCELLED));
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
                when(orderMapper.toResponse(any(Order.class))).thenAnswer(
                                i -> OrderResponse.builder().id(102L).status(OrderStatus.CANCELLED).build());

                ApiResponse<OrderResponse> resp = orderService.updateOrderStatus(102L, OrderStatus.CANCELLED);

                assertEquals(OrderStatus.CANCELLED, resp.getData().getStatus());
                verify(productVariantRepository, times(1)).restoreStock(101L, 3);
                verify(productRepository, times(1)).syncProductTotalStock(10L);
        }

        @Test
        void whenCheckoutSuccess_withCoupon_thenIncrementPromotionUsedCount() {
                mockAuthentication("customer1");
                when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));
                when(productVariantRepository.findById(101L)).thenReturn(Optional.of(variant1));
                when(productVariantRepository.deductStock(101L, 2)).thenReturn(1);

                Promotion promo = Promotion.builder()
                                .id(1L)
                                .code("GIAM10")
                                .title("Giảm 10%")
                                .discount("10%")
                                .status("ACTIVE")
                                .usedCount(5)
                                .maxUsage(100)
                                .type("ORDER")
                                .build();

                when(promotionRepository.findByCodeIgnoreCase("GIAM10")).thenReturn(Optional.of(promo));
                when(promotionRepository.save(any(Promotion.class))).thenAnswer(i -> i.getArgument(0));

                when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
                        Order saved = invocation.getArgument(0);
                        saved.setId(200L);
                        return saved;
                });

                OrderResponse expectedResponse = OrderResponse.builder()
                                .id(200L)
                                .userId(customer.getId())
                                .status(OrderStatus.PENDING)
                                .totalAmount(BigDecimal.valueOf(900000))
                                .couponCode("GIAM10")
                                .build();
                when(orderMapper.toResponse(any(Order.class))).thenReturn(expectedResponse);

                CheckoutRequest request = CheckoutRequest.builder()
                                .receiverName("Nguyen Van Khach")
                                .phoneNumber("0988776655")
                                .shippingAddress("123 Duong Le Loi, Q1, TP. HCM")
                                .couponCode("GIAM10")
                                .items(List.of(
                                                OrderItemRequest.builder().variantId(101L).quantity(2).build()))
                                .build();

                ApiResponse<OrderResponse> result = orderService.checkout(request);

                assertNotNull(result);
                assertTrue(result.isSuccess());
                assertEquals(6, promo.getUsedCount());
                verify(promotionRepository, times(1)).save(promo);
                verify(orderRepository, times(1)).save(any(Order.class));
        }

        @Test
        void whenCancelMyOrder_whenStatusIsPending_thenRestoreStockAndSetCancelled() {
                mockAuthentication("customer1");
                when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));

                OrderItem item = OrderItem.builder()
                                .product(product1)
                                .variant(variant1)
                                .quantity(2)
                                .price(BigDecimal.valueOf(500000))
                                .totalPrice(BigDecimal.valueOf(1000000))
                                .build();

                Order pendingOrder = Order.builder()
                                .id(300L)
                                .user(customer)
                                .status(OrderStatus.PENDING)
                                .orderItems(List.of(item))
                                .build();

                when(orderRepository.findById(300L)).thenReturn(Optional.of(pendingOrder));
                when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
                when(orderMapper.toResponse(any(Order.class)))
                                .thenReturn(OrderResponse.builder().id(300L).status(OrderStatus.CANCELLED).build());

                ApiResponse<OrderResponse> result = orderService.cancelMyOrder(300L);

                assertNotNull(result);
                assertTrue(result.isSuccess());
                assertEquals(OrderStatus.CANCELLED, result.getData().getStatus());
                verify(productVariantRepository, times(1)).restoreStock(101L, 2);
                verify(productRepository, times(1)).syncProductTotalStock(10L);
                verify(orderRepository, times(1)).save(pendingOrder);
                assertEquals(OrderStatus.CANCELLED, pendingOrder.getStatus());
        }

        @Test
        void whenCancelMyOrder_whenStatusIsNotPending_thenThrowBadRequestException() {
                mockAuthentication("customer1");
                when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));

                Order processingOrder = Order.builder()
                                .id(301L)
                                .user(customer)
                                .status(OrderStatus.PROCESSING)
                                .build();

                when(orderRepository.findById(301L)).thenReturn(Optional.of(processingOrder));

                BadRequestException ex = assertThrows(BadRequestException.class,
                                () -> orderService.cancelMyOrder(301L));
                assertTrue(ex.getMessage().contains("PENDING"));
                verify(productVariantRepository, never()).restoreStock(anyLong(), anyInt());
                verify(orderRepository, never()).save(any(Order.class));
        }

        @Test
        void whenCancelMyOrder_whenNotOwnerAndNotAdmin_thenThrowForbiddenException() {
                mockAuthentication("customer1");
                when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));

                User otherUser = User.builder().id(999L).username("other").role(Role.CUSTOMER).build();
                Order otherOrder = Order.builder()
                                .id(302L)
                                .user(otherUser)
                                .status(OrderStatus.PENDING)
                                .build();

                when(orderRepository.findById(302L)).thenReturn(Optional.of(otherOrder));

                assertThrows(ra.project.server.exception.ForbiddenException.class,
                                () -> orderService.cancelMyOrder(302L));
                verify(orderRepository, never()).save(any(Order.class));
        }

        @Test
        void whenGetMyOrderById_whenAuthorized_thenReturnOrder() {
                mockAuthentication("customer1");
                when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));

                Order order = Order.builder()
                                .id(400L)
                                .user(customer)
                                .status(OrderStatus.PENDING)
                                .build();

                when(orderRepository.findById(400L)).thenReturn(Optional.of(order));
                when(orderMapper.toResponse(order))
                                .thenReturn(OrderResponse.builder().id(400L).status(OrderStatus.PENDING).build());

                ApiResponse<OrderResponse> result = orderService.getMyOrderById(400L);

                assertNotNull(result);
                assertTrue(result.isSuccess());
                assertEquals(400L, result.getData().getId());
        }

        @Test
        void whenGetMyOrderById_whenNotOwner_thenThrowForbiddenException() {
                mockAuthentication("customer1");
                when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));

                User otherUser = User.builder().id(999L).username("other").role(Role.CUSTOMER).build();
                Order order = Order.builder()
                                .id(401L)
                                .user(otherUser)
                                .status(OrderStatus.PENDING)
                                .build();

                when(orderRepository.findById(401L)).thenReturn(Optional.of(order));

                assertThrows(ra.project.server.exception.ForbiddenException.class,
                                () -> orderService.getMyOrderById(401L));
        }

        @Test
        void whenCancelOrder_withLegacyProductNoVariant_thenRestoreProductStock() {
                OrderItem item = OrderItem.builder()
                                .product(product1)
                                .variant(null)
                                .quantity(3)
                                .build();

                Order order = Order.builder()
                                .id(303L)
                                .user(customer)
                                .status(OrderStatus.PENDING)
                                .orderItems(List.of(item))
                                .build();

                when(orderRepository.findById(303L)).thenReturn(Optional.of(order));
                when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
                when(orderMapper.toResponse(any(Order.class))).thenAnswer(
                                i -> OrderResponse.builder().id(303L).status(OrderStatus.CANCELLED).build());

                orderService.updateOrderStatus(303L, OrderStatus.CANCELLED);

                assertEquals(18, product1.getStock());
                verify(productRepository, times(1)).save(product1);
        }

        @Test
        void whenGetAllOrders_withStatus_thenReturnFilteredList() {
                Order order = Order.builder().id(10L).status(OrderStatus.PENDING).build();
                when(orderRepository.findByStatusOrderByCreatedAtDesc(OrderStatus.PENDING)).thenReturn(List.of(order));
                when(orderMapper.toResponse(order))
                                .thenReturn(OrderResponse.builder().id(10L).status(OrderStatus.PENDING).build());

                ApiResponse<List<OrderResponse>> result = orderService.getAllOrders(OrderStatus.PENDING);

                assertNotNull(result);
                assertEquals(1, result.getData().size());
                assertEquals(10L, result.getData().get(0).getId());
        }

        @Test
        void whenGetAllOrders_withoutStatus_thenReturnAllList() {
                Order order = Order.builder().id(11L).status(OrderStatus.COMPLETED).build();
                when(orderRepository.findAll(any(Sort.class))).thenReturn(List.of(order));
                when(orderMapper.toResponse(order))
                                .thenReturn(OrderResponse.builder().id(11L).status(OrderStatus.COMPLETED).build());

                ApiResponse<List<OrderResponse>> result = orderService.getAllOrders(null);

                assertNotNull(result);
                assertEquals(1, result.getData().size());
        }

        @Test
        void whenGetOrderById_whenExists_thenReturnOrder() {
                Order order = Order.builder().id(12L).status(OrderStatus.PENDING).build();
                when(orderRepository.findById(12L)).thenReturn(Optional.of(order));
                when(orderMapper.toResponse(order))
                                .thenReturn(OrderResponse.builder().id(12L).status(OrderStatus.PENDING).build());

                ApiResponse<OrderResponse> result = orderService.getOrderById(12L);

                assertNotNull(result);
                assertEquals(12L, result.getData().getId());
        }

        @Test
        void whenGetOrderById_whenNotFound_thenThrowResourceNotFoundException() {
                when(orderRepository.findById(999L)).thenReturn(Optional.empty());

                assertThrows(ResourceNotFoundException.class, () -> orderService.getOrderById(999L));
        }

        @Test
        void whenUpdateOrderStatus_toShippingWithCarrierAndTracking_thenSetDetails() {
                ShippingCarrier carrier = ShippingCarrier.builder().id(5L).code("GHN").name("Giao Hang Nhanh").build();
                Order order = Order.builder().id(20L).status(OrderStatus.PROCESSING).build();

                when(orderRepository.findById(20L)).thenReturn(Optional.of(order));
                when(shippingCarrierRepository.findById(5L)).thenReturn(Optional.of(carrier));
                when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
                when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> {
                        Order o = i.getArgument(0);
                        return OrderResponse.builder().id(o.getId()).status(o.getStatus()).build();
                });

                ApiResponse<OrderResponse> result = orderService.updateOrderStatus(20L, OrderStatus.SHIPPING, 5L,
                                "TRACK12345");

                assertNotNull(result);
                assertEquals(OrderStatus.SHIPPING, result.getData().getStatus());
                assertEquals("TRACK12345", order.getTrackingCode());
                assertEquals(carrier, order.getShippingCarrier());
        }

        @Test
        void whenUpdateOrderStatus_sameStatusNoCarrier_thenReturnUnchanged() {
                Order order = Order.builder().id(21L).status(OrderStatus.PENDING).build();
                when(orderRepository.findById(21L)).thenReturn(Optional.of(order));
                when(orderMapper.toResponse(order))
                                .thenReturn(OrderResponse.builder().id(21L).status(OrderStatus.PENDING).build());

                ApiResponse<OrderResponse> result = orderService.updateOrderStatus(21L, OrderStatus.PENDING, null,
                                null);

                assertNotNull(result);
                assertEquals("Trạng thái đơn hàng không thay đổi", result.getMessage());
        }

        @Test
        void whenCheckout_withShippingCouponAndCarrier_thenApplyShippingDiscount() {
                mockAuthentication("customer1");
                when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));
                when(productVariantRepository.findById(101L)).thenReturn(Optional.of(variant1));
                when(productVariantRepository.deductStock(101L, 1)).thenReturn(1);

                ShippingCarrier carrier = ShippingCarrier.builder()
                                .id(2L)
                                .name("Viettel Post")
                                .shippingFee(BigDecimal.valueOf(35000))
                                .build();
                when(shippingCarrierRepository.findById(2L)).thenReturn(Optional.of(carrier));

                Promotion shipPromo = Promotion.builder()
                                .id(50L)
                                .code("FREESHIP")
                                .type("SHIPPING")
                                .discount("100%")
                                .status("ACTIVE")
                                .usedCount(0)
                                .maxUsage(100)
                                .build();
                when(promotionRepository.findByCodeIgnoreCase("FREESHIP")).thenReturn(Optional.of(shipPromo));
                when(promotionRepository.save(any(Promotion.class))).thenAnswer(i -> i.getArgument(0));

                when(orderRepository.save(any(Order.class))).thenAnswer(i -> {
                        Order o = i.getArgument(0);
                        o.setId(500L);
                        return o;
                });

                when(orderMapper.toResponse(any(Order.class))).thenReturn(OrderResponse.builder().id(500L).build());

                CheckoutRequest request = CheckoutRequest.builder()
                                .receiverName("Khach Hang")
                                .phoneNumber("0912345678")
                                .shippingAddress("123 Duong ABC")
                                .carrierId(2L)
                                .shippingCouponCode("FREESHIP")
                                .items(List.of(OrderItemRequest.builder().variantId(101L).quantity(1).build()))
                                .build();

                ApiResponse<OrderResponse> result = orderService.checkout(request);

                assertNotNull(result);
                assertEquals(1, shipPromo.getUsedCount());
                verify(promotionRepository, times(1)).save(shipPromo);
        }

        @Test
        void whenCheckout_withDynamicSystemSettings_thenAppliesFreeshipThresholdAndBlocksDisabledPayment() {
                mockAuthentication("customer1");
                when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));
                when(productVariantRepository.findById(101L)).thenReturn(Optional.of(variant1));
                when(productVariantRepository.deductStock(101L, 2)).thenReturn(1);

                ra.project.server.service.SystemSettingService mockSettingService = mock(ra.project.server.service.SystemSettingService.class);
                ReflectionTestUtils.setField(orderService, "systemSettingService", mockSettingService);

                when(mockSettingService.getBoolean("payment.codEnabled", true)).thenReturn(false);
                CheckoutRequest codBlockedRequest = CheckoutRequest.builder()
                                .receiverName("Khach Hang")
                                .phoneNumber("0912345678")
                                .shippingAddress("123 Duong ABC")
                                .paymentMethod(PaymentMethod.COD)
                                .items(List.of(OrderItemRequest.builder().variantId(101L).quantity(2).build()))
                                .build();
                assertThrows(BadRequestException.class, () -> orderService.checkout(codBlockedRequest));

                when(mockSettingService.getBoolean("payment.sepayEnabled", true)).thenReturn(true);
                when(mockSettingService.getDecimal("shipping.defaultFee", BigDecimal.valueOf(30000))).thenReturn(BigDecimal.valueOf(45000));
                when(mockSettingService.getDecimal("shipping.freeshipThreshold", BigDecimal.valueOf(20_000_000))).thenReturn(BigDecimal.valueOf(1_000_000));
                when(mockSettingService.getDecimal("shipping.halfShipThreshold", BigDecimal.valueOf(10_000_000))).thenReturn(BigDecimal.valueOf(500_000));

                when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
                when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> {
                        Order o = i.getArgument(0);
                        return OrderResponse.builder().id(99L).shippingFee(o.getShippingFee()).totalAmount(o.getTotalAmount()).build();
                });

                CheckoutRequest freeshipRequest = CheckoutRequest.builder()
                                .receiverName("Khach Hang")
                                .phoneNumber("0912345678")
                                .shippingAddress("123 Duong ABC")
                                .paymentMethod(PaymentMethod.SEPAY)
                                .items(List.of(OrderItemRequest.builder().variantId(101L).quantity(2).build()))
                                .build();
                ApiResponse<OrderResponse> res = orderService.checkout(freeshipRequest);
                assertEquals(BigDecimal.ZERO, res.getData().getShippingFee());
        }

        @Test
        void whenCancelMyOrder_withReason_thenPersistsReason() {
                mockAuthentication("customer1");
                when(userRepository.findByUsername("customer1")).thenReturn(Optional.of(customer));
                Order order = Order.builder()
                                .id(77L)
                                .user(customer)
                                .status(OrderStatus.PENDING)
                                .build();
                when(orderRepository.findById(77L)).thenReturn(Optional.of(order));
                when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
                when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> {
                        Order o = i.getArgument(0);
                        return OrderResponse.builder().id(o.getId()).status(o.getStatus()).build();
                });

                orderService.cancelMyOrder(77L, "Đặt nhầm màu sản phẩm");

                assertEquals(OrderStatus.CANCELLED, order.getStatus());
                assertEquals("Đặt nhầm màu sản phẩm", order.getCancelReason());
        }
}
