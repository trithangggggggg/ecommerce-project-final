package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ConflictException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.model.dto.request.LoginRequest;
import ra.project.server.model.dto.request.RegisterRequest;
import ra.project.server.model.dto.request.ResendOtpRequest;
import ra.project.server.model.dto.request.VerifyOtpRequest;
import ra.project.server.model.dto.response.AuthResponse;
import ra.project.server.model.dto.response.UserProfileResponse;
import ra.project.server.model.entity.EmailOtp;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.EmailOtpRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.security.JwtTokenProvider;
import ra.project.server.service.impl.AuthServiceImpl;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: AuthServiceImpl (Authentication, Registration & OTP Verification)")
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailOtpRepository emailOtpRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthServiceImpl authService;

    private User existingUser;
    private User unverifiedUser;
    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private EmailOtp validOtp;

    @BeforeEach
    void setUp() {
        existingUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("testuser@gmail.com")
                .password("$2a$10$encodedPasswordHash")
                .fullName("Nguyễn Văn Test")
                .phoneNumber("0912345678")
                .address("Hà Nội")
                .role(Role.CUSTOMER)
                .status(true)
                .build();

        unverifiedUser = User.builder()
                .id(2L)
                .username("unverified")
                .email("unverified@gmail.com")
                .password("$2a$10$encodedPasswordHash")
                .fullName("Người dùng Chưa kích hoạt")
                .role(Role.CUSTOMER)
                .status(false)
                .build();

        registerRequest = RegisterRequest.builder()
                .username("newuser")
                .email("newuser@gmail.com")
                .password("Password123")
                .fullName("Trần Thị Mới")
                .phoneNumber("0987654321")
                .address("TP. Hồ Chí Minh")
                .build();

        loginRequest = LoginRequest.builder()
                .usernameOrEmail("testuser")
                .password("Password123")
                .build();

        validOtp = EmailOtp.builder()
                .id(100L)
                .email("unverified@gmail.com")
                .otp("123456")
                .expiryTime(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .createdAt(LocalDateTime.now().minusSeconds(10))
                .build();
    }

    // ==========================================
    // 1. TEST CASES: ĐĂNG KÝ (REGISTER & CREATE OTP)
    // ==========================================

    @Test
    @DisplayName("TC_AUTH_01: Đăng ký thành công nhưng tài khoản chưa được kích hoạt (status = false)")
    void register_success_statusIsFalse() {
        when(userRepository.findByUsernameIgnoreCase("newuser")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("newuser@gmail.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password123")).thenReturn("encodedSecretPassword");

        User savedUser = User.builder()
                .id(2L)
                .username("newuser")
                .email("newuser@gmail.com")
                .password("encodedSecretPassword")
                .fullName("Trần Thị Mới")
                .role(Role.CUSTOMER)
                .status(false) // status = false
                .build();

        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(emailOtpRepository.findAllByEmailIgnoreCaseOrderByCreatedAtDesc("newuser@gmail.com"))
                .thenReturn(Collections.emptyList());
        when(emailService.sendOtpEmail(eq("newuser@gmail.com"), eq("Trần Thị Mới"), anyString()))
                .thenReturn(true);

        ApiResponse<UserProfileResponse> response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED.value(), response.getStatus());
        assertTrue(response.getMessage().contains("Đăng ký tài khoản thành công"));
        assertNotNull(response.getData());
        assertEquals(2L, response.getData().getId());
        assertEquals("newuser", response.getData().getUsername());
        assertEquals("newuser@gmail.com", response.getData().getEmail());
        assertEquals(Role.CUSTOMER, response.getData().getRole());

        // Kiểm tra lưu tài khoản với status = false
        verify(userRepository).save(argThat(user -> Boolean.FALSE.equals(user.getStatus())));
        // Kiểm tra lưu OTP vào CSDL
        verify(emailOtpRepository).save(argThat(otp -> otp.getOtp().length() == 6 && !otp.getUsed()));
        // Kiểm tra gửi email OTP
        verify(emailService).sendOtpEmail(eq("newuser@gmail.com"), eq("Trần Thị Mới"), anyString());
    }

    @Test
    @DisplayName("TC_AUTH_02: Đăng ký thất bại do trùng username đã kích hoạt -> Ném ConflictException")
    void register_duplicateUsername_throwsConflictException() {
        when(userRepository.findByUsernameIgnoreCase("newuser")).thenReturn(Optional.of(existingUser));

        ConflictException ex = assertThrows(ConflictException.class, () -> authService.register(registerRequest));
        assertEquals("Tên đăng nhập đã được sử dụng", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("TC_AUTH_03: Đăng ký thất bại do trùng email đã kích hoạt -> Ném ConflictException")
    void register_duplicateEmail_throwsConflictException() {
        when(userRepository.findByUsernameIgnoreCase("newuser")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("newuser@gmail.com")).thenReturn(Optional.of(existingUser));

        ConflictException ex = assertThrows(ConflictException.class, () -> authService.register(registerRequest));
        assertEquals("Địa chỉ email đã được sử dụng", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
    }

    // ==========================================
    // 2. TEST CASES: ĐĂNG NHẬP (LOGIN)
    // ==========================================

    @Test
    @DisplayName("TC_AUTH_04: Đăng nhập thành công bằng username hợp lệ")
    void login_validUsername_success() {
        when(userRepository.findByEmailIgnoreCase("testuser")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("testuser")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("Password123", existingUser.getPassword())).thenReturn(true);
        when(jwtTokenProvider.generateTokenFromUsername("testuser")).thenReturn("mock-jwt-token-12345");

        ApiResponse<AuthResponse> response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals(HttpStatus.OK.value(), response.getStatus());
        assertEquals("Đăng nhập thành công", response.getMessage());
        assertNotNull(response.getData());
        assertEquals("mock-jwt-token-12345", response.getData().getAccessToken());
        assertEquals("Bearer", response.getData().getTokenType());
        assertEquals("testuser", response.getData().getUser().getUsername());
    }

    @Test
    @DisplayName("TC_AUTH_05: Đăng nhập thành công bằng email hợp lệ")
    void login_validEmail_success() {
        LoginRequest emailLogin = LoginRequest.builder()
                .usernameOrEmail("testuser@gmail.com")
                .password("Password123")
                .build();

        when(userRepository.findByEmailIgnoreCase("testuser@gmail.com")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("Password123", existingUser.getPassword())).thenReturn(true);
        when(jwtTokenProvider.generateTokenFromUsername("testuser")).thenReturn("mock-jwt-token-email");

        ApiResponse<AuthResponse> response = authService.login(emailLogin);

        assertNotNull(response);
        assertEquals("mock-jwt-token-email", response.getData().getAccessToken());
        assertEquals("testuser", response.getData().getUser().getUsername());
    }

    @Test
    @DisplayName("TC_AUTH_06: Đăng nhập thất bại do sai mật khẩu -> Ném UnauthorizedException")
    void login_invalidPassword_throwsUnauthorizedException() {
        when(userRepository.findByEmailIgnoreCase("testuser")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("testuser")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("WrongPassword", existingUser.getPassword())).thenReturn(false);

        LoginRequest wrongPassRequest = LoginRequest.builder()
                .usernameOrEmail("testuser")
                .password("WrongPassword")
                .build();

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> authService.login(wrongPassRequest));
        assertEquals("Tên đăng nhập hoặc mật khẩu không chính xác", ex.getMessage());

        verify(jwtTokenProvider, never()).generateTokenFromUsername(anyString());
    }

    @Test
    @DisplayName("TC_AUTH_07: Đăng nhập thất bại do username không tồn tại -> Ném UnauthorizedException")
    void login_userNotFound_throwsUnauthorizedException() {
        when(userRepository.findByEmailIgnoreCase("nonexistent")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("nonexistent")).thenReturn(Optional.empty());

        LoginRequest notFoundRequest = LoginRequest.builder()
                .usernameOrEmail("nonexistent")
                .password("Password123")
                .build();

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> authService.login(notFoundRequest));
        assertEquals("Tên đăng nhập hoặc mật khẩu không chính xác", ex.getMessage());

        verify(jwtTokenProvider, never()).generateTokenFromUsername(anyString());
    }

    @Test
    @DisplayName("TC_AUTH_08: Đăng nhập thất bại do tài khoản chưa kích hoạt (status = false) -> Ném BadRequestException")
    void login_accountNotActive_throwsBadRequestException() {
        when(userRepository.findByEmailIgnoreCase("unverified")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("unverified")).thenReturn(Optional.of(unverifiedUser));

        LoginRequest unverifiedLogin = LoginRequest.builder()
                .usernameOrEmail("unverified")
                .password("Password123")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(unverifiedLogin));
        assertTrue(ex.getMessage().contains("chưa được kích hoạt"));

        verify(jwtTokenProvider, never()).generateTokenFromUsername(anyString());
    }

    @Test
    @DisplayName("TC_AUTH_09: Đăng nhập thất bại do để trống thông tin -> Ném BadRequestException")
    void login_blankCredentials_throwsBadRequestException() {
        LoginRequest emptyRequest = LoginRequest.builder()
                .usernameOrEmail("   ")
                .password("")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(emptyRequest));
        assertEquals("Tên đăng nhập và mật khẩu không được để trống", ex.getMessage());

        verify(userRepository, never()).findByEmailIgnoreCase(anyString());
    }

    // ==========================================
    // 3. TEST CASES: XÁC THỰC MÃ OTP (VERIFY OTP)
    // ==========================================

    @Test
    @DisplayName("TC_AUTH_10: OTP hợp lệ kích hoạt được tài khoản (status = true) và cấp JWT Token")
    void verifyOtp_success() {
        VerifyOtpRequest request = VerifyOtpRequest.builder()
                .email("unverified@gmail.com")
                .otp("123456")
                .build();

        when(userRepository.findByEmailIgnoreCase("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));
        when(emailOtpRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc("unverified@gmail.com"))
                .thenReturn(Optional.of(validOtp));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtTokenProvider.generateTokenFromUsername("unverified")).thenReturn("jwt-token-verified-123");

        ApiResponse<AuthResponse> response = authService.verifyOtp(request);

        assertNotNull(response);
        assertEquals(HttpStatus.OK.value(), response.getStatus());
        assertTrue(response.getMessage().contains("Xác thực OTP thành công"));
        assertNotNull(response.getData());
        assertEquals("jwt-token-verified-123", response.getData().getAccessToken());
        assertEquals("Bearer", response.getData().getTokenType());

        // Kiểm tra OTP được đánh dấu used = true
        verify(emailOtpRepository).save(argThat(otp -> Boolean.TRUE.equals(otp.getUsed())));
        // Kiểm tra tài khoản được kích hoạt status = true
        verify(userRepository).save(argThat(user -> Boolean.TRUE.equals(user.getStatus())));
    }

    @Test
    @DisplayName("TC_AUTH_11: OTP sai bị từ chối -> Ném BadRequestException")
    void verifyOtp_wrongOtp_throwsBadRequestException() {
        VerifyOtpRequest request = VerifyOtpRequest.builder()
                .email("unverified@gmail.com")
                .otp("999999") // OTP sai
                .build();

        when(userRepository.findByEmailIgnoreCase("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));
        when(emailOtpRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc("unverified@gmail.com"))
                .thenReturn(Optional.of(validOtp));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.verifyOtp(request));
        assertEquals("Mã OTP không chính xác. Vui lòng kiểm tra lại!", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("TC_AUTH_12: OTP hết hạn bị từ chối -> Ném BadRequestException")
    void verifyOtp_expiredOtp_throwsBadRequestException() {
        validOtp.setExpiryTime(LocalDateTime.now().minusMinutes(1)); // Đã hết hạn

        VerifyOtpRequest request = VerifyOtpRequest.builder()
                .email("unverified@gmail.com")
                .otp("123456")
                .build();

        when(userRepository.findByEmailIgnoreCase("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));
        when(emailOtpRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc("unverified@gmail.com"))
                .thenReturn(Optional.of(validOtp));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.verifyOtp(request));
        assertEquals("Mã OTP đã hết hạn sử dụng. Vui lòng yêu cầu gửi lại mã mới!", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("TC_AUTH_13: OTP đã sử dụng bị từ chối -> Ném BadRequestException")
    void verifyOtp_alreadyUsed_throwsBadRequestException() {
        validOtp.setUsed(true); // Đã sử dụng

        VerifyOtpRequest request = VerifyOtpRequest.builder()
                .email("unverified@gmail.com")
                .otp("123456")
                .build();

        when(userRepository.findByEmailIgnoreCase("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));
        when(emailOtpRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc("unverified@gmail.com"))
                .thenReturn(Optional.of(validOtp));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.verifyOtp(request));
        assertEquals("Mã OTP này đã được sử dụng. Vui lòng yêu cầu mã OTP mới!", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("TC_AUTH_14: Xác thực OTP với email không tồn tại -> Ném ResourceNotFoundException")
    void verifyOtp_emailNotFound_throwsResourceNotFoundException() {
        VerifyOtpRequest request = VerifyOtpRequest.builder()
                .email("notfound@gmail.com")
                .otp("123456")
                .build();

        when(userRepository.findByEmailIgnoreCase("notfound@gmail.com")).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () -> authService.verifyOtp(request));
        assertEquals("Địa chỉ email không tồn tại trong hệ thống", ex.getMessage());
    }

    @Test
    @DisplayName("TC_AUTH_15: Xác thực OTP cho tài khoản đã kích hoạt -> Ném BadRequestException")
    void verifyOtp_alreadyActive_throwsBadRequestException() {
        VerifyOtpRequest request = VerifyOtpRequest.builder()
                .email("testuser@gmail.com")
                .otp("123456")
                .build();

        when(userRepository.findByEmailIgnoreCase("testuser@gmail.com")).thenReturn(Optional.of(existingUser));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.verifyOtp(request));
        assertEquals("Tài khoản của bạn đã được kích hoạt trước đó. Vui lòng đăng nhập!", ex.getMessage());
    }

    // ==========================================
    // 4. TEST CASES: GỬI LẠI MÃ OTP (RESEND OTP)
    // ==========================================

    @Test
    @DisplayName("TC_AUTH_16: Gửi lại mã OTP thành công sau khi quá 60s")
    void resendOtp_success() {
        ResendOtpRequest request = ResendOtpRequest.builder()
                .email("unverified@gmail.com")
                .build();

        // OTP trước đó được tạo cách đây 70 giây (> 60 giây)
        validOtp.setCreatedAt(LocalDateTime.now().minusSeconds(70));

        when(userRepository.findByEmailIgnoreCase("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));
        when(emailOtpRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc("unverified@gmail.com"))
                .thenReturn(Optional.of(validOtp));
        when(emailOtpRepository.findAllByEmailIgnoreCaseOrderByCreatedAtDesc("unverified@gmail.com"))
                .thenReturn(List.of(validOtp));
        when(emailService.sendOtpEmail(eq("unverified@gmail.com"), anyString(), anyString())).thenReturn(true);

        ApiResponse<String> response = authService.resendOtp(request);

        assertNotNull(response);
        assertEquals(HttpStatus.OK.value(), response.getStatus());
        assertTrue(response.getMessage().contains("Mã OTP mới đã được gửi"));

        // Kiểm tra OTP cũ bị vô hiệu hóa
        verify(emailOtpRepository).save(argThat(otp -> Boolean.TRUE.equals(otp.getUsed())));
        // Kiểm tra tạo OTP mới
        verify(emailOtpRepository, times(2)).save(any(EmailOtp.class));
        // Kiểm tra gửi email
        verify(emailService).sendOtpEmail(eq("unverified@gmail.com"), anyString(), anyString());
    }

    @Test
    @DisplayName("TC_AUTH_17: Gửi lại OTP tuân thủ giới hạn thời gian (chưa đủ 60s) -> Ném BadRequestException")
    void resendOtp_cooldownRateLimit_throwsBadRequestException() {
        ResendOtpRequest request = ResendOtpRequest.builder()
                .email("unverified@gmail.com")
                .build();

        // OTP mới được tạo cách đây 20 giây (< 60 giây)
        validOtp.setCreatedAt(LocalDateTime.now().minusSeconds(20));

        when(userRepository.findByEmailIgnoreCase("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));
        when(emailOtpRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc("unverified@gmail.com"))
                .thenReturn(Optional.of(validOtp));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.resendOtp(request));
        assertTrue(ex.getMessage().contains("Vui lòng chờ"));
        assertTrue(ex.getMessage().contains("giây trước khi yêu cầu gửi lại"));

        verify(emailService, never()).sendOtpEmail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("TC_AUTH_18: Gửi lại OTP cho email không tồn tại -> Ném ResourceNotFoundException")
    void resendOtp_emailNotFound_throwsResourceNotFoundException() {
        ResendOtpRequest request = ResendOtpRequest.builder()
                .email("notfound@gmail.com")
                .build();

        when(userRepository.findByEmailIgnoreCase("notfound@gmail.com")).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () -> authService.resendOtp(request));
        assertEquals("Địa chỉ email không tồn tại trong hệ thống", ex.getMessage());
    }

    @Test
    @DisplayName("TC_AUTH_19: Gửi lại OTP cho tài khoản đã kích hoạt -> Ném BadRequestException")
    void resendOtp_alreadyActive_throwsBadRequestException() {
        ResendOtpRequest request = ResendOtpRequest.builder()
                .email("testuser@gmail.com")
                .build();

        when(userRepository.findByEmailIgnoreCase("testuser@gmail.com")).thenReturn(Optional.of(existingUser));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.resendOtp(request));
        assertEquals("Tài khoản này đã được kích hoạt, không cần gửi lại mã OTP!", ex.getMessage());
    }
}
