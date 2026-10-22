package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.exception.UnauthorizedException;
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
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác này");
        }

        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "tên tài khoản", username));
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
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }

        User updatedUser = userRepository.save(user);
        log.info("Người dùng '{}' đã cập nhật thông tin cá nhân thành công", user.getUsername());

        return ApiResponse.success("Cập nhật thông tin cá nhân thành công", UserProfileResponse.from(updatedUser));
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
}
