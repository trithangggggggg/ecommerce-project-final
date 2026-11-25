package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.entity.Banner;
import ra.project.server.service.BannerService;
import ra.project.server.util.PaginationUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/banners")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminBannerController {

    private final BannerService bannerService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Banner>>> searchBanners(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String position,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "displayOrder,asc") String sort
    ) {
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<Banner> response = bannerService.searchAdminBanners(keyword, position, isActive, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách banner quản trị thành công", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Banner>> getBannerById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết banner thành công", bannerService.getBannerById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Banner>> createBanner(@RequestBody Banner request) {
        Banner created = bannerService.createBanner(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo banner mới thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Banner>> updateBanner(@PathVariable Long id, @RequestBody Banner request) {
        Banner updated = bannerService.updateBanner(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật banner thành công", updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Banner>> toggleBannerStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Boolean> body
    ) {
        Boolean isActive = body != null ? body.get("isActive") : null;
        Banner updated = bannerService.toggleBannerStatus(id, isActive);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái banner thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBanner(@PathVariable Long id) {
        bannerService.deleteBanner(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa banner thành công", null));
    }
}

