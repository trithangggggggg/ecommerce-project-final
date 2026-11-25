package ra.project.server.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;
import ra.project.server.model.entity.WheelRewardEntity;
import ra.project.server.repository.WheelRewardRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ForbiddenException;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.model.dto.WheelReward;
import ra.project.server.model.dto.response.WheelSpinResponse;
import ra.project.server.model.dto.response.WheelStatusResponse;
import ra.project.server.model.entity.Promotion;
import ra.project.server.model.entity.User;
import ra.project.server.model.entity.WheelSpinHistory;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.PromotionRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.repository.WheelSpinHistoryRepository;
import ra.project.server.service.impl.WheelServiceImpl;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: WheelServiceImpl (Vòng quay may mắn)")
class WheelServiceImplTest {

    @Mock
    private WheelSpinHistoryRepository wheelSpinHistoryRepository;

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private WheelServiceImpl wheelService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .username("gamer1")
                .email("gamer1@example.com")
                .fullName("Nguyen Van May Man")
                .role(Role.CUSTOMER)
                .status(true)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockAuthentication(User user) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(user.getUsername());
        when(authentication.getName()).thenReturn(user.getUsername());
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    @DisplayName("getDefaultRewards: Trả về chính xác 8 ô phần thưởng hợp lệ")
    void whenGetDefaultRewards_thenReturnEightDistinctRewards() {
        List<WheelReward> rewards = wheelService.getDefaultRewards();
        assertNotNull(rewards);
        assertEquals(8, rewards.size());
        for (int i = 0; i < 8; i++) {
            assertEquals(i, rewards.get(i).getId());
            assertNotNull(rewards.get(i).getLabel());
            assertNotNull(rewards.get(i).getDiscount());
            assertTrue(rewards.get(i).getWeight() > 0);
        }
    }

    @Test
    @DisplayName("getWheelStatus: Người dùng chưa đăng nhập -> canSpin = false")
    void whenGetWheelStatus_unauthenticated_thenCanSpinIsFalse() {
        when(securityContext.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(securityContext);

        ApiResponse<WheelStatusResponse> response = wheelService.getWheelStatus();
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertFalse(response.getData().isCanSpin());
        assertFalse(response.getData().isHasSpunToday());
        assertEquals(8, response.getData().getRewards().size());
    }

    @Test
    @DisplayName("getWheelStatus: Đã đăng nhập và chưa quay hôm nay -> canSpin = true")
    void whenGetWheelStatus_authenticatedAndNotSpun_thenCanSpinIsTrue() {
        mockAuthentication(sampleUser);
        when(userRepository.findByUsernameIgnoreCase("gamer1")).thenReturn(Optional.of(sampleUser));
        when(wheelSpinHistoryRepository.findByUserIdAndSpinDate(1L, LocalDate.now())).thenReturn(Optional.empty());

        ApiResponse<WheelStatusResponse> response = wheelService.getWheelStatus();
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertTrue(response.getData().isCanSpin());
        assertFalse(response.getData().isHasSpunToday());
        assertTrue(response.getData().getMessage().contains("1 lượt quay may mắn miễn phí"));
    }

    @Test
    @DisplayName("getWheelStatus: Đã đăng nhập và đã quay hôm nay -> canSpin = false, hasSpunToday = true")
    void whenGetWheelStatus_alreadySpunToday_thenCanSpinIsFalse() {
        mockAuthentication(sampleUser);
        when(userRepository.findByUsernameIgnoreCase("gamer1")).thenReturn(Optional.of(sampleUser));

        WheelSpinHistory history = WheelSpinHistory.builder()
                .id(10L)
                .userId(1L)
                .spinDate(LocalDate.now())
                .rewardId(2)
                .rewardLabel("Miễn phí Vận chuyển 100%")
                .voucherCode("WHEEL-FREESHIP-A1B2C3")
                .build();
        when(wheelSpinHistoryRepository.findByUserIdAndSpinDate(1L, LocalDate.now())).thenReturn(Optional.of(history));

        ApiResponse<WheelStatusResponse> response = wheelService.getWheelStatus();
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertFalse(response.getData().isCanSpin());
        assertTrue(response.getData().isHasSpunToday());
        assertEquals("WHEEL-FREESHIP-A1B2C3", response.getData().getTodayVoucherCode());
    }

    @Test
    @DisplayName("spinWheel: Chưa đăng nhập -> Ném UnauthorizedException")
    void whenSpinWheel_unauthenticated_thenThrowUnauthorizedException() {
        when(securityContext.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(securityContext);

        assertThrows(UnauthorizedException.class, () -> wheelService.spinWheel());
    }

    @Test
    @DisplayName("spinWheel: Tài khoản bị khóa (status = false) -> Ném ForbiddenException")
    void whenSpinWheel_lockedAccount_thenThrowForbiddenException() {
        sampleUser.setStatus(false);
        mockAuthentication(sampleUser);
        when(userRepository.findByUsernameIgnoreCase("gamer1")).thenReturn(Optional.of(sampleUser));

        assertThrows(ForbiddenException.class, () -> wheelService.spinWheel());
    }

    @Test
    @DisplayName("spinWheel: Đã quay hôm nay rồi -> Ném BadRequestException")
    void whenSpinWheel_alreadySpunToday_thenThrowBadRequestException() {
        mockAuthentication(sampleUser);
        when(userRepository.findByUsernameIgnoreCase("gamer1")).thenReturn(Optional.of(sampleUser));
        when(wheelSpinHistoryRepository.existsByUserIdAndSpinDate(1L, LocalDate.now())).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> wheelService.spinWheel());
        assertTrue(ex.getMessage().contains("Bạn đã sử dụng lượt quay may mắn"));
        verify(promotionRepository, never()).save(any(Promotion.class));
    }

    @Test
    @DisplayName("spinWheel: Quay thưởng thành công -> Tạo voucher gắn với userId và lưu lịch sử quay")
    void whenSpinWheel_success_thenCreateVoucherAndSaveHistory() {
        mockAuthentication(sampleUser);
        when(userRepository.findByUsernameIgnoreCase("gamer1")).thenReturn(Optional.of(sampleUser));
        when(wheelSpinHistoryRepository.existsByUserIdAndSpinDate(1L, LocalDate.now())).thenReturn(false);
        when(promotionRepository.existsByCodeIgnoreCase(anyString())).thenReturn(false);

        when(promotionRepository.save(any(Promotion.class))).thenAnswer(i -> {
            Promotion p = i.getArgument(0);
            p.setId(100L);
            return p;
        });

        when(wheelSpinHistoryRepository.save(any(WheelSpinHistory.class))).thenAnswer(i -> {
            WheelSpinHistory h = i.getArgument(0);
            h.setId(50L);
            return h;
        });

        ApiResponse<WheelSpinResponse> result = wheelService.spinWheel();

        assertNotNull(result);
        assertTrue(result.isSuccess());
        WheelSpinResponse data = result.getData();
        assertNotNull(data);
        assertTrue(data.getRewardIndex() >= 0 && data.getRewardIndex() < 8);
        assertNotNull(data.getVoucherCode());
        assertTrue(data.getVoucherCode().startsWith("WHEEL-"));
        assertNotNull(data.getVoucher());
        assertEquals(1L, data.getVoucher().getUserId()); // Gắn đúng với user_id của người trúng
        assertEquals("ACTIVE", data.getVoucher().getStatus());
        assertEquals(1, data.getVoucher().getMaxUsage());

        verify(promotionRepository, times(1)).save(any(Promotion.class));
        verify(wheelSpinHistoryRepository, times(1)).save(any(WheelSpinHistory.class));
    }

    @Test
    @DisplayName("spinWheel: Nhiều request đồng thời bị DB chặn duplicate -> Báo lỗi an toàn")
    void whenSpinWheel_raceConditionDbUniqueViolation_thenThrowBadRequestException() {
        mockAuthentication(sampleUser);
        when(userRepository.findByUsernameIgnoreCase("gamer1")).thenReturn(Optional.of(sampleUser));
        when(wheelSpinHistoryRepository.existsByUserIdAndSpinDate(1L, LocalDate.now())).thenReturn(false);
        when(promotionRepository.existsByCodeIgnoreCase(anyString())).thenReturn(false);
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(i -> i.getArgument(0));

        // Giả lập Race Condition: Kiểm tra check tồn tại trước đó lọt qua, nhưng DB Unique Constraint chặn lại
        doThrow(new DataIntegrityViolationException("Duplicate entry '1-2026-11-09' for key 'uk_user_spin_date'"))
                .when(wheelSpinHistoryRepository).save(any(WheelSpinHistory.class));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> wheelService.spinWheel());
        assertTrue(ex.getMessage().contains("Bạn đã sử dụng lượt quay may mắn"));
    }

    @Test
    @DisplayName("getDefaultRewards ưu tiên đọc phần thưởng đang kích hoạt từ bảng wheel_rewards")
    void whenDbHasActiveRewards_thenGetDefaultRewardsReturnsFromDb() {
        WheelRewardRepository rewardRepo = mock(WheelRewardRepository.class);
        ReflectionTestUtils.setField(wheelService, "wheelRewardRepository", rewardRepo);

        WheelRewardEntity dbEntity = WheelRewardEntity.builder()
                .id(11L)
                .label("VIP 500K")
                .shortLabel("500K")
                .discount("500.000")
                .type("ORDER")
                .minOrder("5.000.000đ")
                .weight(40)
                .color("#000000")
                .textColor("#ffffff")
                .icon("gift")
                .displayOrder(1)
                .isActive(true)
                .build();
        when(rewardRepo.findByIsActiveTrueOrderByDisplayOrderAscIdAsc()).thenReturn(List.of(dbEntity));

        List<WheelReward> rewards = wheelService.getDefaultRewards();
        assertEquals(1, rewards.size());
        assertEquals(11L, rewards.get(0).getEntityId());
        assertEquals("VIP 500K", rewards.get(0).getLabel());
    }
}

