package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import org.springframework.beans.factory.annotation.Value;
import ra.project.server.service.AuthService;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    @Value("${app.admin.username:${ADMIN_USERNAME:${ADMIN_EMAIL:admin}}}")
    private String adminUsername;

    @Value("${app.admin.email:${ADMIN_EMAIL:${ADMIN_USERNAME:admin@nexor.vn}}}")
    private String adminEmail;

    @Value("${app.admin.password:${ADMIN_PASSWORD:123456}}")
    private String adminPassword;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    @Transactional
    public ApiResponse<UserProfileResponse> register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Tên đăng nhập đã được sử dụng");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Địa chỉ email đã được sử dụng");
        }

        User user = User.builder()
                .username(request.getUsername().trim())
                .email(request.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .address(request.getAddress())
                .role(Role.CUSTOMER)
                .status(true)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Người dùng mới đã đăng ký thành công: {}", savedUser.getUsername());

        return ApiResponse.success(
                HttpStatus.CREATED,
                "Đăng ký tài khoản thành công",
                UserProfileResponse.from(savedUser)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<AuthResponse> login(LoginRequest request) {
        String identifier = request.getUsernameOrEmail() != null ? request.getUsernameOrEmail().trim() : "";
        String inputPassword = request.getPassword() != null ? request.getPassword().trim() : "";

        if (!org.springframework.util.StringUtils.hasText(identifier) || !org.springframework.util.StringUtils.hasText(inputPassword)) {
            throw new BadRequestException("Tên đăng nhập và mật khẩu không được để trống");
        }

        // Tìm kiếm người dùng trong MySQL theo email hoặc username (IgnoreCase)
        User user = userRepository.findByEmailIgnoreCase(identifier)
                .or(() -> userRepository.findByUsernameIgnoreCase(identifier))
                .orElseThrow(() -> new UnauthorizedException("Tên đăng nhập hoặc mật khẩu không chính xác"));

        if (Boolean.FALSE.equals(user.getStatus())) {
            throw new BadRequestException("Tài khoản của bạn đã bị khóa, vui lòng liên hệ quản trị viên");
        }

        if (!passwordEncoder.matches(inputPassword, user.getPassword())) {
            throw new UnauthorizedException("Tên đăng nhập hoặc mật khẩu không chính xác");
        }

        String token = jwtTokenProvider.generateTokenFromUsername(user.getUsername());
        log.info("Người dùng '{}' [Role: {}] đã đăng nhập thành công", user.getUsername(), user.getRole());

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .user(UserProfileResponse.from(user))
                .build();

        return ApiResponse.success("Đăng nhập thành công", authResponse);
    }
}
