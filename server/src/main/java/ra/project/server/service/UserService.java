package ra.project.server.service;

import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.ChangePasswordRequest;
import ra.project.server.model.dto.request.UpdateProfileRequest;
import ra.project.server.model.dto.response.AdminUserResponse;
import ra.project.server.model.dto.response.UserProfileResponse;

import ra.project.server.model.dto.request.AdminUserRequest;

import java.util.List;
import java.util.Map;

public interface UserService {
    ApiResponse<UserProfileResponse> getCurrentUserProfile();
    ApiResponse<UserProfileResponse> updateCurrentUserProfile(UpdateProfileRequest request);
    ApiResponse<Void> changePassword(ChangePasswordRequest request);

    ApiResponse<List<AdminUserResponse>> getAllUsers(String keyword, Boolean status);
    ApiResponse<AdminUserResponse> getAdminUserById(Long userId);
    ApiResponse<AdminUserResponse> updateUserStatus(Long userId, Boolean status);
    ApiResponse<AdminUserResponse> createAdminUser(AdminUserRequest request);
    ApiResponse<AdminUserResponse> updateAdminUser(Long userId, AdminUserRequest request);
    ApiResponse<Map<String, Object>> deleteAdminUser(Long userId);
}

