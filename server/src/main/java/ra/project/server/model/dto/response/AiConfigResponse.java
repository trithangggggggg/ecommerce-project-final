package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiConfigResponse {

    private String provider; // GOOGLE_GEMINI, SPRING_AI, SMART_ASSISTANT
    private String modelName;
    private String systemPrompt;
    private Double temperature;
    private Integer maxOutputTokens;
    private Integer maxInputLength;
    private Integer rateLimitPerMinute;
    private Boolean knowledgeBaseEnabled;
    private Integer topKChunks;
    private Double relevanceThreshold;
    private Boolean suggestProductsEnabled;
    private Integer maxSuggestedProducts;

    private String geminiApiKeyMasked;
    private String openAiApiKeyMasked;
    private String status; // ONLINE, STANDBY, OFFLINE
    private String activeEngine;
    private LocalDateTime updatedAt;
}
