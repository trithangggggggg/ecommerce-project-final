package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.PromotionApplyRequest;
import ra.project.server.model.dto.response.PromotionCheckResponse;
import ra.project.server.model.entity.Promotion;
import ra.project.server.service.PromotionService;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PromotionController {

    private final PromotionService promotionService;

    @PostMapping("/apply")
    public ResponseEntity<ApiResponse<PromotionCheckResponse>> applyPromotion(
            @RequestBody(required = false) PromotionApplyRequest request,
            @RequestParam(name = "code", required = false) String paramCode,
            @RequestParam(name = "subtotal", required = false) BigDecimal paramSubtotal,
            @RequestParam(name = "shippingFee", required = false) BigDecimal paramShippingFee
    ) {
        String code = request != null && StringUtils.hasText(request.getCode()) ? request.getCode() : paramCode;
        BigDecimal subtotal = request != null && request.getSubtotal() != null ? request.getSubtotal() : (paramSubtotal != null ? paramSubtotal : BigDecimal.ZERO);
        BigDecimal shippingFee = request != null && request.getShippingFee() != null ? request.getShippingFee() : paramShippingFee;
        return ResponseEntity.ok(promotionService.checkPromotion(code, subtotal, shippingFee));
    }

    @GetMapping("/check")
    public ResponseEntity<ApiResponse<PromotionCheckResponse>> checkPromotion(
            @RequestParam("code") String code,
            @RequestParam(name = "subtotal", required = false, defaultValue = "0") BigDecimal subtotal,
            @RequestParam(name = "shippingFee", required = false) BigDecimal shippingFee
    ) {
        return ResponseEntity.ok(promotionService.checkPromotion(code, subtotal, shippingFee));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<Promotion>>> getAvailablePromotions() {
        return ResponseEntity.ok(promotionService.getAvailablePromotions());
    }
}
