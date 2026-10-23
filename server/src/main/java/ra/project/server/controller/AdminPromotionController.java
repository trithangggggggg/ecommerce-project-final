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
        List<Promotion> list = promotionRepository.findAll();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã khuyến mãi thành công", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Promotion>> getPromotionById(@PathVariable Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mã khuyến mãi", "id", id));
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết mã khuyến mãi thành công", promotion));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Promotion>> createPromotion(@RequestBody Promotion request) {
        if (promotionRepository.existsByCodeIgnoreCase(request.getCode())) {
            throw new IllegalArgumentException("Mã khuyến mãi '" + request.getCode() + "' đã tồn tại!");
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

        existing.setCode(request.getCode());
        existing.setTitle(request.getTitle());
        existing.setDiscount(request.getDiscount());
        existing.setMinOrder(request.getMinOrder());
        existing.setExpiry(request.getExpiry());
        existing.setUsedCount(request.getUsedCount());
        existing.setMaxUsage(request.getMaxUsage());
        existing.setStatus(request.getStatus());

        Promotion updated = promotionRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật mã khuyến mãi thành công", updated));
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
