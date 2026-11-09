package ra.project.server.service;

import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.WheelReward;
import ra.project.server.model.dto.response.WheelSpinResponse;
import ra.project.server.model.dto.response.WheelStatusResponse;

import java.util.List;

public interface WheelService {

    List<WheelReward> getDefaultRewards();

    ApiResponse<WheelStatusResponse> getWheelStatus();

    ApiResponse<WheelSpinResponse> spinWheel();
}

