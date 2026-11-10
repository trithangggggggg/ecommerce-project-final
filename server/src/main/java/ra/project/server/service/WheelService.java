package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.WheelReward;
import ra.project.server.model.dto.response.AdminWheelSpinHistoryResponse;
import ra.project.server.model.dto.response.AdminWheelStatsResponse;
import ra.project.server.model.dto.response.WheelSpinResponse;
import ra.project.server.model.dto.response.WheelStatusResponse;

import java.time.LocalDate;
import java.util.List;

public interface WheelService {

    List<WheelReward> getDefaultRewards();

    ApiResponse<WheelStatusResponse> getWheelStatus();

    ApiResponse<WheelSpinResponse> spinWheel();

    // Admin methods
    ApiResponse<PageResponse<AdminWheelSpinHistoryResponse>> getSpinHistory(String keyword, LocalDate spinDate, Pageable pageable);

    ApiResponse<AdminWheelStatsResponse> getWheelStats();

    ApiResponse<Void> deleteSpinHistory(Long id);

    ApiResponse<Void> resetUserDailySpin(Long userId);
}
