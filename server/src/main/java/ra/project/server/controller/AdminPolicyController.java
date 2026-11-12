package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.entity.Policy;
import ra.project.server.service.PolicyService;
import ra.project.server.util.PaginationUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/policies")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminPolicyController {

    private final PolicyService policyService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Policy>>> searchPolicies(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "displayOrder,asc") String sort
    ) {
        Pageable pageable = PaginationUtil.createPageable(page, size, sort);
        PageResponse<Policy> response = policyService.searchAdminPolicies(keyword, category, isActive, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chính sách quản trị thành công", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Policy>> getPolicyById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết chính sách thành công", policyService.getPolicyById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Policy>> createPolicy(@RequestBody Policy request) {
        Policy created = policyService.createPolicy(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm chính sách mới thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Policy>> updatePolicy(@PathVariable Long id, @RequestBody Policy request) {
        Policy updated = policyService.updatePolicy(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chính sách thành công", updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Policy>> toggleStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Boolean> body
    ) {
        Boolean isActive = body != null ? body.get("isActive") : null;
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái chính sách thành công", policyService.togglePolicyStatus(id, isActive)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePolicy(@PathVariable Long id) {
        policyService.deletePolicy(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa chính sách thành công", null));
    }
}

