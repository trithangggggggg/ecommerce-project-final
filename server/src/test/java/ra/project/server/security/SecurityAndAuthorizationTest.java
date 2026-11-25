package ra.project.server.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ForbiddenException;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.mapper.OrderMapper;
import ra.project.server.model.dto.request.CheckoutRequest;
import ra.project.server.model.dto.request.LoginRequest;
import ra.project.server.model.dto.request.OrderItemRequest;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.ProductVariant;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.repository.ProductVariantRepository;
import ra.project.server.repository.PromotionRepository;
import ra.project.server.repository.ShippingCarrierRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.service.impl.AuthServiceImpl;
import ra.project.server.service.impl.OrderServiceImpl;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * [TEST_06] Test Suite: Bảo mật & Phân quyền (Security & Authorization Test Suite)
 * Kiểm thử toàn diện theo chuẩn OWASP Top 10:
 * 1. Xác thực JWT (Authentication) & Token hết hạn/giả mạo
 * 2. Phân quyền người dùng (Authorization & RBAC: CUSTOMER vs ADMIN)
 * 3. Chống Cross-Site Scripting (XSS)
 * 4. Chống SQL Injection (SQLi)
 * 5. Chống Insecure Direct Object References (IDOR)
 * 6. Kiểm soát dữ liệu đầu vào (Input Validation & Server-side Price Derivation)
 * 7. Kiểm soát tài khoản bị khóa (Locked Account Enforcement)
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("[TEST_06] Kiểm thử Bảo mật & Phân quyền (OWASP Top 10)")
class SecurityAndAuthorizationTest {

    private JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private PromotionRepository promotionRepository;

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

    @InjectMocks
    private AuthServiceImpl authService;

    private User customerUserA;
    private User customerUserB;
    private User adminUser;
    private User lockedUser;

    @BeforeEach
    void setUp() {
        // Cấu hình JwtTokenProvider độc lập
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", 3600000L); // 1 giờ

        customerUserA = User.builder()
                .id(1L)
                .username("customerA")
                .email("customera@example.com")
                .password(passwordEncoder.encode("Password123"))
                .fullName("Nguyễn Văn A")
                .role(Role.CUSTOMER)
                .status(true)
                .build();

        customerUserB = User.builder()
                .id(2L)
                .username("customerB")
                .email("customerb@example.com")
                .password(passwordEncoder.encode("Password123"))
                .fullName("Trần Thị B")
                .role(Role.CUSTOMER)
                .status(true)
                .build();

        adminUser = User.builder()
                .id(99L)
                .username("admin")
                .email("admin@nexor.vn")
                .password(passwordEncoder.encode("AdminPass123"))
                .fullName("Quản trị viên")
                .role(Role.ADMIN)
                .status(true)
                .build();

        lockedUser = User.builder()
                .id(4L)
                .username("lockedUser")
                .email("locked@example.com")
                .password(passwordEncoder.encode("Password123"))
                .fullName("Người Dùng Bị Khóa")
                .role(Role.CUSTOMER)
                .status(false) // Bị khóa
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockSecurityContext(User user) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(user.getUsername());
        when(authentication.getName()).thenReturn(user.getUsername());
        SecurityContextHolder.setContext(securityContext);
    }

    // =========================================================================
    // 2.1. KIỂM THỬ XÁC THỰC JWT (AUTHENTICATION)
    // =========================================================================

    @Test
    @DisplayName("2.1.1: Truy cập tài nguyên bảo vệ khi chưa xác thực -> Trả về 401 Unauthorized")
    void whenUnauthenticatedAccess_thenEntryPointReturns401() throws IOException {
        JwtAuthenticationEntryPoint entryPoint = new JwtAuthenticationEntryPoint();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(request, response, new BadCredentialsException("Full authentication is required"));

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"status\":401"));
        assertTrue(response.getContentAsString().contains("Bạn cần đăng nhập hoặc cung cấp token hợp lệ"));
    }

    @Test
    @DisplayName("2.1.2: Gửi token giả mạo (Fake Token) -> validateToken trả về false")
    void whenFakeTokenProvided_thenValidationFails() {
        String fakeToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.tampered_signature";
        assertFalse(jwtTokenProvider.validateToken(fakeToken));
    }

    @Test
    @DisplayName("2.1.3: Gửi token hết hạn (Expired Token) -> validateToken từ chối xác thực")
    void whenExpiredTokenProvided_thenValidationFails() {
        JwtTokenProvider shortLivedProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(shortLivedProvider, "jwtSecret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        ReflectionTestUtils.setField(shortLivedProvider, "jwtExpirationMs", -1000L); // Đã hết hạn ngay từ khi tạo

        String expiredToken = shortLivedProvider.generateTokenFromUsername("testuser");
        assertFalse(shortLivedProvider.validateToken(expiredToken));
    }

    @Test
    @DisplayName("2.1.4: Token hợp lệ sinh từ hệ thống -> validateToken trả về true và trích xuất đúng username")
    void whenValidTokenProvided_thenValidationSucceeds() {
        String token = jwtTokenProvider.generateTokenFromUsername("customerA");
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("customerA", jwtTokenProvider.getUsernameFromJwt(token));
    }

    // =========================================================================
    // 2.2. KIỂM THỬ PHÂN QUYỀN (AUTHORIZATION & RBAC)
    // =========================================================================

    @Test
    @DisplayName("2.2.1: CustomUserDetails xây dựng quyền hạn chính xác theo Role")
    void whenCustomUserDetailsBuilt_authoritiesIncludeRolePrefix() {
        CustomUserDetails customerDetails = CustomUserDetails.build(customerUserA);
        assertTrue(customerDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
        assertTrue(customerDetails.getAuthorities().contains(new SimpleGrantedAuthority("CUSTOMER")));

        CustomUserDetails adminDetails = CustomUserDetails.build(adminUser);
        assertTrue(adminDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN")));
        assertTrue(adminDetails.getAuthorities().contains(new SimpleGrantedAuthority("ADMIN")));
    }

    @Test
    @DisplayName("2.2.2: Tài khoản CUSTOMER không có quyền ADMIN")
    void whenCustomerTriesAdminPrivileges_thenHasRoleAdminIsFalse() {
        CustomUserDetails customerDetails = CustomUserDetails.build(customerUserA);
        boolean isAdmin = customerDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        assertFalse(isAdmin);
    }

    // =========================================================================
    // 2.3. KIỂM THỬ CROSS-SITE SCRIPTING (XSS)
    // =========================================================================

    @Test
    @DisplayName("2.3.1: Payload XSS trong receiverName và địa chỉ đặt hàng được lưu trữ an toàn dưới dạng chuỗi thuần")
    void whenXssPayloadSentInCheckout_thenHandledSafelyAsLiteralString() {
        mockSecurityContext(customerUserA);
        when(userRepository.findByUsername("customerA")).thenReturn(Optional.of(customerUserA));

        Product product = Product.builder().id(10L).name("Tai nghe").price(BigDecimal.valueOf(100000)).build();
        ProductVariant variant = ProductVariant.builder().id(101L).product(product).price(BigDecimal.valueOf(100000)).stock(10).status(true).build();

        when(productVariantRepository.findById(101L)).thenReturn(Optional.of(variant));
        when(productVariantRepository.deductStock(101L, 1)).thenReturn(1);

        String xssPayloadName = "<script>alert('XSS_ATTACK_NAME')</script>";
        String xssPayloadAddress = "<img src=x onerror=alert('XSS_ATTACK_ADDR')>";

        when(orderRepository.save(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            o.setId(100L);
            return o;
        });

        when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            return OrderResponse.builder()
                    .id(o.getId())
                    .receiverName(o.getReceiverName())
                    .shippingAddress(o.getShippingAddress())
                    .build();
        });

        CheckoutRequest request = CheckoutRequest.builder()
                .receiverName(xssPayloadName)
                .phoneNumber("0912345678")
                .shippingAddress(xssPayloadAddress)
                .items(List.of(OrderItemRequest.builder().variantId(101L).quantity(1).build()))
                .build();

        ApiResponse<OrderResponse> result = orderService.checkout(request);

        assertNotNull(result);
        assertEquals(xssPayloadName, result.getData().getReceiverName());
        assertEquals(xssPayloadAddress, result.getData().getShippingAddress());
        // Chuỗi payload được lưu thuần túy và trả về dưới dạng JSON, không bị thực thi thành script
    }

    // =========================================================================
    // 2.4. KIỂM THỬ CHỐNG SQL INJECTION (SQLi)
    // =========================================================================

    @Test
    @DisplayName("2.4.1: Tấn công SQL Injection tại ô đăng nhập (' OR 1=1 --) -> Bị từ chối an toàn với 401")
    void whenSqlInjectionPayloadInLogin_thenAuthenticationFailsSafely() {
        String sqliUsername = "admin' OR '1'='1";
        String sqliPassword = "' OR '1'='1' --";

        ReflectionTestUtils.setField(authService, "userRepository", userRepository);
        ReflectionTestUtils.setField(authService, "passwordEncoder", passwordEncoder);

        // Spring Data JPA xử lý truy vấn có tham số hóa (Parameterized Query)
        when(userRepository.findByEmailIgnoreCase(sqliUsername)).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase(sqliUsername)).thenReturn(Optional.empty());

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail(sqliUsername)
                .password(sqliPassword)
                .build();

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> authService.login(request));
        assertEquals("Tên đăng nhập hoặc mật khẩu không chính xác", ex.getMessage());
    }

    // =========================================================================
    // 2.5. KIỂM THỬ INSECURE DIRECT OBJECT REFERENCE (IDOR)
    // =========================================================================

    @Test
    @DisplayName("2.5.1: Tài khoản A truy cập đơn hàng của Tài khoản B qua getMyOrderById -> Bị chặn 403 Forbidden")
    void whenUserAAccessesUserBOrder_thenThrowForbiddenException() {
        mockSecurityContext(customerUserA);
        when(userRepository.findByUsername("customerA")).thenReturn(Optional.of(customerUserA));

        Order orderOfUserB = Order.builder()
                .id(200L)
                .user(customerUserB) // Đơn hàng thuộc quyền sở hữu của User B
                .status(OrderStatus.PENDING)
                .build();

        when(orderRepository.findById(200L)).thenReturn(Optional.of(orderOfUserB));

        ForbiddenException ex = assertThrows(ForbiddenException.class, () -> orderService.getMyOrderById(200L));
        assertEquals("Bạn không có quyền xem đơn hàng này", ex.getMessage());
    }

    @Test
    @DisplayName("2.5.2: Tài khoản A cố tình hủy đơn hàng của Tài khoản B qua cancelMyOrder -> Bị chặn 403 Forbidden")
    void whenUserACancelsUserBOrder_thenThrowForbiddenException() {
        mockSecurityContext(customerUserA);
        when(userRepository.findByUsername("customerA")).thenReturn(Optional.of(customerUserA));

        Order orderOfUserB = Order.builder()
                .id(200L)
                .user(customerUserB)
                .status(OrderStatus.PENDING)
                .build();

        when(orderRepository.findById(200L)).thenReturn(Optional.of(orderOfUserB));

        ForbiddenException ex = assertThrows(ForbiddenException.class, () -> orderService.cancelMyOrder(200L));
        assertEquals("Bạn không có quyền thao tác trên đơn hàng này", ex.getMessage());
    }

    @Test
    @DisplayName("2.5.3: Tài khoản Admin được phép xem đơn hàng của bất kỳ người dùng nào")
    void whenAdminAccessesAnyOrder_thenAllowAccess() {
        mockSecurityContext(adminUser);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));

        Order orderOfUserB = Order.builder()
                .id(200L)
                .user(customerUserB)
                .status(OrderStatus.PENDING)
                .build();

        when(orderRepository.findById(200L)).thenReturn(Optional.of(orderOfUserB));
        when(orderMapper.toResponse(orderOfUserB)).thenReturn(OrderResponse.builder().id(200L).build());

        ApiResponse<OrderResponse> result = orderService.getMyOrderById(200L);
        assertNotNull(result);
        assertEquals(200L, result.getData().getId());
    }

    // =========================================================================
    // 2.6. KIỂM THỬ DỮ LIỆU ĐẦU VÀO (INPUT VALIDATION)
    // =========================================================================

    @Test
    @DisplayName("2.6.1: Gửi số lượng sản phẩm bằng 0 hoặc số âm khi Checkout -> Bị từ chối với 400 Bad Request")
    void whenZeroOrNegativeQuantitySent_thenThrowBadRequestException() {
        mockSecurityContext(customerUserA);
        when(userRepository.findByUsername("customerA")).thenReturn(Optional.of(customerUserA));

        CheckoutRequest requestZero = CheckoutRequest.builder()
                .receiverName("Nguyễn Văn A")
                .phoneNumber("0912345678")
                .shippingAddress("Hà Nội")
                .items(List.of(OrderItemRequest.builder().variantId(101L).quantity(0).build()))
                .build();

        BadRequestException exZero = assertThrows(BadRequestException.class, () -> orderService.checkout(requestZero));
        assertTrue(exZero.getMessage().contains("phải lớn hơn 0"));

        CheckoutRequest requestNegative = CheckoutRequest.builder()
                .receiverName("Nguyễn Văn A")
                .phoneNumber("0912345678")
                .shippingAddress("Hà Nội")
                .items(List.of(OrderItemRequest.builder().variantId(101L).quantity(-5).build()))
                .build();

        BadRequestException exNegative = assertThrows(BadRequestException.class, () -> orderService.checkout(requestNegative));
        assertTrue(exNegative.getMessage().contains("phải lớn hơn 0"));
    }

    @Test
    @DisplayName("2.6.2: Danh sách items rỗng khi Checkout -> Bị từ chối với 400 Bad Request")
    void whenEmptyItemsSent_thenThrowBadRequestException() {
        mockSecurityContext(customerUserA);
        when(userRepository.findByUsername("customerA")).thenReturn(Optional.of(customerUserA));

        CheckoutRequest emptyItemsRequest = CheckoutRequest.builder()
                .receiverName("Nguyễn Văn A")
                .phoneNumber("0912345678")
                .shippingAddress("Hà Nội")
                .items(List.of())
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> orderService.checkout(emptyItemsRequest));
        assertTrue(ex.getMessage().contains("không được để trống"));
    }

    @Test
    @DisplayName("2.6.3: Giá sản phẩm do Backend tự tính từ Database, không chấp nhận giá can thiệp từ Client")
    void whenPricingCalculated_thenStrictlyDerivedFromDatabaseEntity() {
        mockSecurityContext(customerUserA);
        when(userRepository.findByUsername("customerA")).thenReturn(Optional.of(customerUserA));

        Product product = Product.builder().id(10L).name("Chuột Gaming").price(BigDecimal.valueOf(800000)).build();
        ProductVariant variant = ProductVariant.builder().id(105L).product(product).price(BigDecimal.valueOf(800000)).stock(5).status(true).build();

        when(productVariantRepository.findById(105L)).thenReturn(Optional.of(variant));
        when(productVariantRepository.deductStock(105L, 2)).thenReturn(1);

        when(orderRepository.save(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            o.setId(301L);
            return o;
        });

        when(orderMapper.toResponse(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            return OrderResponse.builder().id(o.getId()).totalAmount(o.getTotalAmount()).build();
        });

        CheckoutRequest request = CheckoutRequest.builder()
                .receiverName("Nguyễn Văn A")
                .phoneNumber("0912345678")
                .shippingAddress("Hà Nội")
                .items(List.of(OrderItemRequest.builder().variantId(105L).quantity(2).build()))
                .build();

        ApiResponse<OrderResponse> result = orderService.checkout(request);

        assertNotNull(result);
        // 2 * 800.000₫ = 1.600.000₫ + 30.000₫ ship = 1.630.000₫
        assertEquals(BigDecimal.valueOf(1630000), result.getData().getTotalAmount());
    }

    // =========================================================================
    // 2.7. KIỂM THỬ TÀI KHOẢN BỊ KHÓA (LOCKED ACCOUNT)
    // =========================================================================

    @Test
    @DisplayName("2.7.1: Tài khoản có trạng thái bị khóa (status = false) đăng nhập -> Bị chặn với 400 Bad Request")
    void whenLockedUserAttemptsLogin_thenRejectWithBadRequestException() {
        ReflectionTestUtils.setField(authService, "userRepository", userRepository);

        when(userRepository.findByEmailIgnoreCase("lockedUser")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("lockedUser")).thenReturn(Optional.of(lockedUser));

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("lockedUser")
                .password("Password123")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(request));
        assertTrue(ex.getMessage().contains("chưa được kích hoạt") || ex.getMessage().contains("đã bị khóa"));
    }

    @Test
    @DisplayName("2.7.2: Tài khoản bị khóa (status = false) cố tình đặt hàng -> Bị chặn với 403 Forbidden")
    void whenLockedUserAttemptsCheckout_thenRejectWithForbiddenException() {
        mockSecurityContext(lockedUser);
        when(userRepository.findByUsername("lockedUser")).thenReturn(Optional.of(lockedUser));

        CheckoutRequest request = CheckoutRequest.builder()
                .receiverName("Người Dùng Bị Khóa")
                .phoneNumber("0912345678")
                .shippingAddress("Hà Nội")
                .items(List.of(OrderItemRequest.builder().variantId(101L).quantity(1).build()))
                .build();

        ForbiddenException ex = assertThrows(ForbiddenException.class, () -> orderService.checkout(request));
        assertTrue(ex.getMessage().contains("Tài khoản của bạn đã bị khóa"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("2.7.3: CustomUserDetails đánh dấu isAccountNonLocked = false và isEnabled = false khi status = false")
    void whenUserDetailsCreatedForLockedUser_thenNonLockedAndEnabledAreFalse() {
        CustomUserDetails userDetails = CustomUserDetails.build(lockedUser);
        assertFalse(userDetails.isAccountNonLocked());
        assertFalse(userDetails.isEnabled());
    }
}

