package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import ra.project.server.repository.PromotionRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.repository.WheelSpinHistoryRepository;
import ra.project.server.service.WheelService;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WheelServiceImpl implements WheelService {

    private final WheelSpinHistoryRepository wheelSpinHistoryRepository;
    private final PromotionRepository promotionRepository;
    private final UserRepository userRepository;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private static final List<WheelReward> DEFAULT_REWARDS = List.of(
            WheelReward.builder()
                    .id(0)
                    .label("Voucher Giảm 10.000₫")
                    .shortLabel("10K")
                    .discount("10.000")
                    .type("ORDER")
                    .minOrder("Mọi đơn hàng")
                    .maxDiscountAmount(null)
                    .weight(30)
                    .color("#1e293b")
                    .textColor("#f8fafc")
                    .icon("gift")
                    .build(),
            WheelReward.builder()
                    .id(1)
                    .label("Voucher Giảm 10%")
                    .shortLabel("10%")
                    .discount("10%")
                    .type("ORDER")
                    .minOrder("100.000₫")
                    .maxDiscountAmount(BigDecimal.valueOf(50000))
                    .weight(25)
                    .color("#4f46e5")
                    .textColor("#ffffff")
                    .icon("percent")
                    .build(),
            WheelReward.builder()
                    .id(2)
                    .label("Miễn phí Vận chuyển 100%")
                    .shortLabel("FREESHIP")
                    .discount("100%")
                    .type("SHIPPING")
                    .minOrder("Mọi đơn hàng")
                    .maxDiscountAmount(null)
                    .weight(20)
                    .color("#059669")
                    .textColor("#ffffff")
                    .icon("truck")
                    .build(),
            WheelReward.builder()
                    .id(3)
                    .label("Voucher Giảm 20.000₫")
                    .shortLabel("20K")
                    .discount("20.000")
                    .type("ORDER")
                    .minOrder("200.000₫")
                    .maxDiscountAmount(null)
                    .weight(15)
                    .color("#d97706")
                    .textColor("#ffffff")
                    .icon("gift")
                    .build(),
            WheelReward.builder()
                    .id(4)
                    .label("Voucher Giảm 15%")
                    .shortLabel("15%")
                    .discount("15%")
                    .type("ORDER")
                    .minOrder("300.000₫")
                    .maxDiscountAmount(BigDecimal.valueOf(100000))
                    .weight(10)
                    .color("#e11d48")
                    .textColor("#ffffff")
                    .icon("percent")
                    .build(),
            WheelReward.builder()
                    .id(5)
                    .label("Voucher Giảm 30K Ship")
                    .shortLabel("SHIP 30K")
                    .discount("30.000")
                    .type("SHIPPING")
                    .minOrder("Mọi đơn hàng")
                    .maxDiscountAmount(null)
                    .weight(15)
                    .color("#7c3aed")
                    .textColor("#ffffff")
                    .icon("truck")
                    .build(),
            WheelReward.builder()
                    .id(6)
                    .label("Voucher Giảm 50.000₫")
                    .shortLabel("50K")
                    .discount("50.000")
                    .type("ORDER")
                    .minOrder("500.000₫")
                    .maxDiscountAmount(null)
                    .weight(5)
                    .color("#ea580c")
                    .textColor("#ffffff")
                    .icon("award")
                    .build(),
            WheelReward.builder()
                    .id(7)
                    .label("Voucher Siêu VIP 100.000₫")
                    .shortLabel("100K VIP")
                    .discount("100.000")
                    .type("ORDER")
                    .minOrder("800.000₫")
                    .maxDiscountAmount(null)
                    .weight(2)
                    .color("#f59e0b")
                    .textColor("#1e1e24")
                    .icon("sparkles")
                    .build()
    );

    @Override
    public List<WheelReward> getDefaultRewards() {
        return Collections.unmodifiableList(DEFAULT_REWARDS);
    }

    private User getOptionalCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
                return null;
            }
            String username = authentication.getName();
            return userRepository.findByUsernameIgnoreCase(username)
                    .or(() -> userRepository.findByEmailIgnoreCase(username))
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private User getCurrentAuthenticatedUser() {
        User user = getOptionalCurrentUser();
        if (user == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tham gia Vòng quay may mắn");
        }
        if (Boolean.FALSE.equals(user.getStatus())) {
            throw new ForbiddenException("Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt. Không thể quay thưởng!");
        }
        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<WheelStatusResponse> getWheelStatus() {
        User currentUser = getOptionalCurrentUser();
        List<WheelReward> rewards = getDefaultRewards();

        if (currentUser == null) {
            return ApiResponse.success("Lấy trạng thái vòng quay thành công",
                    WheelStatusResponse.builder()
                            .canSpin(false)
                            .hasSpunToday(false)
                            .message("Vui lòng đăng nhập để nhận 1 lượt quay may mắn mỗi ngày!")
                            .rewards(rewards)
                            .build()
            );
        }

        LocalDate today = LocalDate.now();
        Optional<WheelSpinHistory> historyOpt = wheelSpinHistoryRepository.findByUserIdAndSpinDate(currentUser.getId(), today);

        if (historyOpt.isPresent()) {
            WheelSpinHistory history = historyOpt.get();
            return ApiResponse.success("Lấy trạng thái vòng quay thành công",
                    WheelStatusResponse.builder()
                            .canSpin(false)
                            .hasSpunToday(true)
                            .message("Bạn đã sử dụng lượt quay hôm nay. Hãy quay lại vào ngày mai nhé!")
                            .todayVoucherCode(history.getVoucherCode())
                            .todayRewardLabel(history.getRewardLabel())
                            .rewards(rewards)
                            .build()
            );
        }

        return ApiResponse.success("Lấy trạng thái vòng quay thành công",
                WheelStatusResponse.builder()
                        .canSpin(true)
                        .hasSpunToday(false)
                        .message("Bạn có 1 lượt quay may mắn miễn phí hôm nay. Chúc bạn trúng lớn!")
                        .rewards(rewards)
                        .build()
        );
    }

    @Override
    @Transactional
    public synchronized ApiResponse<WheelSpinResponse> spinWheel() {
        User user = getCurrentAuthenticatedUser();
        LocalDate today = LocalDate.now();

        // 1. Kiểm tra giới hạn 1 lượt quay / ngày cho mỗi tài khoản
        if (wheelSpinHistoryRepository.existsByUserIdAndSpinDate(user.getId(), today)) {
            throw new BadRequestException("Bạn đã sử dụng lượt quay may mắn của ngày hôm nay. Hãy quay lại vào ngày mai nhé!");
        }

        List<WheelReward> rewards = getDefaultRewards();

        // 2. Thuật toán chọn ngẫu nhiên theo trọng số (Weighted Random) tại Server
        int totalWeight = rewards.stream().mapToInt(WheelReward::getWeight).sum();
        int randomValue = SECURE_RANDOM.nextInt(totalWeight);
        int cumulativeWeight = 0;
        int selectedIndex = 0;
        WheelReward selectedReward = rewards.get(0);

        for (int i = 0; i < rewards.size(); i++) {
            cumulativeWeight += rewards.get(i).getWeight();
            if (randomValue < cumulativeWeight) {
                selectedIndex = i;
                selectedReward = rewards.get(i);
                break;
            }
        }

        // 3. Tự động sinh mã voucher duy nhất trong bảng promotions
        String cleanLabel = selectedReward.getShortLabel()
                .replaceAll("[^a-zA-Z0-9]", "")
                .toUpperCase();
        String voucherCode = generateUniqueVoucherCode(cleanLabel);

        // 4. Tạo thực thể Promotion và gắn trực tiếp với userId của người trúng thưởng
        Promotion promo = Promotion.builder()
                .code(voucherCode)
                .title(selectedReward.getLabel() + " (Vòng quay may mắn)")
                .discount(selectedReward.getDiscount())
                .minOrder(selectedReward.getMinOrder())
                .maxDiscountAmount(selectedReward.getMaxDiscountAmount())
                .startDate(today.toString())
                .expiry(today.plusDays(30).toString()) // Hiệu lực 30 ngày
                .usedCount(0)
                .maxUsage(1) // Chỉ sử dụng 1 lần duy nhất
                .status("ACTIVE")
                .type(selectedReward.getType())
                .userId(user.getId()) // Gắn chặt chẽ với tài khoản người trúng
                .build();

        Promotion savedPromo = promotionRepository.save(promo);

        // 5. Lưu lịch sử quay thưởng để chống quay lại trong cùng ngày (Database Unique Constraint bảo vệ)
        WheelSpinHistory history = WheelSpinHistory.builder()
                .userId(user.getId())
                .spinDate(today)
                .rewardId(selectedIndex)
                .rewardLabel(selectedReward.getLabel())
                .voucherCode(savedPromo.getCode())
                .build();

        try {
            wheelSpinHistoryRepository.save(history);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("Bạn đã sử dụng lượt quay may mắn của ngày hôm nay!");
        }

        log.info("Người dùng '{}' (#{}) đã quay trúng phần thưởng [{}] với voucher: {}",
                user.getUsername(), user.getId(), selectedReward.getLabel(), savedPromo.getCode());

        WheelSpinResponse response = WheelSpinResponse.builder()
                .rewardIndex(selectedIndex)
                .reward(selectedReward)
                .voucherCode(savedPromo.getCode())
                .voucher(savedPromo)
                .message("Chúc mừng bạn đã trúng " + selectedReward.getLabel() + "!")
                .build();

        return ApiResponse.success("Quay thưởng thành công!", response);
    }

    private String generateUniqueVoucherCode(String prefix) {
        String code;
        int attempts = 0;
        do {
            StringBuilder sb = new StringBuilder("WHEEL-");
            if (!prefix.isEmpty()) {
                sb.append(prefix).append("-");
            }
            for (int i = 0; i < 6; i++) {
                sb.append(ALPHANUMERIC.charAt(SECURE_RANDOM.nextInt(ALPHANUMERIC.length())));
            }
            code = sb.toString();
            attempts++;
            if (attempts > 50) {
                code = "WHEEL-" + System.currentTimeMillis();
                break;
            }
        } while (promotionRepository.existsByCodeIgnoreCase(code));

        return code;
    }
}

