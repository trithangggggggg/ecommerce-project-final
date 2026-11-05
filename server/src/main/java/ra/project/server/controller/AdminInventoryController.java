package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.request.ImportReceiptRequest;
import ra.project.server.model.dto.response.ImportReceiptResponse;
import ra.project.server.service.ImportReceiptService;
import ra.project.server.util.PaginationUtil;

@RestController
@RequestMapping("/api/admin/inventory/receipts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminInventoryController {

    private final ImportReceiptService importReceiptService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ImportReceiptResponse>>> getAllReceipts(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size,
            @RequestParam(name = "sort", defaultValue = "createdAt,desc") String sort
    ) {
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<ImportReceiptResponse> response = importReceiptService.getAllReceipts(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách phiếu nhập kho thành công", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ImportReceiptResponse>> getReceiptById(@PathVariable Long id) {
        ImportReceiptResponse response = importReceiptService.getReceiptById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết phiếu nhập kho thành công", response));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<ImportReceiptResponse>> getReceiptByCode(@PathVariable String code) {
        ImportReceiptResponse response = importReceiptService.getReceiptByCode(code);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết phiếu nhập kho theo mã thành công", response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ImportReceiptResponse>> createReceipt(
            @Valid @RequestBody ImportReceiptRequest request
    ) {
        ImportReceiptResponse response = importReceiptService.createReceipt(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo phiếu nhập kho và cập nhật số lượng thành công", response));
    }
}

