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
import ra.project.server.model.dto.response.UserProfileResponse;
import ra.project.server.model.entity.User;
import ra.project.server.repository.UserRepository;
import ra.project.server.service.UserService;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

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
}
