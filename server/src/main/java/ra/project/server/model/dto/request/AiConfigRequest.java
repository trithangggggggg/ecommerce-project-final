package ra.project.server.model.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiConfigRequest {

    private String provider; // GOOGLE_GEMINI, SPRING_AI, SMART_ASSISTANT
    private String modelName; // gemini-1.5-flash, gemini-1.5-pro, gpt-4o-mini
    private String systemPrompt;

    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Double temperature;

    @Min(100)
    @Max(4096)
    private Integer maxOutputTokens;

    @Min(100)
    @Max(2000)
    private Integer maxInputLength; // Giới hạn độ dài câu hỏi khách (mặc định 500)

    @Min(1)
    @Max(120)
    private Integer rateLimitPerMinute; // Giới hạn tần suất gọi / phút / IP (mặc định 15)

    private Boolean knowledgeBaseEnabled;

    @Min(1)
    @Max(10)
    private Integer topKChunks;

    @DecimalMin("0.1")
    @DecimalMax("0.9")
    private Double relevanceThreshold;

    private Boolean suggestProductsEnabled;

    @Min(1)
    @Max(10)
    private Integer maxSuggestedProducts;

    private String geminiApiKey;
    private String openAiApiKey;
}
