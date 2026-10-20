package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.service.AiService;

@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminAiController {

    private final AiService aiService;

    @PostMapping("/generate-description")
    public ResponseEntity<ApiResponse<AiGenerateDescriptionResponse>> generateDescription(
            @Valid @RequestBody AiGenerateDescriptionRequest request
    ) {
        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo mô tả sản phẩm chuẩn SEO thành công", response));
    }
}
