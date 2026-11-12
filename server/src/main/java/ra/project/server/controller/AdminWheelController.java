package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
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
import java.util.Map;

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

    @GetMapping("/history/{id}")
    public ResponseEntity<ApiResponse<AdminWheelSpinHistoryResponse>> getSpinHistoryById(@PathVariable Long id) {
        return ResponseEntity.ok(wheelService.getSpinHistoryById(id));
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

    @GetMapping("/rewards/paged")
    public ResponseEntity<ApiResponse<PageResponse<WheelReward>>> searchAdminRewards(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageResponse<WheelReward> res = wheelService.searchAdminRewards(keyword, isActive, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách giải thưởng quản trị thành công", res));
    }

    @GetMapping("/rewards/{id}")
    public ResponseEntity<ApiResponse<WheelReward>> getRewardById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết giải thưởng thành công", wheelService.getRewardById(id)));
    }

    @PostMapping("/rewards")
    public ResponseEntity<ApiResponse<WheelReward>> createReward(@RequestBody WheelReward request) {
        WheelReward created = wheelService.createReward(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm giải thưởng vòng quay thành công", created));
    }

    @PutMapping("/rewards/{id}")
    public ResponseEntity<ApiResponse<WheelReward>> updateReward(
            @PathVariable Long id,
            @RequestBody WheelReward request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật giải thưởng thành công", wheelService.updateReward(id, request)));
    }

    @PatchMapping("/rewards/{id}/status")
    public ResponseEntity<ApiResponse<WheelReward>> toggleRewardStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Boolean> body
    ) {
        Boolean isActive = body != null ? body.get("isActive") : null;
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái giải thưởng thành công", wheelService.toggleRewardStatus(id, isActive)));
    }

    @DeleteMapping("/rewards/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReward(@PathVariable Long id) {
        wheelService.deleteReward(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa giải thưởng vòng quay thành công", null));
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

