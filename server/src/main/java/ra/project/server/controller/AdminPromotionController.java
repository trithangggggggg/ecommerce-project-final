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
        if (promotionRepository.existsByCodeIgnoreCase(request.getCode())) {
            throw new ra.project.server.exception.BadRequestException("Mã khuyến mãi '" + request.getCode() + "' đã tồn tại!");
        }
        if (request.getType() == null) {
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
        if (request.getCode() != null && promotionRepository.existsByCodeIgnoreCaseAndIdNot(request.getCode(), id)) {
            throw new ra.project.server.exception.BadRequestException("Mã khuyến mãi '" + request.getCode() + "' đã được sử dụng bởi chương trình khác!");
        }

        existing.setCode(request.getCode());
        existing.setTitle(request.getTitle());
        existing.setDiscount(request.getDiscount());
        existing.setMinOrder(request.getMinOrder());
        existing.setStartDate(request.getStartDate());
        existing.setExpiry(request.getExpiry());
        existing.setUsedCount(request.getUsedCount());
        existing.setMaxUsage(request.getMaxUsage());
        if (request.getStatus() != null) {
            existing.setStatus(request.getStatus());
        }
        existing.setType(request.getType() != null ? request.getType() : (existing.isShippingDiscount() ? "SHIPPING" : "ORDER"));

        Promotion updated = promotionRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật mã khuyến mãi thành công", updated));
    }

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

        if (p.getStartDate() != null && !p.getStartDate().isBlank() && p.getExpiry() != null && !p.getExpiry().isBlank()) {
            if (p.getStartDate().compareTo(p.getExpiry()) > 0) {
                throw new ra.project.server.exception.BadRequestException("Ngày bắt đầu không được lớn hơn ngày kết thúc!");
            }
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
