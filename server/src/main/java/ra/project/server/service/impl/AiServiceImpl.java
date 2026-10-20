package ra.project.server.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.service.AiService;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AiServiceImpl implements AiService {

    @Value("${gemini.api-key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    @Value("${gemini.model:${GEMINI_MODEL:gemini-3.5-flash-lite}}")
    private String geminiModel;

    @Value("${gemini.api-url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String geminiApiUrl;

    @Value("${spring.ai.openai.api-key:${app.ai.api-key:}}")
    private String openAiApiKey;

    @Value("${spring.ai.openai.chat.options.model:gpt-4o-mini}")
    private String openAiModel;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public AiGenerateDescriptionResponse generateProductDescription(AiGenerateDescriptionRequest request) {
        String productName = request.getProductName().trim();
        String categoryName = StringUtils.hasText(request.getCategoryName()) ? request.getCategoryName().trim() : "Thiết bị điện tử";
        List<String> keywords = request.getKeywords();
        String prompt = buildPrompt(productName, categoryName, keywords);

        // 1. Thử gọi Google Gemini AI nếu có API Key
        if (StringUtils.hasText(geminiApiKey) && !geminiApiKey.equalsIgnoreCase("dummy") && !geminiApiKey.startsWith("placeholder")) {
            log.info("Đang gọi Google Gemini AI Model [{}] để sinh mô tả SEO cho: {}", geminiModel, productName);
            String geminiText = callGeminiApi(prompt);
            if (StringUtils.hasText(geminiText)) {
                log.info("Google Gemini AI sinh mô tả SEO thành công cho: {}", productName);
                return AiGenerateDescriptionResponse.builder()
                        .productName(productName)
                        .categoryName(categoryName)
                        .description(geminiText.trim())
                        .seoTitle(generateSeoTitle(productName, categoryName))
                        .seoKeywords(generateKeywords(productName, categoryName, keywords))
                        .provider("GOOGLE_GEMINI (" + geminiModel + ")")
                        .build();
            }
        }

        // 2. Thử gọi Spring AI (OpenAI) nếu có cấu hình OpenAI
        if (StringUtils.hasText(openAiApiKey) && !openAiApiKey.equalsIgnoreCase("dummy") && !openAiApiKey.startsWith("sk-placeholder")) {
            try {
                log.info("Đang gọi Spring AI OpenAI Model [{}] để sinh mô tả SEO cho: {}", openAiModel, productName);
                OpenAiApi openAiApi = new OpenAiApi(openAiApiKey);
                OpenAiChatModel chatModel = new OpenAiChatModel(openAiApi);
                String aiGeneratedText = chatModel.call(prompt);

                if (StringUtils.hasText(aiGeneratedText)) {
                    log.info("Spring AI sinh mô tả SEO thành công cho: {}", productName);
                    return AiGenerateDescriptionResponse.builder()
                            .productName(productName)
                            .categoryName(categoryName)
                            .description(aiGeneratedText.trim())
                            .seoTitle(generateSeoTitle(productName, categoryName))
                            .seoKeywords(generateKeywords(productName, categoryName, keywords))
                            .provider("SPRING_AI (" + openAiModel + ")")
                            .build();
                }
            } catch (Exception ex) {
                log.warn("Không thể kết nối Spring AI OpenAI ({}), chuyển sang bộ dự phòng: {}", ex.getMessage(), ex.getClass().getSimpleName());
            }
        }

        // 3. Chế độ sinh mô tả chuẩn SEO thông minh (Smart Fallback Generator) khi không có API Key
        log.info("Sử dụng thuật toán sinh mô tả chuẩn SEO tự động cho: {}", productName);
        String fallbackDescription = generateSmartSeoDescription(productName, categoryName, keywords);

        return AiGenerateDescriptionResponse.builder()
                .productName(productName)
                .categoryName(categoryName)
                .description(fallbackDescription)
                .seoTitle(generateSeoTitle(productName, categoryName))
                .seoKeywords(generateKeywords(productName, categoryName, keywords))
                .provider("SMART_SEO_ENGINE (Fallback)")
                .build();
    }

    private String callGeminiApi(String prompt) {
        try {
            String url = String.format("%s/%s:generateContent?key=%s", geminiApiUrl, geminiModel, geminiApiKey.trim());
            Map<String, Object> part = Map.of("text", prompt);
            Map<String, Object> content = Map.of("parts", List.of(part));
            Map<String, Object> requestPayload = Map.of("contents", List.of(content));

            String requestBody = objectMapper.writeValueAsString(requestPayload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && !candidates.isEmpty()) {
                    JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                    if (!textNode.isMissingNode()) {
                        return textNode.asText().trim();
                    }
                }
            } else {
                log.warn("Gemini API trả về mã lỗi HTTP {}: {}", response.statusCode(), response.body());
            }
        } catch (Exception ex) {
            log.warn("Gọi Gemini API thất bại: {}", ex.getMessage());
        }
        return null;
    }

    private String buildPrompt(String productName, String categoryName, List<String> keywords) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là chuyên gia Content Marketing & SEO Thương Mại Điện Tử hàng đầu.\n");
        sb.append("Hãy viết một đoạn mô tả sản phẩm hấp dẫn, chuẩn SEO cho sản phẩm sau:\n");
        sb.append("- Tên sản phẩm: ").append(productName).append("\n");
        sb.append("- Danh mục: ").append(categoryName).append("\n");
        if (keywords != null && !keywords.isEmpty()) {
            sb.append("- Các từ khóa trọng tâm: ").append(String.join(", ", keywords)).append("\n");
        }
        sb.append("\nYêu cầu cấu trúc:\n");
        sb.append("1. Mở đầu hấp dẫn giới thiệu định vị sản phẩm.\n");
        sb.append("2. Nêu bật các tính năng công nghệ vượt trội, hiệu năng, thiết kế và trải nghiệm thực tế.\n");
        sb.append("3. Lợi ích tối đa cho người dùng và lời cam kết chất lượng/bảo hành chính hãng.\n");
        sb.append("Văn phong hiện đại, lôi cuốn, độ dài khoảng 120-180 từ, định dạng Markdown rõ ràng.");
        return sb.toString();
    }

    private String generateSmartSeoDescription(String productName, String categoryName, List<String> keywords) {
        String keywordStr = (keywords != null && !keywords.isEmpty()) ? String.join(", ", keywords) : "công nghệ tiên tiến, thiết kế đẳng cấp";

        return String.format(
                "### Giới thiệu sản phẩm %s\n\n" +
                "**%s** là sự kết hợp hoàn hảo giữa thiết kế hiện đại, tinh tế và hiệu năng vượt bậc trong phân khúc **%s**. " +
                "Sở hữu ngôn ngữ hoàn thiện cao cấp cùng độ bền bỉ đáng kinh ngạc, sản phẩm mang lại trải nghiệm đỉnh cao cho cả nhu cầu công việc lẫn giải trí thường ngày.\n\n" +
                "#### Điểm nổi bật vượt trội:\n" +
                "- **Hiệu năng bứt phá**: Tối ưu hóa xử lý mượt mà, phản hồi tức thì với tốc độ đáng nể.\n" +
                "- **Trải nghiệm xuất sắc**: Tích hợp các tính năng thông minh (%s) giúp nâng cao tiện ích cho người sử dụng.\n" +
                "- **Độ bền chuẩn mực**: Quy trình sản xuất nghiêm ngặt, vật liệu thân thiện và an toàn tuyệt đối.\n\n" +
                "Sản phẩm được phân phối chính hãng với chế độ bảo hành 12 tháng, 1 đổi 1 trong 30 ngày và giao hàng nhanh toàn quốc. Đặt hàng ngay hôm nay để nhận ưu đãi hấp dẫn nhất!",
                productName, productName, categoryName, keywordStr
        );
    }

    private String generateSeoTitle(String productName, String categoryName) {
        return String.format("%s - Chính Hãng, Giá Tốt Nhất Phân Khúc %s | E-Shop", productName, categoryName);
    }

    private String generateKeywords(String productName, String categoryName, List<String> keywords) {
        StringBuilder sb = new StringBuilder();
        sb.append(productName.toLowerCase()).append(", ");
        sb.append(categoryName.toLowerCase()).append(" chính hãng, ");
        sb.append("mua ").append(productName.toLowerCase()).append(", ");
        sb.append("giá tốt ").append(productName.toLowerCase());
        if (keywords != null && !keywords.isEmpty()) {
            for (String kw : keywords) {
                sb.append(", ").append(kw.trim().toLowerCase());
            }
        }
        return sb.toString();
    }
}
