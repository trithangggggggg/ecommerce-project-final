package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.service.SystemSettingService;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SystemSettingController {

    private final SystemSettingService systemSettingService;

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPublicSettings() {
        Map<String, Object> settings = systemSettingService.getPublicSettings();
        return ResponseEntity.ok(ApiResponse.success("Lấy cấu hình hệ thống công khai thành công", settings));
    }
}

