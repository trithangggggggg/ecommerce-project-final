package ra.project.server.controller;

import jakarta.annotation.PostConstruct;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.dto.request.StoreLocationRequest;
import ra.project.server.model.entity.StoreLocation;
import ra.project.server.repository.StoreLocationRepository;

import java.util.List;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class StoreLocationController {

    private final StoreLocationRepository storeLocationRepository;

    @PostConstruct
    public void initSeedData() {
        try {
            seedDefaultStoresIfEmpty();
        } catch (Exception e) {
            log.warn("Lỗi khi khởi tạo dữ liệu mẫu showroom: {}", e.getMessage());
        }
    }

    /**
     * Tự động khởi tạo 6 showroom mẫu tại Hà Nội, TP.HCM và Đà Nẵng với tọa độ GPS thực tế
     */
    public synchronized void seedDefaultStoresIfEmpty() {
        if (storeLocationRepository.count() == 0) {
            log.info("Bắt đầu khởi tạo 6 showroom mẫu trên hệ thống...");
            List<StoreLocation> defaultStores = List.of(
                    // Hà Nội (2 Showroom)
                    StoreLocation.builder()
                            .name("NEXOR Showroom Cầu Giấy")
                            .address("Số 123 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội")
                            .province("Hà Nội")
                            .district("Quận Cầu Giấy")
                            .phoneNumber("024 3767 8888")
                            .latitude(21.034870)
                            .longitude(105.795230)
                            .openHours("08:00 - 22:00")
                            .status("ACTIVE")
                            .build(),
                    StoreLocation.builder()
                            .name("NEXOR Flagship Thái Hà")
                            .address("Số 88 Phố Thái Hà, Phường Trung Liệt, Quận Đống Đa, Hà Nội")
                            .province("Hà Nội")
                            .district("Quận Đống Đa")
                            .phoneNumber("024 3857 9999")
                            .latitude(21.011850)
                            .longitude(105.819320)
                            .openHours("08:00 - 22:00")
                            .status("ACTIVE")
                            .build(),

                    // TP. Hồ Chí Minh (2 Showroom)
                    StoreLocation.builder()
                            .name("NEXOR Flagship Nguyễn Huệ")
                            .address("Số 68 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh")
                            .province("TP. Hồ Chí Minh")
                            .district("Quận 1")
                            .phoneNumber("028 3822 6868")
                            .latitude(10.774260)
                            .longitude(106.703210)
                            .openHours("08:30 - 22:30")
                            .status("ACTIVE")
                            .build(),
                    StoreLocation.builder()
                            .name("NEXOR Showroom Ba Tháng Hai")
                            .address("Số 256 Đường 3 Tháng 2, Phường 12, Quận 10, TP. Hồ Chí Minh")
                            .province("TP. Hồ Chí Minh")
                            .district("Quận 10")
                            .phoneNumber("028 3868 3333")
                            .latitude(10.770980)
                            .longitude(106.671560)
                            .openHours("08:00 - 22:00")
                            .status("ACTIVE")
                            .build(),

                    // Đà Nẵng (2 Showroom)
                    StoreLocation.builder()
                            .name("NEXOR Flagship Nguyễn Văn Linh")
                            .address("Số 150 Đường Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, Đà Nẵng")
                            .province("Đà Nẵng")
                            .district("Quận Hải Châu")
                            .phoneNumber("0236 3658 999")
                            .latitude(16.060140)
                            .longitude(108.216390)
                            .openHours("08:00 - 21:30")
                            .status("ACTIVE")
                            .build(),
                    StoreLocation.builder()
                            .name("NEXOR Showroom Điện Biên Phủ")
                            .address("Số 320 Đường Điện Biên Phủ, Phường Chính Gián, Quận Thanh Khê, Đà Nẵng")
                            .province("Đà Nẵng")
                            .district("Quận Thanh Khê")
                            .phoneNumber("0236 3745 678")
                            .latitude(16.067820)
                            .longitude(108.195430)
                            .openHours("08:00 - 21:30")
                            .status("ACTIVE")
                            .build()
            );
            storeLocationRepository.saveAll(defaultStores);
            log.info("Đã tạo thành công 6 showroom mẫu trên Database!");
        }
    }

    // ========================================================
    // 1. PUBLIC APIS: DÀNH CHO KHÁCH HÀNG & GIAO DIỆN STORE
    // ========================================================

    /**
     * Lấy danh sách showroom (công khai).
     * Hỗ trợ lọc theo tỉnh thành: GET /api/stores?province=...
     */
    @GetMapping("/api/stores")
    public ResponseEntity<ApiResponse<List<StoreLocation>>> getPublicStores(
            @RequestParam(required = false) String province
    ) {
        seedDefaultStoresIfEmpty();
        List<StoreLocation> stores;
        if (StringUtils.hasText(province)) {
            stores = storeLocationRepository.findByProvinceContainingIgnoreCaseAndStatusIgnoreCase(province.trim(), "ACTIVE");
        } else {
            stores = storeLocationRepository.findByStatusIgnoreCase("ACTIVE");
        }
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách showroom thành công", stores));
    }

    /**
     * Lấy chi tiết showroom theo ID (công khai)
     */
    @GetMapping("/api/stores/{id}")
    public ResponseEntity<ApiResponse<StoreLocation>> getPublicStoreById(@PathVariable Long id) {
        seedDefaultStoresIfEmpty();
        StoreLocation store = storeLocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Showroom", "id", id));
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin showroom thành công", store));
    }

    // ========================================================
    // 2. ADMIN APIS: CRUD QUẢN LÝ SHOWROOM CHO QUẢN TRỊ VIÊN
    // ========================================================

    /**
     * Lấy tất cả showroom trong hệ thống (kể cả ACTIVE và INACTIVE)
     */
    @GetMapping("/api/admin/stores")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<List<StoreLocation>>> getAllStoresForAdmin(
            @RequestParam(required = false) String province
    ) {
        seedDefaultStoresIfEmpty();
        List<StoreLocation> stores;
        if (StringUtils.hasText(province)) {
            stores = storeLocationRepository.findByProvinceContainingIgnoreCase(province.trim());
        } else {
            stores = storeLocationRepository.findAllByOrderByIdAsc();
        }
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách quản trị showroom thành công", stores));
    }

    /**
     * Lấy chi tiết showroom theo ID cho Admin
     */
    @GetMapping("/api/admin/stores/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<StoreLocation>> getStoreByIdForAdmin(@PathVariable Long id) {
        StoreLocation store = storeLocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Showroom", "id", id));
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết showroom thành công", store));
    }

    /**
     * Thêm showroom mới
     */
    @PostMapping("/api/admin/stores")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<StoreLocation>> createStore(@Valid @RequestBody StoreLocationRequest request) {
        StoreLocation store = StoreLocation.builder()
                .name(request.getName().trim())
                .address(request.getAddress().trim())
                .province(request.getProvince().trim())
                .district(request.getDistrict() != null ? request.getDistrict().trim() : null)
                .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .openHours(request.getOpenHours() != null ? request.getOpenHours().trim() : "08:00 - 22:00")
                .imageUrl(request.getImageUrl() != null && !request.getImageUrl().isBlank() ? request.getImageUrl().trim() : null)
                .status(StringUtils.hasText(request.getStatus()) ? request.getStatus().trim().toUpperCase() : "ACTIVE")
                .build();

        StoreLocation saved = storeLocationRepository.save(store);
        log.info("Admin đã tạo showroom mới: #{} - {}", saved.getId(), saved.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm showroom mới thành công", saved));
    }

    /**
     * Cập nhật thông tin showroom
     */
    @PutMapping("/api/admin/stores/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<StoreLocation>> updateStore(
            @PathVariable Long id,
            @Valid @RequestBody StoreLocationRequest request
    ) {
        StoreLocation existing = storeLocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Showroom", "id", id));

        existing.setName(request.getName().trim());
        existing.setAddress(request.getAddress().trim());
        existing.setProvince(request.getProvince().trim());
        existing.setDistrict(request.getDistrict() != null ? request.getDistrict().trim() : null);
        existing.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null);
        existing.setLatitude(request.getLatitude());
        existing.setLongitude(request.getLongitude());
        existing.setOpenHours(request.getOpenHours() != null ? request.getOpenHours().trim() : existing.getOpenHours());
        if (request.getImageUrl() != null) {
            existing.setImageUrl(request.getImageUrl().isBlank() ? null : request.getImageUrl().trim());
        }
        if (StringUtils.hasText(request.getStatus())) {
            existing.setStatus(request.getStatus().trim().toUpperCase());
        }

        StoreLocation updated = storeLocationRepository.save(existing);
        log.info("Admin đã cập nhật showroom: #{} - {}", updated.getId(), updated.getName());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin showroom thành công", updated));
    }

    /**
     * Xóa showroom
     */
    @DeleteMapping("/api/admin/stores/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteStore(@PathVariable Long id) {
        if (!storeLocationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Showroom", "id", id);
        }
        storeLocationRepository.deleteById(id);
        log.info("Admin đã xóa showroom #{}", id);
        return ResponseEntity.ok(ApiResponse.success("Xóa showroom thành công", null));
    }
}

