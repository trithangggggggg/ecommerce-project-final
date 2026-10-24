package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.model.dto.response.PromotionCheckResponse;
import ra.project.server.model.entity.Promotion;
import ra.project.server.model.entity.User;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.PromotionRepository;
import ra.project.server.repository.UserRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PromotionController {

    private final PromotionRepository promotionRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    private User getOptionalCurrentUser() {
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

    @GetMapping("/check")
    public ResponseEntity<ApiResponse<PromotionCheckResponse>> checkPromotion(
            @RequestParam("code") String code,
            @RequestParam(name = "subtotal", required = false, defaultValue = "0") BigDecimal subtotal
    ) {
        if (!StringUtils.hasText(code)) {
            throw new BadRequestException("Vui lòng nhập mã giảm giá cần kiểm tra");
        }

        String trimmedCode = code.trim();
        Promotion promo = promotionRepository.findByCodeIgnoreCase(trimmedCode)
                .orElseThrow(() -> new BadRequestException("Mã giảm giá '" + trimmedCode + "' không tồn tại"));

        if (!"ACTIVE".equalsIgnoreCase(promo.getStatus())) {
            throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' hiện không còn hiệu lực");
        }

        if (promo.getMaxUsage() != null && promo.getUsedCount() != null && promo.getUsedCount() >= promo.getMaxUsage()) {
            throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' đã hết số lượt sử dụng");
        }

        // Kiểm tra quyền sở hữu đối với mã giảm giá đền bù / riêng tư
        Long ownerUserId = promo.getUserId();
        if (ownerUserId == null && (promo.getCode().toUpperCase().startsWith("DENBU") || orderRepository.findFirstByCompensationCoupon(promo.getCode()).isPresent())) {
            ownerUserId = orderRepository.findFirstByCompensationCoupon(promo.getCode())
                    .map(o -> o.getUser() != null ? o.getUser().getId() : null)
                    .orElse(null);
        }

        if (ownerUserId != null) {
            User currentUser = getOptionalCurrentUser();
            if (currentUser == null) {
                throw new BadRequestException("Mã giảm giá này là mã đền bù riêng cho chủ đơn hàng bị hủy. Vui lòng đăng nhập tài khoản để sử dụng.");
            }
            if (!ownerUserId.equals(currentUser.getId())) {
                throw new BadRequestException("Mã giảm giá này là mã đền bù dành riêng cho tài khoản được bồi hoàn đơn hàng. Bạn không thể sử dụng mã này.");
            }
        }

        if (StringUtils.hasText(promo.getExpiry())) {
            try {
                LocalDate expiryDate = LocalDate.parse(promo.getExpiry().trim());
                if (expiryDate.isBefore(LocalDate.now())) {
                    throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' đã hết hạn vào ngày " + promo.getExpiry());
                }
            } catch (DateTimeParseException ignored) {
            }
        }

        BigDecimal discountAmount = calculateDiscountAmount(subtotal, promo.getDiscount());
        BigDecimal finalTotal = subtotal.subtract(discountAmount);
        if (finalTotal.compareTo(BigDecimal.ZERO) < 0) {
            finalTotal = BigDecimal.ZERO;
        }

        PromotionCheckResponse response = PromotionCheckResponse.builder()
                .code(promo.getCode())
                .title(promo.getTitle())
                .discount(promo.getDiscount())
                .discountAmount(discountAmount)
                .subtotal(subtotal)
                .finalTotal(finalTotal)
                .minOrder(promo.getMinOrder())
                .expiry(promo.getExpiry())
                .isValid(true)
                .message("Áp dụng mã giảm giá thành công!")
                .build();

        return ResponseEntity.ok(ApiResponse.success("Áp dụng mã giảm giá thành công", response));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<Promotion>>> getAvailablePromotions() {
        User currentUser = getOptionalCurrentUser();
        Long currentUserId = currentUser != null ? currentUser.getId() : null;

        List<Promotion> activePromotions = promotionRepository.findAll().stream()
                .filter(p -> "ACTIVE".equalsIgnoreCase(p.getStatus()))
                .filter(p -> p.getMaxUsage() == null || p.getUsedCount() == null || p.getUsedCount() < p.getMaxUsage())
                .filter(p -> {
                    // Xác định owner của mã
                    Long ownerId = p.getUserId();
                    if (ownerId == null && p.getCode().toUpperCase().startsWith("DENBU")) {
                        ownerId = orderRepository.findFirstByCompensationCoupon(p.getCode())
                                .map(o -> o.getUser() != null ? o.getUser().getId() : null)
                                .orElse(null);
                    }
                    // Nếu là mã đền bù / riêng tư: chỉ người được đền bù mới nhìn thấy trong danh sách gợi ý
                    if (ownerId != null || p.getCode().toUpperCase().startsWith("DENBU")) {
                        return currentUserId != null && currentUserId.equals(ownerId);
                    }
                    // Nếu là mã public chung của cửa hàng: mọi người đều thấy
                    return true;
                })
                .limit(8)
                .toList();

        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã ưu đãi khả dụng thành công", activePromotions));
    }

    private BigDecimal calculateDiscountAmount(BigDecimal subtotal, String discountStr) {
        if (!StringUtils.hasText(discountStr) || subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        String clean = discountStr.trim().replace(".", "").replace(",", "");
        if (clean.endsWith("%")) {
            String percentStr = clean.replace("%", "").trim();
            try {
                BigDecimal percent = new BigDecimal(percentStr);
                return subtotal.multiply(percent).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            } catch (Exception e) {
                return BigDecimal.ZERO;
            }
        }
        String numOnly = clean.replaceAll("[^0-9]", "");
        if (!numOnly.isBlank()) {
            try {
                BigDecimal fixed = new BigDecimal(numOnly);
                return fixed.min(subtotal);
            } catch (Exception e) {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }
}
