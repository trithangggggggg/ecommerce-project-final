package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.entity.Policy;
import ra.project.server.service.PolicyService;

import java.util.List;

@RestController
@RequestMapping("/api/policies")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PolicyController {

    private final PolicyService policyService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Policy>>> getPublicPolicies() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chính sách thành công", policyService.getPublicPolicies()));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<Policy>> getPolicyBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success("Lấy nội dung chính sách thành công", policyService.getPublicPolicyBySlug(slug)));
    }
}

