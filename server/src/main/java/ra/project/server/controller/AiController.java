package ra.project.server.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.AiChatRequest;
import ra.project.server.model.dto.response.AiChatResponse;
import ra.project.server.model.dto.response.VisualSearchResponse;
import ra.project.server.service.AiService;
import ra.project.server.service.RateLimiterService;

import java.util.Collections;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiController {

    private final AiService aiService;
    private final RateLimiterService rateLimiterService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chatWithCustomer(
            @Valid @RequestBody AiChatRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = getClientIp(httpRequest);

        // Kiểm tra Rate Limit cơ bản (chống spam)
        if (!rateLimiterService.allowChatRequest(clientIp)) {
            long remaining = rateLimiterService.getRemainingSeconds(clientIp);
            log.warn("Rate limit: IP [{}] đã vượt quá 15 tin nhắn/phút", clientIp);

            AiChatResponse rateLimitResponse = AiChatResponse.builder()
                    .reply(String.format("Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi %d giây rồi thử lại để NEXOR có thể hỗ trợ tốt nhất nhé! ⏳", remaining > 0 ? remaining : 5))
                    .suggestedProducts(Collections.emptyList())
                    .recommendedProducts(Collections.emptyList())
                    .provider("NEXOR Rate Limiter")
                    .build();

            return ResponseEntity.ok(ApiResponse.success("Kiểm soát tần suất gửi tin nhắn", rateLimitResponse));
        }

        log.info("Khách hàng [{}] gửi câu hỏi tư vấn AI: {}", clientIp, request.getMessage());
        AiChatResponse response = aiService.chatWithCustomer(request);
        return ResponseEntity.ok(ApiResponse.success("Phản hồi từ NEXOR AI Assistant", response));
    }

    @PostMapping(value = "/visual-search", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<VisualSearchResponse>> visualSearch(
            @RequestParam("image") MultipartFile image,
            HttpServletRequest httpRequest
    ) {
        String clientIp = getClientIp(httpRequest);
        log.info("Khách hàng [{}] gửi yêu cầu tìm kiếm sản phẩm bằng hình ảnh (file: {}, size: {} bytes)",
                clientIp, image != null ? image.getOriginalFilename() : "null", image != null ? image.getSize() : 0);

        VisualSearchResponse response = aiService.visualSearch(image);
        return ResponseEntity.ok(ApiResponse.success("Tìm kiếm sản phẩm bằng hình ảnh thành công", response));
    }

    private String getClientIp(HttpServletRequest request) {
        if (request == null) return "unknown";
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
