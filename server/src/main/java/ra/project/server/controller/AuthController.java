package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.LoginRequest;
import ra.project.server.model.dto.request.RegisterRequest;
import ra.project.server.model.dto.response.AuthResponse;
import ra.project.server.model.dto.response.UserProfileResponse;
import ra.project.server.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserProfileResponse>> register(@Valid @RequestBody RegisterRequest request) {
        ApiResponse<UserProfileResponse> response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/login")
    public ResponseEntity<ApiResponse<String>> loginGetInfo() {
        return ResponseEntity.ok(ApiResponse.success(
                "API Endpoint Xác thực: Vui lòng gửi yêu cầu POST đến /api/auth/login kèm body JSON { usernameOrEmail, password }, hoặc truy cập giao diện web tại http://localhost:5173/login"
        ));
    }

    @GetMapping("/register")
    public ResponseEntity<ApiResponse<String>> registerGetInfo() {
        return ResponseEntity.ok(ApiResponse.success(
                "API Endpoint Đăng ký: Vui lòng gửi yêu cầu POST đến /api/auth/register kèm body JSON, hoặc truy cập giao diện web tại http://localhost:5173/register"
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        ApiResponse<AuthResponse> response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
