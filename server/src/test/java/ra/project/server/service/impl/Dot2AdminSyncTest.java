package ra.project.server.service.impl;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.mapper.OrderMapper;
import ra.project.server.model.dto.request.AdminOrderUpdateRequest;
import ra.project.server.model.dto.response.AdminUserResponse;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.Promotion;
import ra.project.server.model.entity.Supplier;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.model.enums.PaymentStatus;
import ra.project.server.model.enums.Role;
import ra.project.server.controller.AdminPromotionController;
import ra.project.server.controller.AdminSupplierController;
import ra.project.server.repository.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Dot2AdminSyncTest {

    @Mock private UserRepository userRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private UserServiceImpl userService;

    @Mock private PromotionRepository promotionRepository;
    @InjectMocks private AdminPromotionController adminPromotionController;

    @Mock private SupplierRepository supplierRepository;
    @InjectMocks private AdminSupplierController adminSupplierController;

    @Mock private ProductRepository productRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private OrderMapper orderMapper;
    @Mock private ShippingCarrierRepository shippingCarrierRepository;
    @InjectMocks private OrderServiceImpl orderService;

    @Test
    @DisplayName("deleteAdminUser khi khách đã có đơn hàng phải khóa mềm thay vì xóa đơn hàng")
    void deleteAdminUser_withOrders_softLocksInsteadOfDeleting() {
        User customer = User.builder().id(5L).username("khach").role(Role.CUSTOMER).status(true).build();
        Order order = Order.builder().id(101L).user(customer).totalAmount(BigDecimal.valueOf(1000000)).status(OrderStatus.COMPLETED).build();

        when(userRepository.findById(5L)).thenReturn(Optional.of(customer));
        when(orderRepository.findByUserIdOrderByCreatedAtDesc(5L)).thenReturn(List.of(order));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        ApiResponse<Map<String, Object>> res = userService.deleteAdminUser(5L);

        assertFalse((Boolean) res.getData().get("deleted"));
        assertTrue((Boolean) res.getData().get("locked"));
        assertFalse(customer.getStatus());
        verify(userRepository, never()).delete(any());
        verify(userRepository, times(1)).save(customer);
    }

    @Test
    @DisplayName("updatePromotion giữ nguyên usedCount khi omitted và lưu maxDiscountAmount")
    void adminUpdatePromotion_preservesUsedCountAndMaxDiscount() {
        Promotion existing = Promotion.builder()
                .id(1L).code("SALE20").title("Cũ").discount("20%").usedCount(7).maxUsage(100).status("ACTIVE")
                .build();
        Promotion req = Promotion.builder()
                .code("sale20").title("Mới").discount("20%").maxDiscountAmount(BigDecimal.valueOf(500000)).maxUsage(200).status("INACTIVE")
                .build();

        when(promotionRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(promotionRepository.existsByCodeIgnoreCaseAndIdNot("SALE20", 1L)).thenReturn(false);
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(i -> i.getArgument(0));

        Promotion updated = adminPromotionController.updatePromotion(1L, req).getBody().getData();

        assertEquals(7, updated.getUsedCount());
        assertEquals(BigDecimal.valueOf(500000), updated.getMaxDiscountAmount());
        assertEquals("INACTIVE", updated.getStatus());
    }

    @Test
    @DisplayName("AdminSupplierController chặn trùng mã NCC khi cập nhật và đổi trạng thái")
    void adminSupplier_rejectsDuplicateCodeOnUpdateAndTogglesStatus() {
        Supplier s1 = Supplier.builder().id(1L).code("NCC-A").name("A").status("ACTIVE").build();
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(s1));
        when(supplierRepository.existsByCodeIgnoreCaseAndIdNot("NCC-B", 1L)).thenReturn(true);

        Supplier dupReq = Supplier.builder().code("ncc-b").name("A updated").build();
        assertThrows(BadRequestException.class, () -> adminSupplierController.updateSupplier(1L, dupReq));

        when(supplierRepository.save(any(Supplier.class))).thenAnswer(i -> i.getArgument(0));
        Supplier toggled = adminSupplierController.toggleSupplierStatus(1L, null, null).getBody().getData();
        assertEquals("INACTIVE", toggled.getStatus());
    }

    @Test
    @DisplayName("updateOrderInfo lưu thông tin người nhận, ghi chú và trạng thái thanh toán")
    void updateOrderInfo_persistsCustomerAndPaymentStatus() {
        Order order = Order.builder()
                .id(55L)
                .receiverName("Tên cũ")
                .phoneNumber("0900000000")
                .shippingAddress("Địa chỉ cũ")
                .paymentMethod(PaymentMethod.COD)
                .paymentStatus(PaymentStatus.UNPAID)
                .status(OrderStatus.PENDING)
                .build();

        when(orderRepository.findById(55L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            return OrderResponse.builder()
                    .id(o.getId())
                    .receiverName(o.getReceiverName())
                    .paymentStatus(o.getPaymentStatus())
                    .build();
        });

        AdminOrderUpdateRequest req = AdminOrderUpdateRequest.builder()
                .receiverName("Nguyễn Văn Mới")
                .phoneNumber("0912345678")
                .shippingAddress("123 Lê Lợi, Q1")
                .note("Giao giờ hành chính")
                .paymentStatus(PaymentStatus.PAID)
                .build();

        ApiResponse<OrderResponse> res = orderService.updateOrderInfo(55L, req);

        assertEquals("Nguyễn Văn Mới", res.getData().getReceiverName());
        assertEquals(PaymentStatus.PAID, res.getData().getPaymentStatus());
        assertNotNull(order.getPaidAt());
        assertEquals("Giao giờ hành chính", order.getNote());
    }

    @Test
    @DisplayName("updateUserStatus khi status=null vẫn trả về thông báo khớp trạng thái mới")
    void updateUserStatus_toggleMessageMatchesNewStatus() {
        User u = User.builder().id(8L).username("khach2").role(Role.CUSTOMER).status(false).build();
        when(userRepository.findById(8L)).thenReturn(Optional.of(u));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(orderRepository.findByUserIdOrderByCreatedAtDesc(8L)).thenReturn(List.of());

        ApiResponse<AdminUserResponse> res = userService.updateUserStatus(8L, null);

        assertTrue(res.getData().getStatus());
        assertTrue(res.getMessage().contains("kích hoạt"));
    }
}
