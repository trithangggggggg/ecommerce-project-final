package ra.project.server.service;

import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.UpdateProfileRequest;
import ra.project.server.model.dto.response.UserProfileResponse;

public interface UserService {
    ApiResponse<UserProfileResponse> getCurrentUserProfile();
    ApiResponse<UserProfileResponse> updateCurrentUserProfile(UpdateProfileRequest request);
}
