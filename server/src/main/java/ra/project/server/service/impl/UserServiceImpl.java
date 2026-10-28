package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.model.dto.request.ChangePasswordRequest;
import ra.project.server.model.dto.request.UpdateProfileRequest;
import ra.project.server.model.dto.response.AdminUserResponse;
import ra.project.server.model.dto.response.UserProfileResponse;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.service.UserService;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import ra.project.server.model.enums.Role;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:}")
    private String adminUsername;

    private boolean isAdmin(String username) {
        String effectiveAdminUser = (adminUsername != null) ? adminUsername.trim() : "";
        return !effectiveAdminUser.isEmpty() && effectiveAdminUser.equalsIgnoreCase(username);
    }

    private User getVirtualAdminUser() {
        String effectiveAdminUser = (adminUsername != null && !adminUsername.trim().isEmpty()) ? adminUsername.trim() : "Administrator";
        String adminEmail = effectiveAdminUser.contains("@") ? effectiveAdminUser : effectiveAdminUser + "@nexor.vn";
        User admin = User.builder()
                .id(0L)
                .username(effectiveAdminUser)
                .email(adminEmail)
                .password("")
                .fullName("Quản trị viên Hệ thống")
                .phoneNumber("0988888888")
                .address("Tòa nhà NEXOR Flagship, Hà Nội")
                .avatarUrl("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150")
                .role(Role.ADMIN)
                .status(true)
                .build();
        admin.setCreatedAt(LocalDateTime.now());
        return admin;
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác này");
        }

        String username = authentication.getName();

        // 1. Tìm tài khoản trong database trước (hỗ trợ cả username hoặc email)
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username)
                .or(() -> userRepository.findByEmailIgnoreCase(username));
        if (userOpt.isPresent()) {
            return userOpt.get();
        }

        // 2. Nếu là tài khoản Admin và chưa tìm thấy theo username/email chính xác
        if (isAdmin(username) || "admin".equalsIgnoreCase(username)) {
            // Tìm bất kỳ tài khoản nào có role ADMIN trong DB
            Optional<User> adminInDb = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ADMIN)
                    .findFirst();
            if (adminInDb.isPresent()) {
                return adminInDb.get();
            }

            // Fallback: Lưu virtual admin vào DB với ID tự tăng để có thể lưu và cập nhật vĩnh viễn
            User newAdmin = getVirtualAdminUser();
            newAdmin.setId(null);
            return userRepository.save(newAdmin);
        }

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "tên tài khoản", username));
    }

    private String resolveAvatarUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return url;
        }
        String cleanUrl = url.trim();

        // Tự động phân giải link Pinterest sang ảnh trực tiếp chất lượng cao (i.pinimg.com/...jpg)
        if (cleanUrl.contains("pinterest.com/pin/") || cleanUrl.contains("pin.it/")) {
            try {
                String oEmbedEndpoint = "https://www.pinterest.com/oembed.json?url=" +
                        URLEncoder.encode(cleanUrl, StandardCharsets.UTF_8);

                HttpClient client = HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(3))
                        .followRedirects(HttpClient.Redirect.NORMAL)
                        .build();

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(oEmbedEndpoint))
                        .timeout(Duration.ofSeconds(3))
                        .header("User-Agent", "Mozilla/5.0")
                        .GET()
                        .build();

                HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 200 && resp.body() != null) {
                    Pattern pattern = Pattern.compile("\"thumbnail_url\"\\s*:\\s*\"([^\"]+)\"");
                    Matcher matcher = pattern.matcher(resp.body());
                    if (matcher.find()) {
                        String thumb = matcher.group(1).replace("\\/", "/");
                        // Nâng cấp độ phân giải từ 236x lên 736x
                        return thumb.replace("/236x/", "/736x/");
                    }
                }
            } catch (Exception e) {
                log.warn("Không thể tự động phân giải ảnh Pinterest từ URL '{}': {}", cleanUrl, e.getMessage());
            }
        }

        return cleanUrl;
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<UserProfileResponse> getCurrentUserProfile() {
        User user = getCurrentAuthenticatedUser();
        return ApiResponse.success("Lấy thông tin cá nhân thành công", UserProfileResponse.from(user));
    }

    @Override
    @Transactional
    public ApiResponse<UserProfileResponse> updateCurrentUserProfile(UpdateProfileRequest request) {
        User user = getCurrentAuthenticatedUser();

        if (user.getId() != null && user.getId() == 0L) {
            user.setId(null);
        }

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber().trim());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(resolveAvatarUrl(request.getAvatarUrl()));
        }

        User updatedUser = userRepository.save(user);
        log.info("Người dùng '{}' đã cập nhật thông tin cá nhân thành công", user.getUsername());

        return ApiResponse.success("Cập nhật thông tin cá nhân thành công", UserProfileResponse.from(updatedUser));
    }

    @Override
    @Transactional
    public ApiResponse<Void> changePassword(ChangePasswordRequest request) {
        User user = getCurrentAuthenticatedUser();

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp với mật khẩu mới");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Người dùng '{}' đã đổi mật khẩu thành công", user.getUsername());

        return ApiResponse.success("Đổi mật khẩu thành công!", null);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<AdminUserResponse>> getAllUsers(String keyword, Boolean status) {
        List<User> users = userRepository.findAll();

        if (keyword != null && !keyword.trim().isEmpty()) {
            String kw = keyword.trim().toLowerCase();
            users = users.stream().filter(u ->
                (u.getUsername() != null && u.getUsername().toLowerCase().contains(kw)) ||
                (u.getFullName() != null && u.getFullName().toLowerCase().contains(kw)) ||
                (u.getEmail() != null && u.getEmail().toLowerCase().contains(kw)) ||
                (u.getPhoneNumber() != null && u.getPhoneNumber().contains(kw))
            ).toList();
        }

        if (status != null) {
            users = users.stream().filter(u -> status.equals(u.getStatus())).toList();
        }

        List<AdminUserResponse> responses = users.stream().map(u -> {
            List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(u.getId());
            BigDecimal totalSpent = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            return AdminUserResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .phoneNumber(u.getPhoneNumber())
                .address(u.getAddress())
                .avatarUrl(u.getAvatarUrl())
                .role(u.getRole())
                .status(u.getStatus() != null ? u.getStatus() : true)
                .ordersCount(orders.size())
                .totalSpent(totalSpent)
                .createdAt(u.getCreatedAt())
                .build();
        }).toList();

        return ApiResponse.success("Lấy danh sách người dùng thành công", responses);
    }

    @Override
    @Transactional
    public ApiResponse<AdminUserResponse> updateUserStatus(Long userId, Boolean status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", userId));

        user.setStatus(status);
        userRepository.save(user);
        log.info("Quản trị viên đã đổi trạng thái người dùng #{} sang {}", userId, status ? "ACTIVE" : "BLOCKED");

        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        BigDecimal totalSpent = orders.stream()
            .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
            .map(Order::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        AdminUserResponse response = AdminUserResponse.builder()
            .id(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .fullName(user.getFullName())
            .phoneNumber(user.getPhoneNumber())
            .address(user.getAddress())
            .avatarUrl(user.getAvatarUrl())
            .role(user.getRole())
            .status(user.getStatus())
            .ordersCount(orders.size())
            .totalSpent(totalSpent)
            .createdAt(user.getCreatedAt())
            .build();

        String msg = Boolean.TRUE.equals(status) ? "Đã kích hoạt tài khoản thành công" : "Đã khóa tài khoản người dùng thành công";
        return ApiResponse.success(msg, response);
    }

    @Override
    @Transactional
    public ApiResponse<AdminUserResponse> createAdminUser(ra.project.server.model.dto.request.AdminUserRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            throw new BadRequestException("Tên đăng nhập không được để trống");
        }
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadRequestException("Email không được để trống");
        }
        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new BadRequestException("Tên đăng nhập '" + request.getUsername().trim() + "' đã được sử dụng");
        }
        if (userRepository.existsByEmail(request.getEmail().trim())) {
            throw new BadRequestException("Email '" + request.getEmail().trim() + "' đã được sử dụng");
        }

        String rawPassword = (request.getPassword() != null && !request.getPassword().isBlank())
                ? request.getPassword().trim()
                : "123123123";

        User user = User.builder()
                .username(request.getUsername().trim())
                .email(request.getEmail().trim())
                .password(passwordEncoder.encode(rawPassword))
                .fullName(request.getFullName() != null && !request.getFullName().isBlank() ? request.getFullName().trim() : request.getUsername().trim())
                .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null)
                .address(request.getAddress() != null ? request.getAddress().trim() : null)
                .avatarUrl(request.getAvatarUrl() != null && !request.getAvatarUrl().isBlank() ? request.getAvatarUrl().trim() : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100")
                .role(Role.CUSTOMER)
                .status(request.getStatus() != null ? request.getStatus() : true)
                .build();

        User saved = userRepository.save(user);

        AdminUserResponse response = AdminUserResponse.builder()
                .id(saved.getId())
                .username(saved.getUsername())
                .email(saved.getEmail())
                .fullName(saved.getFullName())
                .phoneNumber(saved.getPhoneNumber())
                .address(saved.getAddress())
                .avatarUrl(saved.getAvatarUrl())
                .role(saved.getRole())
                .status(saved.getStatus())
                .ordersCount(0)
                .totalSpent(BigDecimal.ZERO)
                .createdAt(saved.getCreatedAt())
                .build();

        return ApiResponse.created("Thêm khách hàng mới thành công", response);
    }

    @Override
    @Transactional
    public ApiResponse<AdminUserResponse> updateAdminUser(Long userId, ra.project.server.model.dto.request.AdminUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", userId));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim();
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new BadRequestException("Email '" + newEmail + "' đã được sử dụng bởi tài khoản khác");
            }
            user.setEmail(newEmail);
        }
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber().trim());
        if (request.getAddress() != null) user.setAddress(request.getAddress().trim());
        if (request.getStatus() != null) user.setStatus(request.getStatus());

        User updated = userRepository.save(user);

        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(updated.getId());
        BigDecimal totalSpent = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        AdminUserResponse response = AdminUserResponse.builder()
                .id(updated.getId())
                .username(updated.getUsername())
                .email(updated.getEmail())
                .fullName(updated.getFullName())
                .phoneNumber(updated.getPhoneNumber())
                .address(updated.getAddress())
                .avatarUrl(updated.getAvatarUrl())
                .role(updated.getRole())
                .status(updated.getStatus())
                .ordersCount(orders.size())
                .totalSpent(totalSpent)
                .createdAt(updated.getCreatedAt())
                .build();

        return ApiResponse.success("Cập nhật thông tin khách hàng thành công", response);
    }

    @Override
    @Transactional
    public ApiResponse<Void> deleteAdminUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "id", userId));

        if (user.getRole() == Role.ADMIN) {
            throw new BadRequestException("Không thể xóa tài khoản Quản trị viên (ADMIN)");
        }

        try {
            userRepository.delete(user);
        } catch (Exception e) {
            user.setStatus(false);
            userRepository.save(user);
        }

        return ApiResponse.success("Đã xóa khách hàng #" + userId + " thành công", null);
    }
}
