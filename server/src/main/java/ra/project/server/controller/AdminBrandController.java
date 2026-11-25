package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.entity.Brand;
import ra.project.server.service.BrandService;
import ra.project.server.util.PaginationUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/brands")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminBrandController {

    private final BrandService brandService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Brand>>> searchBrands(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean status,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "displayOrder,asc") String sort
    ) {
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<Brand> response = brandService.searchAdminBrands(keyword, status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thương hiệu quản trị thành công", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Brand>> getBrandById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết thương hiệu thành công", brandService.getBrandById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Brand>> createBrand(@RequestBody Brand request) {
        Brand created = brandService.createBrand(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm thương hiệu thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Brand>> updateBrand(@PathVariable Long id, @RequestBody Brand request) {
        Brand updated = brandService.updateBrand(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thương hiệu thành công", updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Brand>> toggleStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Boolean> body
    ) {
        Boolean status = body != null ? body.get("status") : null;
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái thương hiệu thành công", brandService.toggleBrandStatus(id, status)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBrand(@PathVariable Long id) {
        brandService.deleteBrand(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa thương hiệu thành công", null));
    }
}

