package ra.project.server.service;

import ra.project.server.model.dto.request.AiConfigRequest;
import ra.project.server.model.dto.response.AiConfigResponse;

import java.util.Map;

public interface AiConfigService {

    AiConfigResponse getConfig();

    AiConfigResponse updateConfig(AiConfigRequest request);

    Map<String, Object> testConnection(String provider, String model);

    int getRateLimitPerMinute();

    int getMaxInputLength();

    String getSystemPrompt();

    Double getTemperature();

    Integer getMaxOutputTokens();

    boolean isKnowledgeBaseEnabled();

    int getTopKChunks();

    boolean isSuggestProductsEnabled();

    int getMaxSuggestedProducts();

    String getEffectiveGeminiApiKey();

    String getEffectiveGeminiModel();

    String getEffectiveOpenAiApiKey();

    String getEffectiveOpenAiModel();
}
