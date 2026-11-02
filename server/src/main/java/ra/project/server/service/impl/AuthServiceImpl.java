package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
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
import ra.project.server.service.AuthService;
import ra.project.server.service.EmailService;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    @Transactional
    public ApiResponse<UserProfileResponse> register(RegisterRequest request) {
        String cleanUsername = request.getUsername() != null ? request.getUsername().trim() : "";
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";

        // Kiểm tra username đã tồn tại chưa
        Optional<User> existingByUsername = userRepository.findByUsernameIgnoreCase(cleanUsername);
        if (existingByUsername.isPresent()) {
            User u = existingByUsername.get();
            // Nếu tài khoản đã active hoặc thuộc về email khác -> Xung đột
            if (Boolean.TRUE.equals(u.getStatus()) || !u.getEmail().equalsIgnoreCase(cleanEmail)) {
                throw new ConflictException("Tên đăng nhập đã được sử dụng");
            }
        }

        // Kiểm tra email đã tồn tại chưa
        Optional<User> existingByEmail = userRepository.findByEmailIgnoreCase(cleanEmail);
        User userToSave;
        if (existingByEmail.isPresent()) {
            User u = existingByEmail.get();
            if (Boolean.TRUE.equals(u.getStatus())) {
                throw new ConflictException("Địa chỉ email đã được sử dụng");
            }
            // Cho phép người dùng chưa kích hoạt cập nhật lại thông tin để nhận lại OTP
            u.setUsername(cleanUsername);
            u.setPassword(passwordEncoder.encode(request.getPassword()));
            u.setFullName(request.getFullName());
            u.setPhoneNumber(request.getPhoneNumber());
            u.setAddress(request.getAddress());
            u.setStatus(false);
            userToSave = u;
        } else {
            userToSave = User.builder()
                    .username(cleanUsername)
                    .email(cleanEmail)
                    .password(passwordEncoder.encode(request.getPassword()))
                    .fullName(request.getFullName())
                    .phoneNumber(request.getPhoneNumber())
                    .address(request.getAddress())
                    .role(Role.CUSTOMER)
                    .status(false) // Đăng ký thành công nhưng tài khoản CHƯA được kích hoạt
                    .build();
        }

        User savedUser = userRepository.save(userToSave);
        log.info("Tài khoản người dùng mới đã tạo (chưa kích hoạt): {}", savedUser.getUsername());

        // Vô hiệu hóa các OTP cũ nếu có
        invalidateOldOtps(cleanEmail);

        // Sinh mã OTP 6 chữ số ngẫu nhiên, hiệu lực 5 phút
        String otp = generateOtp();
        EmailOtp emailOtp = EmailOtp.builder()
                .email(cleanEmail)
                .otp(otp)
                .expiryTime(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();
        emailOtpRepository.save(emailOtp);

        // Gửi mã OTP qua email bằng nội dung HTML (EmailJS)
        boolean emailSent = emailService.sendOtpEmail(cleanEmail, savedUser.getFullName(), otp);

        String message = emailSent
                ? "Đăng ký tài khoản thành công! Vui lòng kiểm tra email để nhập mã OTP xác thực kích hoạt tài khoản."
                : "Đăng ký thành công! Mã OTP đã được tạo, vui lòng kiểm tra email hoặc nhấn 'Gửi lại mã OTP'.";

        return ApiResponse.success(
                HttpStatus.CREATED,
                message,
                UserProfileResponse.from(savedUser)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<AuthResponse> login(LoginRequest request) {
        String identifier = request.getUsernameOrEmail() != null ? request.getUsernameOrEmail().trim() : "";
        String inputPassword = request.getPassword() != null ? request.getPassword().trim() : "";

        if (!StringUtils.hasText(identifier) || !StringUtils.hasText(inputPassword)) {
            throw new BadRequestException("Tên đăng nhập và mật khẩu không được để trống");
        }

        // Tìm kiếm người dùng theo email hoặc username (IgnoreCase)
        User user = userRepository.findByEmailIgnoreCase(identifier)
                .or(() -> userRepository.findByUsernameIgnoreCase(identifier))
                .orElseThrow(() -> new UnauthorizedException("Tên đăng nhập hoặc mật khẩu không chính xác"));

        // Từ chối đăng nhập nếu tài khoản chưa được kích hoạt qua OTP hoặc bị khóa
        if (Boolean.FALSE.equals(user.getStatus())) {
            throw new BadRequestException("Tài khoản chưa được kích hoạt qua mã OTP hoặc đã bị khóa. Vui lòng xác thực mã OTP để đăng nhập!");
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

    @Override
    @Transactional
    public ApiResponse<AuthResponse> verifyOtp(VerifyOtpRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String cleanOtp = request.getOtp() != null ? request.getOtp().trim() : "";

        if (!StringUtils.hasText(cleanEmail) || !StringUtils.hasText(cleanOtp)) {
            throw new BadRequestException("Email và mã OTP không được để trống");
        }

        // 1. Kiểm tra email có tồn tại không
        User user = userRepository.findByEmailIgnoreCase(cleanEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Địa chỉ email không tồn tại trong hệ thống"));

        // 2. Kiểm tra tài khoản đã kích hoạt chưa
        if (Boolean.TRUE.equals(user.getStatus())) {
            throw new BadRequestException("Tài khoản của bạn đã được kích hoạt trước đó. Vui lòng đăng nhập!");
        }

        // 3. Tìm mã OTP mới nhất cho email này
        EmailOtp latestOtp = emailOtpRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc(cleanEmail)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy mã OTP cho email này. Vui lòng yêu cầu gửi mã mới!"));

        // 4. Kiểm tra OTP đã sử dụng chưa
        if (Boolean.TRUE.equals(latestOtp.getUsed())) {
            throw new BadRequestException("Mã OTP này đã được sử dụng. Vui lòng yêu cầu mã OTP mới!");
        }

        // 5. Kiểm tra thời hạn hiệu lực của OTP (5 phút)
        if (latestOtp.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Mã OTP đã hết hạn sử dụng. Vui lòng yêu cầu gửi lại mã mới!");
        }

        // 6. Kiểm tra mã OTP chính xác không
        if (!latestOtp.getOtp().equals(cleanOtp)) {
            throw new BadRequestException("Mã OTP không chính xác. Vui lòng kiểm tra lại!");
        }

        // 7. Xác thực thành công: Đánh dấu OTP đã dùng và chuyển status = true
        latestOtp.setUsed(true);
        emailOtpRepository.save(latestOtp);

        user.setStatus(true);
        User activatedUser = userRepository.save(user);
        log.info("Tài khoản '{}' (email: {}) đã được kích hoạt thành công qua mã OTP!",
                activatedUser.getUsername(), activatedUser.getEmail());

        // 8. Cấp JWT token sau khi xác thực thành công
        String token = jwtTokenProvider.generateTokenFromUsername(activatedUser.getUsername());

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .user(UserProfileResponse.from(activatedUser))
                .build();

        return ApiResponse.success("Xác thực OTP thành công! Tài khoản của bạn đã được kích hoạt.", authResponse);
    }

    @Override
    @Transactional
    public ApiResponse<String> resendOtp(ResendOtpRequest request) {
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";

        if (!StringUtils.hasText(cleanEmail)) {
            throw new BadRequestException("Địa chỉ email không được để trống");
        }

        // 1. Kiểm tra email có tồn tại không
        User user = userRepository.findByEmailIgnoreCase(cleanEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Địa chỉ email không tồn tại trong hệ thống"));

        // 2. Kiểm tra tài khoản đã kích hoạt chưa
        if (Boolean.TRUE.equals(user.getStatus())) {
            throw new BadRequestException("Tài khoản này đã được kích hoạt, không cần gửi lại mã OTP!");
        }

        // 3. Giới hạn gửi lại OTP: tối đa 1 lần / phút (60 giây)
        Optional<EmailOtp> latestOtpOpt = emailOtpRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc(cleanEmail);
        if (latestOtpOpt.isPresent()) {
            EmailOtp latestOtp = latestOtpOpt.get();
            long secondsElapsed = Duration.between(latestOtp.getCreatedAt(), LocalDateTime.now()).getSeconds();
            if (secondsElapsed < 60) {
                long remainingSeconds = 60 - secondsElapsed;
                throw new BadRequestException("Vui lòng chờ " + remainingSeconds + " giây trước khi yêu cầu gửi lại mã OTP mới!");
            }
        }

        // 4. Vô hiệu hóa các OTP cũ
        invalidateOldOtps(cleanEmail);

        // 5. Sinh mã OTP mới, hiệu lực 5 phút
        String newOtp = generateOtp();
        EmailOtp newEmailOtp = EmailOtp.builder()
                .email(cleanEmail)
                .otp(newOtp)
                .expiryTime(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();
        emailOtpRepository.save(newEmailOtp);

        // 6. Gửi OTP mới qua email
        boolean sent = emailService.sendOtpEmail(cleanEmail, user.getFullName(), newOtp);
        if (!sent) {
            log.warn(">>> [EmailService] Gửi email OTP tới '{}' thất bại. OTP dự phòng: {}", cleanEmail, newOtp);
        }

        return ApiResponse.success("Mã OTP mới đã được gửi tới email " + cleanEmail + ". Vui lòng kiểm tra hộp thư!", null);
    }

    private void invalidateOldOtps(String email) {
        List<EmailOtp> oldOtps = emailOtpRepository.findAllByEmailIgnoreCaseOrderByCreatedAtDesc(email);
        for (EmailOtp old : oldOtps) {
            if (!Boolean.TRUE.equals(old.getUsed())) {
                old.setUsed(true);
                emailOtpRepository.save(old);
            }
        }
    }

    private String generateOtp() {
        int code = 100000 + SECURE_RANDOM.nextInt(900000);
        return String.valueOf(code);
    }
}
