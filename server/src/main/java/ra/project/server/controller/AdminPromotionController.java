package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.entity.Promotion;
import ra.project.server.repository.PromotionRepository;

import java.util.List;

@RestController
@RequestMapping("/api/admin/promotions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminPromotionController {

    private final PromotionRepository promotionRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Promotion>>> getAllPromotions() {
        List<Promotion> list = promotionRepository.findAll().stream()
                .peek(p -> {
                    if (p.getType() == null) {
                        p.setType(p.isShippingDiscount() ? "SHIPPING" : "ORDER");
                    }
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã khuyến mãi thành công", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Promotion>> getPromotionById(@PathVariable Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mã khuyến mãi", "id", id));
        if (promotion.getType() == null) {
            promotion.setType(promotion.isShippingDiscount() ? "SHIPPING" : "ORDER");
        }
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết mã khuyến mãi thành công", promotion));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Promotion>> createPromotion(@RequestBody Promotion request) {
        validatePromotion(request);
        String normalizedCode = request.getCode().trim().toUpperCase();
        if (promotionRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new ra.project.server.exception.BadRequestException("Mã khuyến mãi '" + normalizedCode + "' đã tồn tại!");
        }
        request.setCode(normalizedCode);
        if (request.getStatus() == null || request.getStatus().isBlank()) {
            request.setStatus("ACTIVE");
        } else {
            request.setStatus("INACTIVE".equalsIgnoreCase(request.getStatus().trim()) ? "INACTIVE" : "ACTIVE");
        }
        if (request.getUsedCount() == null) {
            request.setUsedCount(0);
        }
        if (request.getType() == null || request.getType().isBlank()) {
            request.setType(request.isShippingDiscount() ? "SHIPPING" : "ORDER");
        }
        Promotion saved = promotionRepository.save(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo mã khuyến mãi thành công", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Promotion>> updatePromotion(
            @PathVariable Long id,
            @RequestBody Promotion request
    ) {
        Promotion existing = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mã khuyến mãi", "id", id));

        validatePromotion(request);
        String normalizedCode = request.getCode().trim().toUpperCase();
        if (promotionRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, id)) {
            throw new ra.project.server.exception.BadRequestException("Mã khuyến mãi '" + normalizedCode + "' đã được sử dụng bởi chương trình khác!");
        }

        existing.setCode(normalizedCode);
        existing.setTitle(request.getTitle() != null ? request.getTitle().trim() : existing.getTitle());
        existing.setDiscount(request.getDiscount().trim());
        existing.setMinOrder(request.getMinOrder());
        existing.setStartDate(request.getStartDate());
        existing.setExpiry(request.getExpiry());
        existing.setMaxDiscountAmount(request.getMaxDiscountAmount());
        if (request.getUsedCount() != null && (request.getUsedCount() > 0 || existing.getUsedCount() == null || existing.getUsedCount() == 0)) {
            existing.setUsedCount(request.getUsedCount());
        }
        if (request.getMaxUsage() != null) {
            existing.setMaxUsage(request.getMaxUsage());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            existing.setStatus("INACTIVE".equalsIgnoreCase(request.getStatus().trim()) ? "INACTIVE" : "ACTIVE");
        }
        existing.setUserId(request.getUserId());
        existing.setType(request.getType() != null && !request.getType().isBlank()
                ? request.getType().trim().toUpperCase()
                : (existing.isShippingDiscount() ? "SHIPPING" : "ORDER"));

        Promotion updated = promotionRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật mã khuyến mãi thành công", updated));
    }

    @PatchMapping(value = {"/{id}/status", "/{id}/toggle-status"})
    @PutMapping(value = {"/{id}/status", "/{id}/toggle-status"})
    public ResponseEntity<ApiResponse<Promotion>> togglePromotionStatus(
            @PathVariable Long id,
            @RequestParam(name = "status", required = false) String statusParam
    ) {
        Promotion existing = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mã khuyến mãi", "id", id));

        String newStatus;
        if (statusParam != null && !statusParam.isBlank()) {
            newStatus = "active".equalsIgnoreCase(statusParam) || "true".equalsIgnoreCase(statusParam) ? "ACTIVE" : "INACTIVE";
        } else {
            newStatus = "ACTIVE".equalsIgnoreCase(existing.getStatus()) ? "INACTIVE" : "ACTIVE";
        }
        existing.setStatus(newStatus);
        Promotion saved = promotionRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Đổi trạng thái mã khuyến mãi thành công sang: " + newStatus, saved));
    }

    private void validatePromotion(Promotion p) {
        if (p.getCode() == null || p.getCode().trim().isEmpty()) {
            throw new ra.project.server.exception.BadRequestException("Mã khuyến mãi không được để trống!");
        }
        if (p.getDiscount() == null || p.getDiscount().trim().isEmpty()) {
            throw new ra.project.server.exception.BadRequestException("Giá trị giảm giá không được để trống!");
        }
        String discountStr = p.getDiscount().trim();
        if (discountStr.endsWith("%")) {
            try {
                double percent = Double.parseDouble(discountStr.replace("%", "").trim());
                if (percent <= 0 || percent > 100) {
                    throw new ra.project.server.exception.BadRequestException("Giá trị giảm theo phần trăm phải nằm trong khoảng từ 1% đến 100%!");
                }
            } catch (NumberFormatException e) {
                throw new ra.project.server.exception.BadRequestException("Định dạng phần trăm giảm giá không hợp lệ: " + discountStr);
            }
        }

        if (p.getMaxDiscountAmount() != null && p.getMaxDiscountAmount().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new ra.project.server.exception.BadRequestException("Giảm tối đa không được là số âm!");
        }
        if (p.getMaxUsage() != null && p.getMaxUsage() < 1) {
            throw new ra.project.server.exception.BadRequestException("Số lượt sử dụng tối đa phải lớn hơn 0!");
        }

        java.time.LocalDate parsedStart = null;
        java.time.LocalDate parsedExpiry = null;
        if (p.getStartDate() != null && !p.getStartDate().isBlank()) {
            try {
                parsedStart = java.time.LocalDate.parse(p.getStartDate().trim());
            } catch (java.time.format.DateTimeParseException e) {
                throw new ra.project.server.exception.BadRequestException("Định dạng ngày bắt đầu không hợp lệ (YYYY-MM-DD)!");
            }
        }
        if (p.getExpiry() != null && !p.getExpiry().isBlank()) {
            try {
                parsedExpiry = java.time.LocalDate.parse(p.getExpiry().trim());
            } catch (java.time.format.DateTimeParseException e) {
                throw new ra.project.server.exception.BadRequestException("Định dạng ngày hết hạn không hợp lệ (YYYY-MM-DD)!");
            }
        }
        if (parsedStart != null && parsedExpiry != null && parsedStart.isAfter(parsedExpiry)) {
            throw new ra.project.server.exception.BadRequestException("Ngày bắt đầu không được lớn hơn ngày kết thúc!");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePromotion(@PathVariable Long id) {
        if (!promotionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Mã khuyến mãi", "id", id);
        }
        promotionRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa mã khuyến mãi thành công", null));
    }
}
