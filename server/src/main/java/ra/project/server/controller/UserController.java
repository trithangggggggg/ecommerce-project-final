package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.UpdateProfileRequest;
import ra.project.server.model.dto.response.UserProfileResponse;
import ra.project.server.service.UserService;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile() {
        ApiResponse<UserProfileResponse> response = userService.getCurrentUserProfile();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        ApiResponse<UserProfileResponse> response = userService.updateCurrentUserProfile(request);
        return ResponseEntity.ok(response);
    }

    @RequestMapping(value = "/change-password", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ra.project.server.model.dto.request.ChangePasswordRequest request) {
        ApiResponse<Void> response = userService.changePassword(request);
        return ResponseEntity.ok(response);
    }
}
