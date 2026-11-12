package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.entity.Brand;
import ra.project.server.service.BrandService;

import java.util.List;

@RestController
@RequestMapping("/api/brands")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BrandController {

    private final BrandService brandService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Brand>>> getActiveBrands() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thương hiệu thành công", brandService.getActiveBrands()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Brand>> getBrandById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thương hiệu thành công", brandService.getBrandById(id)));
    }
}

