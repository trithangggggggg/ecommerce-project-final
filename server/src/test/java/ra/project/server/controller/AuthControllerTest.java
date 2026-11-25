package ra.project.server.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ConflictException;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.model.dto.request.LoginRequest;
import ra.project.server.model.dto.request.RegisterRequest;
import ra.project.server.model.dto.request.ResendOtpRequest;
import ra.project.server.model.dto.request.VerifyOtpRequest;
import ra.project.server.model.dto.response.AuthResponse;
import ra.project.server.model.dto.response.UserProfileResponse;
import ra.project.server.model.enums.Role;
import ra.project.server.service.AuthService;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void whenRegisterSuccess_thenReturn201() throws Exception {
        UserProfileResponse userProfile = UserProfileResponse.builder()
                .id(1L)
                .username("nguyenvana")
                .email("vana@gmail.com")
                .fullName("Nguyen Van A")
                .role(Role.CUSTOMER)
                .createdAt(LocalDateTime.now())
                .build();

        when(authService.register(any(RegisterRequest.class)))
                .thenReturn(ApiResponse.success(HttpStatus.CREATED, "Đăng ký tài khoản thành công", userProfile));

        String requestJson = """
                {
                    "username": "nguyenvana",
                    "email": "vana@gmail.com",
                    "password": "password123",
                    "fullName": "Nguyen Van A"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đăng ký tài khoản thành công"))
                .andExpect(jsonPath("$.data.username").value("nguyenvana"))
                .andExpect(jsonPath("$.data.email").value("vana@gmail.com"));
    }

    @Test
    void whenRegisterDuplicateUsername_thenReturn409() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new ConflictException("Tên đăng nhập đã được sử dụng"));

        String requestJson = """
                {
                    "username": "existinguser",
                    "email": "user@gmail.com",
                    "password": "password123"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Tên đăng nhập đã được sử dụng"));
    }

    @Test
    void whenLoginSuccess_thenReturn200WithToken() throws Exception {
        UserProfileResponse userProfile = UserProfileResponse.builder()
                .id(1L)
                .username("nguyenvana")
                .email("vana@gmail.com")
                .role(Role.CUSTOMER)
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mocked.jwt.token")
                .tokenType("Bearer")
                .user(userProfile)
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenReturn(ApiResponse.success("Đăng nhập thành công", authResponse));

        String requestJson = """
                {
                    "usernameOrEmail": "nguyenvana",
                    "password": "password123"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đăng nhập thành công"))
                .andExpect(jsonPath("$.data.accessToken").value("mocked.jwt.token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
    }

    @Test
    void whenLoginInvalidCredentials_thenReturn401() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new UnauthorizedException("Tên đăng nhập hoặc mật khẩu không chính xác"));

        String requestJson = """
                {
                    "usernameOrEmail": "wronguser",
                    "password": "wrongpassword"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Tên đăng nhập hoặc mật khẩu không chính xác"));
    }

    @Test
    void whenVerifyOtpSuccess_thenReturn200WithToken() throws Exception {
        UserProfileResponse userProfile = UserProfileResponse.builder()
                .id(1L)
                .username("nguyenvana")
                .email("vana@gmail.com")
                .role(Role.CUSTOMER)
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("verified.jwt.token")
                .tokenType("Bearer")
                .user(userProfile)
                .build();

        when(authService.verifyOtp(any(VerifyOtpRequest.class)))
                .thenReturn(ApiResponse.success("Xác thực OTP thành công! Tài khoản của bạn đã được kích hoạt.", authResponse));

        String requestJson = """
                {
                    "email": "vana@gmail.com",
                    "otp": "123456"
                }
                """;

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xác thực OTP thành công! Tài khoản của bạn đã được kích hoạt."))
                .andExpect(jsonPath("$.data.accessToken").value("verified.jwt.token"));
    }

    @Test
    void whenVerifyOtpInvalid_thenReturn400() throws Exception {
        when(authService.verifyOtp(any(VerifyOtpRequest.class)))
                .thenThrow(new BadRequestException("Mã OTP không chính xác. Vui lòng kiểm tra lại!"));

        String requestJson = """
                {
                    "email": "vana@gmail.com",
                    "otp": "999999"
                }
                """;

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Mã OTP không chính xác. Vui lòng kiểm tra lại!"));
    }

    @Test
    void whenResendOtpSuccess_thenReturn200() throws Exception {
        when(authService.resendOtp(any(ResendOtpRequest.class)))
                .thenReturn(ApiResponse.success("Mã OTP mới đã được gửi tới email vana@gmail.com. Vui lòng kiểm tra hộp thư!", null));

        String requestJson = """
                {
                    "email": "vana@gmail.com"
                }
                """;

        mockMvc.perform(post("/api/auth/resend-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Mã OTP mới đã được gửi tới email vana@gmail.com. Vui lòng kiểm tra hộp thư!"));
    }
}
