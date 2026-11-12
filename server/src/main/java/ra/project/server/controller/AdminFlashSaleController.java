package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.request.FlashSaleRequest;
import ra.project.server.model.dto.response.FlashSaleResponse;
import ra.project.server.service.FlashSaleService;
import ra.project.server.util.PaginationUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/flash-sales")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminFlashSaleController {

    private final FlashSaleService flashSaleService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FlashSaleResponse>>> searchFlashSales(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "startTime,desc") String sort
    ) {
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<FlashSaleResponse> response = flashSaleService.searchAdminFlashSales(keyword, isActive, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách Flash Sale quản trị thành công", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FlashSaleResponse>> getFlashSaleById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết Flash Sale thành công", flashSaleService.getFlashSaleById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FlashSaleResponse>> createFlashSale(@RequestBody FlashSaleRequest request) {
        FlashSaleResponse created = flashSaleService.createFlashSale(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo chương trình Flash Sale mới thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FlashSaleResponse>> updateFlashSale(
            @PathVariable Long id,
            @RequestBody FlashSaleRequest request
    ) {
        FlashSaleResponse updated = flashSaleService.updateFlashSale(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chương trình Flash Sale thành công", updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<FlashSaleResponse>> toggleStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Boolean> body
    ) {
        Boolean isActive = body != null ? body.get("isActive") : null;
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái Flash Sale thành công", flashSaleService.toggleFlashSaleStatus(id, isActive)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFlashSale(@PathVariable Long id) {
        flashSaleService.deleteFlashSale(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa chương trình Flash Sale thành công", null));
    }
}

