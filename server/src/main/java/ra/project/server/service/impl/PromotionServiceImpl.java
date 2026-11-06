package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.model.dto.response.PromotionCheckResponse;
import ra.project.server.model.entity.Promotion;
import ra.project.server.model.entity.User;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.PromotionRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.service.PromotionService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PromotionServiceImpl implements PromotionService {

    private final PromotionRepository promotionRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    public User getOptionalCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
                return null;
            }
            String username = authentication.getName();
            return userRepository.findByUsername(username).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PromotionCheckResponse> checkPromotion(String code, BigDecimal subtotal, BigDecimal shippingFee) {
        User currentUser = getOptionalCurrentUser();
        BigDecimal effectiveSubtotal = subtotal != null ? subtotal : BigDecimal.ZERO;
        Promotion promo = validatePromotion(code, effectiveSubtotal, currentUser);

        boolean isShipping = promo.isShippingDiscount();
        BigDecimal effectiveShippingFee = shippingFee != null ? shippingFee : BigDecimal.valueOf(30000);
        BigDecimal baseForDiscount = isShipping ? effectiveShippingFee : effectiveSubtotal;

        BigDecimal discountAmount = calculateDiscountAmount(baseForDiscount, promo.getDiscount(), promo.getMaxDiscountAmount());
        BigDecimal finalTotal;
        if (isShipping) {
            finalTotal = effectiveShippingFee.subtract(discountAmount);
            if (finalTotal.compareTo(BigDecimal.ZERO) < 0) {
                finalTotal = BigDecimal.ZERO;
            }
        } else {
            finalTotal = effectiveSubtotal.subtract(discountAmount);
            if (finalTotal.compareTo(BigDecimal.ZERO) < 0) {
                finalTotal = BigDecimal.ZERO;
            }
        }

        PromotionCheckResponse response = PromotionCheckResponse.builder()
                .code(promo.getCode())
                .title(promo.getTitle())
                .discount(promo.getDiscount())
                .discountAmount(discountAmount)
                .subtotal(effectiveSubtotal)
                .finalTotal(finalTotal)
                .minOrder(promo.getMinOrder())
                .expiry(promo.getExpiry())
                .type(isShipping ? "SHIPPING" : "ORDER")
                .isValid(true)
                .message(isShipping ? "Áp dụng mã miễn/giảm phí vận chuyển thành công!" : "Áp dụng mã giảm giá thành công!")
                .build();

        return ApiResponse.success("Áp dụng mã giảm giá thành công", response);
    }

    @Override
    @Transactional
    public ApiResponse<List<Promotion>> getAvailablePromotions() {
        seedDefaultShippingPromotionsIfNotExist();

        User currentUser = getOptionalCurrentUser();
        Long currentUserId = currentUser != null ? currentUser.getId() : null;

        List<Promotion> activePromotions = promotionRepository.findAll().stream()
                .filter(p -> "ACTIVE".equalsIgnoreCase(p.getStatus()))
                .filter(p -> p.getMaxUsage() == null || p.getUsedCount() == null || p.getUsedCount() < p.getMaxUsage())
                .filter(p -> {
                    Long ownerId = p.getUserId();
                    if (ownerId == null && p.getCode().toUpperCase().startsWith("DENBU")) {
                        ownerId = orderRepository.findFirstByCompensationCoupon(p.getCode())
                                .map(o -> o.getUser() != null ? o.getUser().getId() : null)
                                .orElse(null);
                    }
                    if (ownerId != null || p.getCode().toUpperCase().startsWith("DENBU")) {
                        return currentUserId != null && currentUserId.equals(ownerId);
                    }
                    return true;
                })
                .peek(p -> {
                    if (p.getType() == null) {
                        p.setType(p.isShippingDiscount() ? "SHIPPING" : "ORDER");
                    }
                })
                .limit(100)
                .toList();

        return ApiResponse.success("Lấy danh sách mã ưu đãi khả dụng thành công", activePromotions);
    }

    @Override
    public Promotion validatePromotion(String code, BigDecimal subtotal, User user) {
        if (!StringUtils.hasText(code)) {
            throw new BadRequestException("Vui lòng nhập mã giảm giá cần kiểm tra");
        }

        String trimmedCode = code.trim();
        Promotion promo = promotionRepository.findByCodeIgnoreCase(trimmedCode)
                .orElseThrow(() -> new BadRequestException("Mã giảm giá '" + trimmedCode + "' không tồn tại"));

        if (!"ACTIVE".equalsIgnoreCase(promo.getStatus())) {
            throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' hiện không còn hiệu lực");
        }

        // 1. Kiểm tra hết lượt (maxUsage)
        if (promo.getMaxUsage() != null && promo.getUsedCount() != null && promo.getUsedCount() >= promo.getMaxUsage()) {
            throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' đã hết số lượt sử dụng");
        }

        // 2. Kiểm tra quyền sở hữu đối với mã giảm giá đền bù / riêng tư
        Long ownerUserId = promo.getUserId();
        if (ownerUserId == null && (promo.getCode().toUpperCase().startsWith("DENBU") || orderRepository.findFirstByCompensationCoupon(promo.getCode()).isPresent())) {
            ownerUserId = orderRepository.findFirstByCompensationCoupon(promo.getCode())
                    .map(o -> o.getUser() != null ? o.getUser().getId() : null)
                    .orElse(null);
        }

        if (ownerUserId != null) {
            if (user == null) {
                throw new BadRequestException("Mã giảm giá này là mã đền bù riêng cho chủ đơn hàng bị hủy. Vui lòng đăng nhập tài khoản để sử dụng.");
            }
            if (!ownerUserId.equals(user.getId())) {
                throw new BadRequestException("Mã giảm giá này là mã đền bù dành riêng cho tài khoản được bồi thường đơn hàng. Bạn không thể sử dụng mã này.");
            }
        }

        // 3. Kiểm tra chưa tới ngày áp dụng (startDate)
        if (StringUtils.hasText(promo.getStartDate())) {
            try {
                LocalDate startDate = LocalDate.parse(promo.getStartDate().trim());
                if (startDate.isAfter(LocalDate.now())) {
                    throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' chưa tới ngày áp dụng (bắt đầu từ ngày " + promo.getStartDate() + ")");
                }
            } catch (DateTimeParseException ignored) {
            }
        }

        // 4. Kiểm tra hết hạn (expiry)
        if (StringUtils.hasText(promo.getExpiry())) {
            try {
                LocalDate expiryDate = LocalDate.parse(promo.getExpiry().trim());
                if (expiryDate.isBefore(LocalDate.now())) {
                    throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' đã hết hạn vào ngày " + promo.getExpiry());
                }
            } catch (DateTimeParseException ignored) {
            }
        }

        // 5. Kiểm tra giá trị đơn hàng tối thiểu (minOrder)
        if (subtotal != null && StringUtils.hasText(promo.getMinOrder())) {
            BigDecimal minOrderRequired = parseMinOrderAmount(promo.getMinOrder());
            if (minOrderRequired.compareTo(BigDecimal.ZERO) > 0 && subtotal.compareTo(minOrderRequired) < 0) {
                throw new BadRequestException("Đơn hàng chưa đạt giá trị tối thiểu " + promo.getMinOrder() + " để áp dụng mã giảm giá này");
            }
        }

        return promo;
    }

    @Override
    public BigDecimal calculateDiscountAmount(BigDecimal baseAmount, String discountStr, BigDecimal maxDiscountAmount) {
        if (!StringUtils.hasText(discountStr) || baseAmount == null || baseAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal calculatedDiscount = BigDecimal.ZERO;
        String clean = discountStr.trim().replace(".", "").replace(",", "");

        // Giảm giá theo tỷ lệ phần trăm (%)
        if (clean.endsWith("%")) {
            String percentStr = clean.replace("%", "").trim();
            try {
                BigDecimal percent = new BigDecimal(percentStr);
                calculatedDiscount = baseAmount.multiply(percent).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            } catch (Exception e) {
                calculatedDiscount = BigDecimal.ZERO;
            }
        } else {
            // Giảm giá cố định theo số tiền
            String numOnly = clean.replaceAll("[^0-9]", "");
            if (!numOnly.isBlank()) {
                try {
                    BigDecimal fixed = new BigDecimal(numOnly);
                    calculatedDiscount = fixed.min(baseAmount);
                } catch (Exception e) {
                    calculatedDiscount = BigDecimal.ZERO;
                }
            }
        }

        // Kiểm tra trần giảm giá tối đa (max_discount_amount)
        if (maxDiscountAmount != null && maxDiscountAmount.compareTo(BigDecimal.ZERO) > 0) {
            if (calculatedDiscount.compareTo(maxDiscountAmount) > 0) {
                calculatedDiscount = maxDiscountAmount;
            }
        }

        return calculatedDiscount;
    }

    private BigDecimal parseMinOrderAmount(String minOrderStr) {
        if (!StringUtils.hasText(minOrderStr) || minOrderStr.toLowerCase().contains("mọi đơn")) {
            return BigDecimal.ZERO;
        }
        String clean = minOrderStr.replaceAll("[^0-9]", "");
        if (clean.isBlank()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(clean);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private void seedDefaultShippingPromotionsIfNotExist() {
        if (!promotionRepository.existsByCodeIgnoreCase("FREESHIP")) {
            promotionRepository.save(Promotion.builder()
                    .code("FREESHIP")
                    .title("Mã miễn phí 100% vận chuyển toàn quốc")
                    .discount("100%")
                    .minOrder("Mọi đơn hàng")
                    .expiry("2026-12-31")
                    .usedCount(0)
                    .maxUsage(1000)
                    .status("ACTIVE")
                    .type("SHIPPING")
                    .build());
        }
        if (!promotionRepository.existsByCodeIgnoreCase("FREESHIP30K")) {
            promotionRepository.save(Promotion.builder()
                    .code("FREESHIP30K")
                    .title("Voucher giảm 30.000₫ phí giao hàng")
                    .discount("30.000")
                    .minOrder("Mọi đơn hàng")
                    .expiry("2026-12-31")
                    .usedCount(0)
                    .maxUsage(1000)
                    .status("ACTIVE")
                    .type("SHIPPING")
                    .build());
        }
        if (!promotionRepository.existsByCodeIgnoreCase("SHIP20K")) {
            promotionRepository.save(Promotion.builder()
                    .code("SHIP20K")
                    .title("Voucher giảm 20.000₫ phí giao hàng")
                    .discount("20.000")
                    .minOrder("Mọi đơn hàng")
                    .expiry("2026-12-31")
                    .usedCount(0)
                    .maxUsage(1000)
                    .status("ACTIVE")
                    .type("SHIPPING")
                    .build());
        }
    }
}

