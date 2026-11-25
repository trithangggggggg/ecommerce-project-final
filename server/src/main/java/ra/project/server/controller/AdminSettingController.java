package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.entity.SystemSetting;
import ra.project.server.service.SystemSettingService;
import ra.project.server.util.PaginationUtil;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminSettingController {

    private final SystemSettingService systemSettingService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SystemSetting>>> getSettings(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String group,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(defaultValue = "id,asc") String sort
    ) {
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<SystemSetting> response = systemSettingService.searchAdminSettings(keyword, group, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cấu hình thành công", response));
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<SystemSetting>>> getAllSettings(
            @RequestParam(required = false) String group
    ) {
        List<SystemSetting> list = systemSettingService.getAllAdminSettings(group);
        return ResponseEntity.ok(ApiResponse.success("Lấy toàn bộ cấu hình thành công", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SystemSetting>> getSettingById(@PathVariable Long id) {
        SystemSetting setting = systemSettingService.getSettingById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết cấu hình thành công", setting));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SystemSetting>> createSetting(@RequestBody SystemSetting request) {
        SystemSetting created = systemSettingService.createSetting(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm cấu hình mới thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SystemSetting>> updateSetting(
            @PathVariable Long id,
            @RequestBody SystemSetting request
    ) {
        SystemSetting updated = systemSettingService.updateSetting(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cấu hình thành công", updated));
    }

    @PutMapping("/bulk")
    public ResponseEntity<ApiResponse<List<SystemSetting>>> bulkUpdateSettings(
            @RequestBody Map<String, Object> payload
    ) {
        List<SystemSetting> updated = systemSettingService.bulkUpdate(payload);
        return ResponseEntity.ok(ApiResponse.success("Lưu cấu hình hệ thống thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSetting(@PathVariable Long id) {
        systemSettingService.deleteSetting(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa cấu hình thành công", null));
    }
}

