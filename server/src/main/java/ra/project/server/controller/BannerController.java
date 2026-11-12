package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.entity.Banner;
import ra.project.server.service.BannerService;

import java.util.List;

@RestController
@RequestMapping("/api/banners")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BannerController {

    private final BannerService bannerService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Banner>>> getPublicBanners(
            @RequestParam(required = false) String position
    ) {
        List<Banner> list = bannerService.getPublicBanners(position);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách banner thành công", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Banner>> getBannerById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết banner thành công", bannerService.getBannerById(id)));
    }

    @PostMapping("/{id}/click")
    public ResponseEntity<ApiResponse<Void>> trackClick(@PathVariable Long id) {
        bannerService.incrementClickCount(id);
        return ResponseEntity.ok(ApiResponse.success("Ghi nhận lượt nhấp banner thành công", null));
    }
}

