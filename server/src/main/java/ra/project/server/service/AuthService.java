package ra.project.server.service;

import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.LoginRequest;
import ra.project.server.model.dto.request.RegisterRequest;
import ra.project.server.model.dto.request.ResendOtpRequest;
import ra.project.server.model.dto.request.VerifyOtpRequest;
import ra.project.server.model.dto.response.AuthResponse;
import ra.project.server.model.dto.response.UserProfileResponse;

public interface AuthService {

    /**
     * Đăng ký tài khoản mới (tạo tài khoản với status = false và gửi OTP xác thực)
     */
    ApiResponse<UserProfileResponse> register(RegisterRequest request);

    /**
     * Đăng nhập hệ thống (chỉ cho phép khi tài khoản có status = true)
     */
    ApiResponse<AuthResponse> login(LoginRequest request);

    /**
     * Xác thực mã OTP 6 chữ số để kích hoạt tài khoản (status = true) và cấp JWT token
     */
    ApiResponse<AuthResponse> verifyOtp(VerifyOtpRequest request);

    /**
     * Gửi lại mã OTP qua email (giới hạn tối đa 1 lần/phút)
     */
    ApiResponse<String> resendOtp(ResendOtpRequest request);
}
