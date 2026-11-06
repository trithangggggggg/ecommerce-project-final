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
import ra.project.server.model.dto.response.PromotionCheckResponse;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.Promotion;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.PromotionRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.service.impl.PromotionServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PromotionServiceImplTest {

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private PromotionServiceImpl promotionService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .username("testuser")
                .fullName("Test User")
                .role(Role.CUSTOMER)
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

    // =========================================================================
    // 1. Kiểm tra mã hết hạn (expiryDate < today)
    // =========================================================================
    @Test
    @DisplayName("Nghiệm thu: Voucher hết hạn -> ném lỗi BadRequestException")
    void whenPromotionExpired_thenThrowBadRequestException() {
        String pastDate = LocalDate.now().minusDays(2).toString();
        Promotion promo = Promotion.builder()
                .id(1L)
                .code("EXPIRED10")
                .title("Mã đã hết hạn")
                .discount("10%")
                .status("ACTIVE")
                .expiry(pastDate)
                .usedCount(0)
                .maxUsage(100)
                .build();

        when(promotionRepository.findByCodeIgnoreCase("EXPIRED10")).thenReturn(Optional.of(promo));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("EXPIRED10", BigDecimal.valueOf(500000), sampleUser)
        );

        assertTrue(ex.getMessage().contains("đã hết hạn"));
        assertTrue(ex.getMessage().contains("EXPIRED10"));
    }

    // =========================================================================
    // 2. Kiểm tra mã chưa tới ngày áp dụng (startDate > today)
    // =========================================================================
    @Test
    @DisplayName("Nghiệm thu: Voucher chưa tới ngày áp dụng -> ném lỗi BadRequestException")
    void whenPromotionNotStartedYet_thenThrowBadRequestException() {
        String futureDate = LocalDate.now().plusDays(5).toString();
        Promotion promo = Promotion.builder()
                .id(2L)
                .code("FUTURE20")
                .title("Mã khuyến mãi tương lai")
                .discount("20%")
                .status("ACTIVE")
                .startDate(futureDate)
                .expiry(LocalDate.now().plusDays(30).toString())
                .usedCount(0)
                .maxUsage(100)
                .build();

        when(promotionRepository.findByCodeIgnoreCase("FUTURE20")).thenReturn(Optional.of(promo));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("FUTURE20", BigDecimal.valueOf(500000), sampleUser)
        );

        assertTrue(ex.getMessage().contains("chưa tới ngày áp dụng"));
        assertTrue(ex.getMessage().contains("FUTURE20"));
    }

    // =========================================================================
    // 3. Kiểm tra mã hết lượt sử dụng (usedCount >= maxUsage)
    // =========================================================================
    @Test
    @DisplayName("Nghiệm thu: Voucher đã dùng hết số lượt -> ném lỗi BadRequestException")
    void whenPromotionMaxUsageReached_thenThrowBadRequestException() {
        Promotion promo = Promotion.builder()
                .id(3L)
                .code("SOLD_OUT")
                .title("Mã đã hết lượt dùng")
                .discount("50k")
                .status("ACTIVE")
                .usedCount(100)
                .maxUsage(100)
                .build();

        when(promotionRepository.findByCodeIgnoreCase("SOLD_OUT")).thenReturn(Optional.of(promo));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("SOLD_OUT", BigDecimal.valueOf(500000), sampleUser)
        );

        assertTrue(ex.getMessage().contains("đã hết số lượt sử dụng"));
        assertTrue(ex.getMessage().contains("SOLD_OUT"));
    }

    // =========================================================================
    // 4. Kiểm tra đơn hàng dưới giá trị tối thiểu (subtotal < minOrder)
    // =========================================================================
    @Test
    @DisplayName("Nghiệm thu: Giá trị đơn hàng dưới mức tối thiểu -> ném lỗi BadRequestException")
    void whenPromotionBelowMinOrder_thenThrowBadRequestException() {
        Promotion promo = Promotion.builder()
                .id(4L)
                .code("BIGORDER")
                .title("Giảm 50.000₫ cho đơn từ 500.000₫")
                .discount("50.000")
                .minOrder("500.000₫")
                .status("ACTIVE")
                .usedCount(0)
                .maxUsage(100)
                .build();

        when(promotionRepository.findByCodeIgnoreCase("BIGORDER")).thenReturn(Optional.of(promo));

        // Subtotal chỉ có 300.000₫ < 500.000₫
        BigDecimal subtotal = BigDecimal.valueOf(300000);
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("BIGORDER", subtotal, sampleUser)
        );

        assertTrue(ex.getMessage().contains("chưa đạt giá trị tối thiểu"));
    }

    // =========================================================================
    // 5. Kiểm tra tính giảm giá theo tỷ lệ phần trăm (%)
    // =========================================================================
    @Test
    @DisplayName("Nghiệm thu: Tính giảm giá theo tỷ lệ phần trăm (%) chính xác")
    void whenCalculateDiscount_withPercentage_thenReturnAccurateAmount() {
        BigDecimal baseAmount = BigDecimal.valueOf(2000000); // 2 triệu

        // 10% của 2 triệu = 200.000
        BigDecimal discount10 = promotionService.calculateDiscountAmount(baseAmount, "10%", null);
        assertEquals(BigDecimal.valueOf(200000), discount10);

        // 25% của 2 triệu = 500.000
        BigDecimal discount25 = promotionService.calculateDiscountAmount(baseAmount, "25%", null);
        assertEquals(BigDecimal.valueOf(500000), discount25);

        // 100% của 30.000 cước ship = 30.000
        BigDecimal freeship = promotionService.calculateDiscountAmount(BigDecimal.valueOf(30000), "100%", null);
        assertEquals(BigDecimal.valueOf(30000), freeship);
    }

    // =========================================================================
    // 6. Kiểm tra tính giảm giá cố định (số tiền VND)
    // =========================================================================
    @Test
    @DisplayName("Nghiệm thu: Tính giảm giá cố định (Fixed Amount) chính xác")
    void whenCalculateDiscount_withFixedAmount_thenReturnFixedAmount() {
        BigDecimal baseAmount = BigDecimal.valueOf(500000);

        // Giảm 50.000₫
        BigDecimal discount = promotionService.calculateDiscountAmount(baseAmount, "50.000₫", null);
        assertEquals(BigDecimal.valueOf(50000), discount);

        // Giảm 100000 bare number
        BigDecimal discountBare = promotionService.calculateDiscountAmount(baseAmount, "100000", null);
        assertEquals(BigDecimal.valueOf(100000), discountBare);

        // Nếu số tiền giảm lớn hơn giá trị đơn hàng -> không được giảm âm, chỉ tối đa bằng baseAmount
        BigDecimal hugeDiscount = promotionService.calculateDiscountAmount(BigDecimal.valueOf(30000), "100000", null);
        assertEquals(BigDecimal.valueOf(30000), hugeDiscount);
    }

    // =========================================================================
    // 7. Kiểm tra chặn trần khi giảm giá vượt max_discount_amount
    // =========================================================================
    @Test
    @DisplayName("Nghiệm thu: Giảm giá phần trăm vượt trần max_discount_amount -> bị giới hạn đúng mức trần")
    void whenCalculateDiscount_exceedsMaxDiscountAmount_thenCapAtMaxDiscountAmount() {
        BigDecimal baseAmount = BigDecimal.valueOf(10_000_000); // 10 triệu
        String discountStr = "20%"; // 20% của 10 triệu = 2.000.000₫
        BigDecimal maxCap = BigDecimal.valueOf(500_000); // Nhưng tối đa chỉ cho giảm 500.000₫

        BigDecimal finalDiscount = promotionService.calculateDiscountAmount(baseAmount, discountStr, maxCap);

        assertEquals(maxCap, finalDiscount);
        assertEquals(BigDecimal.valueOf(500000), finalDiscount);
    }

    @Test
    @DisplayName("Khi giảm giá không vượt trần max_discount_amount -> giữ nguyên số tiền giảm")
    void whenCalculateDiscount_underMaxDiscountAmount_thenKeepCalculatedDiscount() {
        BigDecimal baseAmount = BigDecimal.valueOf(1_000_000);
        String discountStr = "10%"; // 10% = 100.000₫
        BigDecimal maxCap = BigDecimal.valueOf(300_000);

        BigDecimal finalDiscount = promotionService.calculateDiscountAmount(baseAmount, discountStr, maxCap);

        assertEquals(BigDecimal.valueOf(100000), finalDiscount);
    }

    // =========================================================================
    // 8. Kiểm thử API checkPromotion với Order Promo & Shipping Promo
    // =========================================================================
    @Test
    @DisplayName("checkPromotion: Áp dụng thành công mã giảm giá đơn hàng ORDER")
    void whenCheckPromotion_withValidOrderPromo_thenReturnSuccessResponse() {
        Promotion promo = Promotion.builder()
                .id(10L)
                .code("SALE15")
                .title("Giảm 15% tổng hóa đơn")
                .discount("15%")
                .status("ACTIVE")
                .type("ORDER")
                .usedCount(10)
                .maxUsage(500)
                .expiry(LocalDate.now().plusDays(10).toString())
                .build();

        when(promotionRepository.findByCodeIgnoreCase("SALE15")).thenReturn(Optional.of(promo));

        ApiResponse<PromotionCheckResponse> response = promotionService.checkPromotion(
                "SALE15",
                BigDecimal.valueOf(1000000),
                BigDecimal.valueOf(30000)
        );

        assertNotNull(response);
        assertTrue(response.isSuccess());
        PromotionCheckResponse data = response.getData();
        assertEquals("SALE15", data.getCode());
        assertEquals("ORDER", data.getType());
        assertEquals(BigDecimal.valueOf(150000), data.getDiscountAmount());
        assertEquals(BigDecimal.valueOf(850000), data.getFinalTotal());
        assertTrue(data.getValid());
    }

    @Test
    @DisplayName("checkPromotion: Áp dụng thành công mã miễn phí vận chuyển FREESHIP")
    void whenCheckPromotion_withValidShippingPromo_thenReturnSuccessResponse() {
        Promotion freeship = Promotion.builder()
                .id(11L)
                .code("FREESHIP")
                .title("Miễn phí vận chuyển")
                .discount("100%")
                .status("ACTIVE")
                .type("SHIPPING")
                .usedCount(0)
                .maxUsage(1000)
                .build();

        when(promotionRepository.findByCodeIgnoreCase("FREESHIP")).thenReturn(Optional.of(freeship));

        ApiResponse<PromotionCheckResponse> response = promotionService.checkPromotion(
                "FREESHIP",
                BigDecimal.valueOf(500000),
                BigDecimal.valueOf(35000)
        );

        assertNotNull(response);
        assertTrue(response.isSuccess());
        PromotionCheckResponse data = response.getData();
        assertEquals("FREESHIP", data.getCode());
        assertEquals("SHIPPING", data.getType());
        assertEquals(BigDecimal.valueOf(35000), data.getDiscountAmount());
        assertEquals(BigDecimal.ZERO, data.getFinalTotal()); // 35k - 35k = 0
    }

    // =========================================================================
    // 9. Kiểm thử các trường hợp ngoại lệ của validatePromotion
    // =========================================================================
    @Test
    @DisplayName("validatePromotion: Mã rỗng hoặc null -> ném lỗi BadRequestException")
    void whenValidatePromotion_withEmptyCode_thenThrowBadRequestException() {
        assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("", BigDecimal.valueOf(100000), sampleUser));
        assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("   ", BigDecimal.valueOf(100000), sampleUser));
        assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion(null, BigDecimal.valueOf(100000), sampleUser));
    }

    @Test
    @DisplayName("validatePromotion: Mã không tồn tại -> ném lỗi BadRequestException")
    void whenValidatePromotion_withNonExistentCode_thenThrowBadRequestException() {
        when(promotionRepository.findByCodeIgnoreCase("NOT_FOUND")).thenReturn(Optional.empty());

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("NOT_FOUND", BigDecimal.valueOf(100000), sampleUser));

        assertTrue(ex.getMessage().contains("không tồn tại"));
    }

    @Test
    @DisplayName("validatePromotion: Mã ở trạng thái INACTIVE -> ném lỗi BadRequestException")
    void whenValidatePromotion_withInactiveCode_thenThrowBadRequestException() {
        Promotion inactivePromo = Promotion.builder()
                .code("DISABLED")
                .status("INACTIVE")
                .discount("10%")
                .build();
        when(promotionRepository.findByCodeIgnoreCase("DISABLED")).thenReturn(Optional.of(inactivePromo));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("DISABLED", BigDecimal.valueOf(100000), sampleUser));

        assertTrue(ex.getMessage().contains("không còn hiệu lực"));
    }

    // =========================================================================
    // 10. Kiểm thử mã đền bù riêng tư (Compensation Coupon)
    // =========================================================================
    @Test
    @DisplayName("Mã đền bù DENBU: Người dùng chưa đăng nhập -> ném lỗi yêu cầu đăng nhập")
    void whenValidateCompensationPromo_withoutLogin_thenThrowBadRequestException() {
        Promotion denbu = Promotion.builder()
                .code("DENBU-999")
                .status("ACTIVE")
                .discount("50k")
                .userId(1L)
                .build();
        when(promotionRepository.findByCodeIgnoreCase("DENBU-999")).thenReturn(Optional.of(denbu));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("DENBU-999", BigDecimal.valueOf(200000), null));

        assertTrue(ex.getMessage().contains("Vui lòng đăng nhập tài khoản"));
    }

    @Test
    @DisplayName("Mã đền bù DENBU: Tài khoản khác cố tình sử dụng mã của người khác -> ném lỗi từ chối")
    void whenValidateCompensationPromo_byWrongUser_thenThrowBadRequestException() {
        Promotion denbu = Promotion.builder()
                .code("DENBU-999")
                .status("ACTIVE")
                .discount("50k")
                .userId(2L) // Thuộc về user id 2
                .build();
        when(promotionRepository.findByCodeIgnoreCase("DENBU-999")).thenReturn(Optional.of(denbu));

        // sampleUser có id là 1L
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("DENBU-999", BigDecimal.valueOf(200000), sampleUser));

        assertTrue(ex.getMessage().contains("dành riêng cho tài khoản được bồi thường"));
    }

    @Test
    @DisplayName("Mã đền bù DENBU: Đúng tài khoản chủ sở hữu được bồi thường -> kiểm tra thành công")
    void whenValidateCompensationPromo_byRightOwner_thenSuccess() {
        Promotion denbu = Promotion.builder()
                .code("DENBU-111")
                .status("ACTIVE")
                .discount("50k")
                .userId(1L) // Trùng với sampleUser.id
                .build();
        when(promotionRepository.findByCodeIgnoreCase("DENBU-111")).thenReturn(Optional.of(denbu));

        Promotion result = promotionService.validatePromotion("DENBU-111", BigDecimal.valueOf(200000), sampleUser);
        assertNotNull(result);
        assertEquals("DENBU-111", result.getCode());
    }

    // =========================================================================
    // 11. Kiểm thử getAvailablePromotions (Lọc danh sách mã khả dụng)
    // =========================================================================
    @Test
    @DisplayName("getAvailablePromotions: Lấy danh sách ưu đãi cho user hiện tại và loại bỏ mã không hợp lệ")
    void whenGetAvailablePromotions_thenReturnOnlyValidPromotionsForUser() {
        mockAuthentication("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(sampleUser));

        // Mock seed checks
        when(promotionRepository.existsByCodeIgnoreCase("FREESHIP")).thenReturn(true);
        when(promotionRepository.existsByCodeIgnoreCase("FREESHIP30K")).thenReturn(true);
        when(promotionRepository.existsByCodeIgnoreCase("SHIP20K")).thenReturn(true);

        Promotion p1 = Promotion.builder().code("PROMO1").status("ACTIVE").usedCount(0).maxUsage(10).build();
        Promotion p2 = Promotion.builder().code("PROMO2").status("INACTIVE").usedCount(0).maxUsage(10).build(); // Bị loại vì INACTIVE
        Promotion p3 = Promotion.builder().code("PROMO3").status("ACTIVE").usedCount(10).maxUsage(10).build(); // Bị loại vì hết lượt
        Promotion pOwner = Promotion.builder().code("DENBU-1").status("ACTIVE").userId(1L).usedCount(0).maxUsage(1).build(); // Hiện vì cùng userId=1
        Promotion pOther = Promotion.builder().code("DENBU-2").status("ACTIVE").userId(2L).usedCount(0).maxUsage(1).build(); // Bị ẩn vì userId=2

        when(promotionRepository.findAll()).thenReturn(List.of(p1, p2, p3, pOwner, pOther));

        ApiResponse<List<Promotion>> response = promotionService.getAvailablePromotions();

        assertNotNull(response);
        assertTrue(response.isSuccess());
        List<Promotion> list = response.getData();
        assertEquals(2, list.size());
        assertTrue(list.stream().anyMatch(p -> "PROMO1".equals(p.getCode())));
        assertTrue(list.stream().anyMatch(p -> "DENBU-1".equals(p.getCode())));
        assertFalse(list.stream().anyMatch(p -> "PROMO2".equals(p.getCode())));
        assertFalse(list.stream().anyMatch(p -> "PROMO3".equals(p.getCode())));
        assertFalse(list.stream().anyMatch(p -> "DENBU-2".equals(p.getCode())));
    }

    @Test
    @DisplayName("getAvailablePromotions: Khởi tạo các mã Freeship mặc định nếu chưa tồn tại trong hệ thống")
    void whenGetAvailablePromotions_andDefaultsNotExist_thenSeedShippingPromotions() {
        when(promotionRepository.existsByCodeIgnoreCase("FREESHIP")).thenReturn(false);
        when(promotionRepository.existsByCodeIgnoreCase("FREESHIP30K")).thenReturn(false);
        when(promotionRepository.existsByCodeIgnoreCase("SHIP20K")).thenReturn(false);
        when(promotionRepository.findAll()).thenReturn(List.of());

        ApiResponse<List<Promotion>> response = promotionService.getAvailablePromotions();

        assertNotNull(response);
        verify(promotionRepository, times(3)).save(any(Promotion.class));
    }

    @Test
    @DisplayName("validatePromotion: Mã đền bù không có userId trực tiếp nhưng liên kết với đơn hàng của user khác")
    void whenValidateCompensationPromo_linkedToOtherOrder_thenThrowBadRequestException() {
        Promotion promo = Promotion.builder()
                .code("DENBU-ORDER-123")
                .status("ACTIVE")
                .discount("50k")
                .userId(null)
                .build();

        Order order = Order.builder()
                .id(123L)
                .user(User.builder().id(999L).build())
                .build();

        when(promotionRepository.findByCodeIgnoreCase("DENBU-ORDER-123")).thenReturn(Optional.of(promo));
        when(orderRepository.findFirstByCompensationCoupon("DENBU-ORDER-123")).thenReturn(Optional.of(order));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                promotionService.validatePromotion("DENBU-ORDER-123", BigDecimal.valueOf(300000), sampleUser)
        );

        assertTrue(ex.getMessage().contains("bồi thường"));
    }
}

