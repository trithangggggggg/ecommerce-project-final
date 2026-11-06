package ra.project.server.service;

import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.response.PromotionCheckResponse;
import ra.project.server.model.entity.Promotion;
import ra.project.server.model.entity.User;

import java.math.BigDecimal;
import java.util.List;

public interface PromotionService {

    ApiResponse<PromotionCheckResponse> checkPromotion(String code, BigDecimal subtotal, BigDecimal shippingFee);

    ApiResponse<List<Promotion>> getAvailablePromotions();

    Promotion validatePromotion(String code, BigDecimal subtotal, User user);

    BigDecimal calculateDiscountAmount(BigDecimal baseAmount, String discountStr, BigDecimal maxDiscountAmount);
}

