package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.AiChatRequest;
import ra.project.server.model.dto.response.AiChatResponse;
import ra.project.server.service.AiService;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiController {

    private final AiService aiService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chatWithCustomer(
            @Valid @RequestBody AiChatRequest request
    ) {
        log.info("Khách hàng gửi câu hỏi tư vấn AI: {}", request.getMessage());
        AiChatResponse response = aiService.chatWithCustomer(request);
        return ResponseEntity.ok(ApiResponse.success("Phản hồi từ NEXOR AI Assistant", response));
    }
}
