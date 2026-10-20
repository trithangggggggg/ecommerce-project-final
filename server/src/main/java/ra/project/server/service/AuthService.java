package ra.project.server.service;

import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.LoginRequest;
import ra.project.server.model.dto.request.RegisterRequest;
import ra.project.server.model.dto.response.AuthResponse;
import ra.project.server.model.dto.response.UserProfileResponse;

public interface AuthService {
    ApiResponse<UserProfileResponse> register(RegisterRequest request);
    ApiResponse<AuthResponse> login(LoginRequest request);
}
