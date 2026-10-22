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
import ra.project.server.service.AuthService;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

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
        String identifier = request.getUsernameOrEmail().trim();

        // Hỗ trợ linh hoạt các alias email phổ biến của Admin & Khách mẫu
        if ("admin@nexor.vn".equalsIgnoreCase(identifier) ||
            "admin@eshop.com".equalsIgnoreCase(identifier) ||
            "admin@eshoptech.vn".equalsIgnoreCase(identifier) ||
            "admin@ecommerce.com".equalsIgnoreCase(identifier)) {
            identifier = "admin";
        } else if ("customer@nexor.vn".equalsIgnoreCase(identifier) ||
                   "customer@eshop.com".equalsIgnoreCase(identifier)) {
            identifier = "customer";
        }

        final String lookupKey = identifier;
        User user = userRepository.findByUsername(lookupKey)
                .or(() -> userRepository.findByEmail(lookupKey))
                .orElseThrow(() -> new UnauthorizedException("Tên đăng nhập hoặc mật khẩu không chính xác"));

        if (Boolean.FALSE.equals(user.getStatus())) {
            throw new BadRequestException("Tài khoản của bạn đã bị khóa, vui lòng liên hệ quản trị viên");
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword())
            );
        } catch (BadCredentialsException ex) {
            throw new UnauthorizedException("Tên đăng nhập hoặc mật khẩu không chính xác");
        }

        String token = jwtTokenProvider.generateToken(authentication);
        log.info("Người dùng '{}' đã đăng nhập thành công với vai trò: {}", user.getUsername(), user.getRole());

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .user(UserProfileResponse.from(user))
                .build();

        return ApiResponse.success("Đăng nhập thành công", authResponse);
    }
}
