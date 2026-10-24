package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.model.dto.response.AdminUserResponse;
import ra.project.server.service.UserService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> getAllUsers(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "status", required = false) Boolean status
    ) {
        ApiResponse<List<AdminUserResponse>> response = userService.getAllUsers(keyword, status);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUserStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(name = "status", required = false) Boolean statusParam
    ) {
        Boolean targetStatus = null;
        if (body != null && body.containsKey("status")) {
            Object val = body.get("status");
            if (val instanceof Boolean) {
                targetStatus = (Boolean) val;
            } else if (val != null) {
                targetStatus = "active".equalsIgnoreCase(val.toString()) || "true".equalsIgnoreCase(val.toString());
            }
        } else if (statusParam != null) {
            targetStatus = statusParam;
        }

        if (targetStatus == null) {
            throw new BadRequestException("Trạng thái người dùng (status: true/false hoặc 'ACTIVE'/'BLOCKED') không được để trống");
        }

        ApiResponse<AdminUserResponse> response = userService.updateUserStatus(id, targetStatus);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminUserResponse>> createAdminUser(
            @RequestBody ra.project.server.model.dto.request.AdminUserRequest request
    ) {
        ApiResponse<AdminUserResponse> response = userService.createAdminUser(request);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateAdminUser(
            @PathVariable Long id,
            @RequestBody ra.project.server.model.dto.request.AdminUserRequest request
    ) {
        ApiResponse<AdminUserResponse> response = userService.updateAdminUser(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAdminUser(@PathVariable Long id) {
        ApiResponse<Void> response = userService.deleteAdminUser(id);
        return ResponseEntity.ok(response);
    }
}
