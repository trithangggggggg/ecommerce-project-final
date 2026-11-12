package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ForbiddenException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.model.dto.WheelReward;
import ra.project.server.model.dto.response.AdminWheelSpinHistoryResponse;
import ra.project.server.model.dto.response.AdminWheelStatsResponse;
import ra.project.server.model.dto.response.WheelSpinResponse;
import ra.project.server.model.dto.response.WheelStatusResponse;
import ra.project.server.model.entity.Promotion;
import ra.project.server.model.entity.User;
import ra.project.server.model.entity.WheelSpinHistory;
import ra.project.server.repository.PromotionRepository;
import ra.project.server.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import ra.project.server.model.entity.WheelRewardEntity;
import ra.project.server.repository.WheelRewardRepository;
import ra.project.server.repository.WheelSpinHistoryRepository;
import ra.project.server.service.WheelService;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WheelServiceImpl implements WheelService {

    private final WheelSpinHistoryRepository wheelSpinHistoryRepository;
    private final PromotionRepository promotionRepository;
    private final UserRepository userRepository;

    @Autowired(required = false)
    private WheelRewardRepository wheelRewardRepository;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private static final List<WheelReward> DEFAULT_REWARDS = List.of(
            WheelReward.builder()
                    .id(0)
                    .label("10K Voucher")
                    .shortLabel("10K")
                    .discount("10.000")
                    .type("ORDER")
                    .minOrder("Mọi đơn hàng")
                    .maxDiscountAmount(null)
                    .weight(30)
                    .color("#1e40af")
                    .textColor("#ffffff")
                    .icon("coupon")
                    .build(),
            WheelReward.builder()
                    .id(1)
                    .label("10% Giảm Giá")
                    .shortLabel("10%")
                    .discount("10%")
                    .type("ORDER")
                    .minOrder("100.000₫")
                    .maxDiscountAmount(BigDecimal.valueOf(50000))
                    .weight(25)
                    .color("#4338ca")
                    .textColor("#ffffff")
                    .icon("cube")
                    .build(),
            WheelReward.builder()
                    .id(2)
                    .label("Miễn Phí Vận Chuyển")
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
                    .label("20K Voucher")
                    .shortLabel("20K")
                    .discount("20.000")
                    .type("ORDER")
                    .minOrder("200.000₫")
                    .maxDiscountAmount(null)
                    .weight(15)
                    .color("#ea580c")
                    .textColor("#ffffff")
                    .icon("coins")
                    .build(),
            WheelReward.builder()
                    .id(4)
                    .label("Giảm Giá 15%")
                    .shortLabel("15%")
                    .discount("15%")
                    .type("ORDER")
                    .minOrder("300.000₫")
                    .maxDiscountAmount(BigDecimal.valueOf(100000))
                    .weight(10)
                    .color("#e11d48")
                    .textColor("#ffffff")
                    .icon("tag")
                    .build(),
            WheelReward.builder()
                    .id(5)
                    .label("Voucher 50%")
                    .shortLabel("50%")
                    .discount("50%")
                    .type("ORDER")
                    .minOrder("500.000₫")
                    .maxDiscountAmount(BigDecimal.valueOf(150000))
                    .weight(10)
                    .color("#7c3aed")
                    .textColor("#ffffff")
                    .icon("diamond")
                    .build(),
            WheelReward.builder()
                    .id(6)
                    .label("50K Voucher")
                    .shortLabel("50K")
                    .discount("50.000")
                    .type("ORDER")
                    .minOrder("500.000₫")
                    .maxDiscountAmount(null)
                    .weight(5)
                    .color("#f97316")
                    .textColor("#ffffff")
                    .icon("ticket")
                    .build(),
            WheelReward.builder()
                    .id(7)
                    .label("100K VIP Voucher")
                    .shortLabel("100K VIP")
                    .discount("100.000")
                    .type("ORDER")
                    .minOrder("800.000₫")
                    .maxDiscountAmount(null)
                    .weight(2)
                    .color("#f59e0b")
                    .textColor("#1e1e24")
                    .icon("crown")
                    .build()
    );

    @Override
    public List<WheelReward> getDefaultRewards() {
        if (wheelRewardRepository != null) {
            List<WheelRewardEntity> active = wheelRewardRepository.findByIsActiveTrueOrderByDisplayOrderAscIdAsc();
            if (active != null && !active.isEmpty()) {
                List<WheelReward> mapped = new ArrayList<>();
                for (int i = 0; i < active.size(); i++) {
                    mapped.add(toRewardDto(active.get(i), i));
                }
                return mapped;
            }
        }
        return Collections.unmodifiableList(DEFAULT_REWARDS);
    }

    private WheelReward toRewardDto(WheelRewardEntity entity, int slotIndex) {
        return WheelReward.builder()
                .id(slotIndex)
                .entityId(entity.getId())
                .label(entity.getLabel())
                .shortLabel(entity.getShortLabel())
                .discount(entity.getDiscount())
                .type(entity.getType())
                .minOrder(entity.getMinOrder())
                .maxDiscountAmount(entity.getMaxDiscountAmount())
                .weight(entity.getWeight())
                .color(entity.getColor())
                .textColor(entity.getTextColor())
                .icon(entity.getIcon())
                .isActive(entity.getIsActive())
                .displayOrder(entity.getDisplayOrder())
                .build();
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
                            .remainingSpins(0)
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
                            .remainingSpins(0)
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
                        .remainingSpins(1)
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

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<AdminWheelSpinHistoryResponse>> getSpinHistory(
            String keyword, LocalDate spinDate, Pageable pageable) {
        String cleanKeyword = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;
        Page<AdminWheelSpinHistoryResponse> page = wheelSpinHistoryRepository.searchHistory(cleanKeyword, spinDate, pageable);
        return ApiResponse.success("Lấy lịch sử quay thưởng thành công", PageResponse.from(page));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<AdminWheelStatsResponse> getWheelStats() {
        long totalSpins = wheelSpinHistoryRepository.count();
        long spinsToday = wheelSpinHistoryRepository.countBySpinDate(LocalDate.now());
        long uniqueUsers = wheelSpinHistoryRepository.countDistinctUsers();
        long vouchersIssued = promotionRepository.countByCodeStartingWithIgnoreCase("WHEEL-");
        long vouchersUsed = promotionRepository.countByCodeStartingWithIgnoreCaseAndUsedCountGreaterThan("WHEEL-", 0);

        List<Object[]> distributionRaw = wheelSpinHistoryRepository.countSpinsByReward();
        List<AdminWheelStatsResponse.RewardDistributionItem> distribution = new ArrayList<>();

        List<WheelReward> defaultRewards = getDefaultRewards();
        Map<Integer, Long> countMap = new HashMap<>();
        for (Object[] row : distributionRaw) {
            Integer rId = ((Number) row[0]).intValue();
            Long count = ((Number) row[2]).longValue();
            countMap.put(rId, count);
        }

        for (WheelReward r : defaultRewards) {
            long c = countMap.getOrDefault(r.getId(), 0L);
            double pct = totalSpins > 0 ? ((double) c * 100.0) / totalSpins : 0.0;
            distribution.add(AdminWheelStatsResponse.RewardDistributionItem.builder()
                    .rewardId(r.getId())
                    .rewardLabel(r.getLabel())
                    .count(c)
                    .percentage(Math.round(pct * 10.0) / 10.0)
                    .build());
        }

        AdminWheelStatsResponse stats = AdminWheelStatsResponse.builder()
                .totalSpins(totalSpins)
                .spinsToday(spinsToday)
                .uniqueUsers(uniqueUsers)
                .vouchersIssued(vouchersIssued)
                .vouchersUsed(vouchersUsed)
                .rewardDistributions(distribution)
                .build();

        return ApiResponse.success("Lấy thống kê vòng quay thành công", stats);
    }

    @Override
    @Transactional
    public ApiResponse<Void> deleteSpinHistory(Long id) {
        WheelSpinHistory history = wheelSpinHistoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch sử quay thưởng", "id", id));
        wheelSpinHistoryRepository.delete(history);
        return ApiResponse.success("Xóa lịch sử quay thưởng thành công", null);
    }

    @Override
    @Transactional
    public ApiResponse<Void> resetUserDailySpin(Long userId) {
        LocalDate today = LocalDate.now();
        wheelSpinHistoryRepository.deleteByUserIdAndSpinDate(userId, today);
        return ApiResponse.success("Đã đặt lại lượt quay hôm nay cho người dùng thành công", null);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<AdminWheelSpinHistoryResponse> getSpinHistoryById(Long id) {
        AdminWheelSpinHistoryResponse detail = wheelSpinHistoryRepository.findDetailById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch sử quay thưởng", "id", id));
        return ApiResponse.success("Lấy chi tiết lượt quay thành công", detail);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<WheelReward> searchAdminRewards(String keyword, Boolean isActive, Pageable pageable) {
        if (wheelRewardRepository == null) {
            return PageResponse.<WheelReward>builder().content(Collections.emptyList()).totalElements(0).totalPages(0).pageNumber(0).pageSize(10).build();
        }
        String cleanKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        Page<WheelRewardEntity> page = wheelRewardRepository.searchAdminRewards(cleanKeyword, isActive, pageable);
        List<WheelReward> all = wheelRewardRepository.findAllByOrderByDisplayOrderAscIdAsc()
                .stream().map(e -> toRewardDto(e, e.getDisplayOrder() != null ? e.getDisplayOrder() : 0)).toList();
        Map<Long, Integer> indexMap = new HashMap<>();
        for (int i = 0; i < all.size(); i++) {
            indexMap.put(all.get(i).getEntityId(), i);
        }
        return PageResponse.from(page.map(entity -> toRewardDto(entity, indexMap.getOrDefault(entity.getId(), 0))));
    }

    @Override
    @Transactional(readOnly = true)
    public List<WheelReward> getAllRewardsAdmin() {
        if (wheelRewardRepository == null) return getDefaultRewards();
        List<WheelRewardEntity> list = wheelRewardRepository.findAllByOrderByDisplayOrderAscIdAsc();
        List<WheelReward> res = new ArrayList<>();
        for (int i = 0; i < list.size(); i++) {
            res.add(toRewardDto(list.get(i), i));
        }
        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public WheelReward getRewardById(Long id) {
        WheelRewardEntity entity = wheelRewardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phần thưởng vòng quay", "id", id));
        return toRewardDto(entity, entity.getDisplayOrder() != null ? entity.getDisplayOrder() : 0);
    }

    @Override
    @Transactional
    public WheelReward createReward(WheelReward request) {
        if (request == null || request.getLabel() == null || request.getLabel().isBlank()) {
            throw new BadRequestException("Tên phần thưởng không được để trống");
        }
        if (request.getShortLabel() == null || request.getShortLabel().isBlank()) {
            throw new BadRequestException("Nhãn ngắn trên vòng quay không được để trống");
        }
        if (request.getDiscount() == null || request.getDiscount().isBlank()) {
            throw new BadRequestException("Giá trị ưu đãi không được để trống");
        }
        WheelRewardEntity entity = WheelRewardEntity.builder()
                .label(request.getLabel().trim())
                .shortLabel(request.getShortLabel().trim())
                .discount(request.getDiscount().trim())
                .type(request.getType() != null && !request.getType().isBlank() ? request.getType().trim().toUpperCase() : "ORDER")
                .minOrder(request.getMinOrder() != null ? request.getMinOrder().trim() : "Mọi đơn hàng")
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .weight(request.getWeight() != null && request.getWeight() >= 0 ? request.getWeight() : 10)
                .color(request.getColor() != null && !request.getColor().isBlank() ? request.getColor().trim() : "#1e40af")
                .textColor(request.getTextColor() != null && !request.getTextColor().isBlank() ? request.getTextColor().trim() : "#ffffff")
                .icon(request.getIcon() != null ? request.getIcon().trim() : "coupon")
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        WheelRewardEntity saved = wheelRewardRepository.save(entity);
        return toRewardDto(saved, saved.getDisplayOrder());
    }

    @Override
    @Transactional
    public WheelReward updateReward(Long id, WheelReward request) {
        WheelRewardEntity existing = wheelRewardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phần thưởng vòng quay", "id", id));
        if (request.getLabel() != null && !request.getLabel().isBlank()) {
            existing.setLabel(request.getLabel().trim());
        }
        if (request.getShortLabel() != null && !request.getShortLabel().isBlank()) {
            existing.setShortLabel(request.getShortLabel().trim());
        }
        if (request.getDiscount() != null && !request.getDiscount().isBlank()) {
            existing.setDiscount(request.getDiscount().trim());
        }
        if (request.getType() != null && !request.getType().isBlank()) {
            existing.setType(request.getType().trim().toUpperCase());
        }
        existing.setMinOrder(request.getMinOrder() != null ? request.getMinOrder().trim() : existing.getMinOrder());
        existing.setMaxDiscountAmount(request.getMaxDiscountAmount());
        if (request.getWeight() != null && request.getWeight() >= 0) {
            existing.setWeight(request.getWeight());
        }
        if (request.getColor() != null && !request.getColor().isBlank()) {
            existing.setColor(request.getColor().trim());
        }
        if (request.getTextColor() != null && !request.getTextColor().isBlank()) {
            existing.setTextColor(request.getTextColor().trim());
        }
        if (request.getDisplayOrder() != null) {
            existing.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getIsActive() != null) {
            existing.setIsActive(request.getIsActive());
        }
        WheelRewardEntity updated = wheelRewardRepository.save(existing);
        return toRewardDto(updated, updated.getDisplayOrder());
    }

    @Override
    @Transactional
    public WheelReward toggleRewardStatus(Long id, Boolean isActive) {
        WheelRewardEntity existing = wheelRewardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phần thưởng vòng quay", "id", id));
        existing.setIsActive(isActive != null ? isActive : !Boolean.TRUE.equals(existing.getIsActive()));
        WheelRewardEntity saved = wheelRewardRepository.save(existing);
        return toRewardDto(saved, saved.getDisplayOrder());
    }

    @Override
    @Transactional
    public void deleteReward(Long id) {
        if (!wheelRewardRepository.existsById(id)) {
            throw new ResourceNotFoundException("Phần thưởng vòng quay", "id", id);
        }
        wheelRewardRepository.deleteById(id);
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
