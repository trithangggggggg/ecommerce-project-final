package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ConflictException;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.model.dto.request.LoginRequest;
import ra.project.server.model.dto.request.RegisterRequest;
import ra.project.server.model.dto.response.AuthResponse;
import ra.project.server.model.dto.response.UserProfileResponse;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.UserRepository;
import ra.project.server.security.JwtTokenProvider;
import ra.project.server.service.impl.AuthServiceImpl;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: AuthServiceImpl (Authentication & Registration)")
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthServiceImpl authService;

    private User existingUser;
    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

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
    }

    // ==========================================
    // 1. TEST CASES: ĐĂNG KÝ (REGISTER)
    // ==========================================

    @Test
    @DisplayName("TC_AUTH_01: Đăng ký tài khoản thành công")
    void register_success() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("newuser@gmail.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123")).thenReturn("encodedSecretPassword");

        User savedUser = User.builder()
                .id(2L)
                .username("newuser")
                .email("newuser@gmail.com")
                .password("encodedSecretPassword")
                .fullName("Trần Thị Mới")
                .role(Role.CUSTOMER)
                .status(true)
                .build();

        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        ApiResponse<UserProfileResponse> response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED.value(), response.getStatus());
        assertEquals("Đăng ký tài khoản thành công", response.getMessage());
        assertNotNull(response.getData());
        assertEquals(2L, response.getData().getId());
        assertEquals("newuser", response.getData().getUsername());
        assertEquals("newuser@gmail.com", response.getData().getEmail());
        assertEquals(Role.CUSTOMER, response.getData().getRole());

        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("TC_AUTH_02: Đăng ký thất bại do trùng username -> Ném ConflictException")
    void register_duplicateUsername_throwsConflictException() {
        when(userRepository.existsByUsername("newuser")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> authService.register(registerRequest));
        assertEquals("Tên đăng nhập đã được sử dụng", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("TC_AUTH_03: Đăng ký thất bại do trùng email -> Ném ConflictException")
    void register_duplicateEmail_throwsConflictException() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("newuser@gmail.com")).thenReturn(true);

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
    @DisplayName("TC_AUTH_08: Đăng nhập thất bại do tài khoản bị khóa (status = false) -> Ném BadRequestException")
    void login_accountLocked_throwsBadRequestException() {
        existingUser.setStatus(false); // Tài khoản bị khóa

        when(userRepository.findByEmailIgnoreCase("testuser")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("testuser")).thenReturn(Optional.of(existingUser));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(loginRequest));
        assertEquals("Tài khoản của bạn đã bị khóa, vui lòng liên hệ quản trị viên", ex.getMessage());

        verify(jwtTokenProvider, never()).generateTokenFromUsername(anyString());
    }

    @Test
    @DisplayName("TC_AUTH_09: Đăng nhập thất bại do để trống username hoặc mật khẩu -> Ném BadRequestException")
    void login_blankCredentials_throwsBadRequestException() {
        LoginRequest emptyRequest = LoginRequest.builder()
                .usernameOrEmail("   ")
                .password("")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(emptyRequest));
        assertEquals("Tên đăng nhập và mật khẩu không được để trống", ex.getMessage());

        verify(userRepository, never()).findByEmailIgnoreCase(anyString());
    }
}

