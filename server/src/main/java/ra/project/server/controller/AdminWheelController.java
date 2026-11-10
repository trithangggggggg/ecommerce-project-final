package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.WheelReward;
import ra.project.server.model.dto.response.AdminWheelSpinHistoryResponse;
import ra.project.server.model.dto.response.AdminWheelStatsResponse;
import ra.project.server.service.WheelService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/wheel")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminWheelController {

    private final WheelService wheelService;

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<PageResponse<AdminWheelSpinHistoryResponse>>> getSpinHistory(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        ApiResponse<PageResponse<AdminWheelSpinHistoryResponse>> response =
                wheelService.getSpinHistory(search, date, PageRequest.of(page, size));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminWheelStatsResponse>> getWheelStats() {
        ApiResponse<AdminWheelStatsResponse> response = wheelService.getWheelStats();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/rewards")
    public ResponseEntity<ApiResponse<List<WheelReward>>> getWheelRewards() {
        List<WheelReward> rewards = wheelService.getDefaultRewards();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cấu hình giải thưởng thành công", rewards));
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSpinHistory(@PathVariable Long id) {
        ApiResponse<Void> response = wheelService.deleteSpinHistory(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-user/{userId}")
    public ResponseEntity<ApiResponse<Void>> resetUserDailySpin(@PathVariable Long userId) {
        ApiResponse<Void> response = wheelService.resetUserDailySpin(userId);
        return ResponseEntity.ok(response);
    }
}

