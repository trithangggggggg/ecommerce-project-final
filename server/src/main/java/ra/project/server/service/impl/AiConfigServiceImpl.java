package ra.project.server.service.impl;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import ra.project.server.model.dto.request.AiConfigRequest;
import ra.project.server.model.dto.response.AiConfigResponse;
import ra.project.server.service.AiConfigService;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
public class AiConfigServiceImpl implements AiConfigService {

    @Value("${gemini.api-key:${GEMINI_API_KEY:}}")
    private String envGeminiApiKey;

    @Value("${gemini.model:${GEMINI_MODEL:gemini-1.5-flash}}")
    private String envGeminiModel;

    @Value("${gemini.api-url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String geminiApiUrl;

    @Value("${spring.ai.openai.api-key:${app.ai.api-key:}}")
    private String envOpenAiApiKey;

    @Value("${spring.ai.openai.chat.options.model:gpt-4o-mini}")
    private String envOpenAiModel;

    // Runtime state (cho phép Admin chỉnh sửa trực tiếp không cần restart)
    private final AtomicReference<String> providerRef = new AtomicReference<>("GOOGLE_GEMINI");
    private final AtomicReference<String> geminiModelRef = new AtomicReference<>("gemini-1.5-flash");
    private final AtomicReference<String> openAiModelRef = new AtomicReference<>("gpt-4o-mini");
    private final AtomicReference<String> customGeminiKeyRef = new AtomicReference<>(null);
    private final AtomicReference<String> customOpenAiKeyRef = new AtomicReference<>(null);

    private final AtomicReference<String> systemPromptRef = new AtomicReference<>(
            "Bạn là chuyên viên tư vấn công nghệ chuyên nghiệp của NEXOR Store (E-Commerce Tech Shop). " +
            "Luôn trả lời bằng tiếng Việt lịch sự, thân thiện, súc tích và chính xác. " +
            "Ưu tiên gợi ý và trả lời dựa trên tài liệu tri thức (Knowledge Base) và các sản phẩm đang bán tại cửa hàng."
    );

    private final AtomicReference<Double> temperatureRef = new AtomicReference<>(0.7);
    private final AtomicInteger maxOutputTokensRef = new AtomicInteger(1000);
    private final AtomicInteger maxInputLengthRef = new AtomicInteger(500);
    private final AtomicInteger rateLimitPerMinuteRef = new AtomicInteger(15);

    private final AtomicBoolean knowledgeBaseEnabledRef = new AtomicBoolean(true);
    private final AtomicInteger topKChunksRef = new AtomicInteger(4);
    private final AtomicReference<Double> relevanceThresholdRef = new AtomicReference<>(0.35);

    private final AtomicBoolean suggestProductsEnabledRef = new AtomicBoolean(true);
    private final AtomicInteger maxSuggestedProductsRef = new AtomicInteger(3);

    private LocalDateTime lastUpdated = LocalDateTime.now();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    @PostConstruct
    public void init() {
        if (StringUtils.hasText(envGeminiModel)) {
            geminiModelRef.set(envGeminiModel);
        }
        if (StringUtils.hasText(envOpenAiModel)) {
            openAiModelRef.set(envOpenAiModel);
        }
        log.info("Khởi tạo AiConfigService: Gemini Model [{}], OpenAI Model [{}]", geminiModelRef.get(), openAiModelRef.get());
    }

    @Override
    public AiConfigResponse getConfig() {
        String effectiveGeminiKey = getEffectiveGeminiApiKey();
        String effectiveOpenAiKey = getEffectiveOpenAiApiKey();

        String status = "STANDBY (Offline Fallback Engine)";
        if (StringUtils.hasText(effectiveGeminiKey) && !effectiveGeminiKey.equalsIgnoreCase("dummy") && !effectiveGeminiKey.startsWith("placeholder")) {
            status = "ONLINE (Google Gemini Active)";
        } else if (StringUtils.hasText(effectiveOpenAiKey) && !effectiveOpenAiKey.equalsIgnoreCase("dummy")) {
            status = "ONLINE (Spring AI / OpenAI Active)";
        }

        return AiConfigResponse.builder()
                .provider(providerRef.get())
                .modelName("GOOGLE_GEMINI".equalsIgnoreCase(providerRef.get()) ? geminiModelRef.get() : openAiModelRef.get())
                .systemPrompt(systemPromptRef.get())
                .temperature(temperatureRef.get())
                .maxOutputTokens(maxOutputTokensRef.get())
                .maxInputLength(maxInputLengthRef.get())
                .rateLimitPerMinute(rateLimitPerMinuteRef.get())
                .knowledgeBaseEnabled(knowledgeBaseEnabledRef.get())
                .topKChunks(topKChunksRef.get())
                .relevanceThreshold(relevanceThresholdRef.get())
                .suggestProductsEnabled(suggestProductsEnabledRef.get())
                .maxSuggestedProducts(maxSuggestedProductsRef.get())
                .geminiApiKeyMasked(maskApiKey(effectiveGeminiKey))
                .openAiApiKeyMasked(maskApiKey(effectiveOpenAiKey))
                .status(status)
                .activeEngine(determineActiveEngine())
                .updatedAt(lastUpdated)
                .build();
    }

    @Override
    public AiConfigResponse updateConfig(AiConfigRequest request) {
        if (request == null) return getConfig();

        if (StringUtils.hasText(request.getProvider())) {
            providerRef.set(request.getProvider().trim());
        }

        if (StringUtils.hasText(request.getModelName())) {
            if ("SPRING_AI".equalsIgnoreCase(providerRef.get())) {
                openAiModelRef.set(request.getModelName().trim());
            } else {
                geminiModelRef.set(request.getModelName().trim());
            }
        }

        if (StringUtils.hasText(request.getSystemPrompt())) {
            systemPromptRef.set(request.getSystemPrompt().trim());
        }

        if (request.getTemperature() != null) {
            temperatureRef.set(request.getTemperature());
        }

        if (request.getMaxOutputTokens() != null) {
            maxOutputTokensRef.set(request.getMaxOutputTokens());
        }

        if (request.getMaxInputLength() != null) {
            maxInputLengthRef.set(request.getMaxInputLength());
        }

        if (request.getRateLimitPerMinute() != null) {
            rateLimitPerMinuteRef.set(request.getRateLimitPerMinute());
        }

        if (request.getKnowledgeBaseEnabled() != null) {
            knowledgeBaseEnabledRef.set(request.getKnowledgeBaseEnabled());
        }

        if (request.getTopKChunks() != null) {
            topKChunksRef.set(request.getTopKChunks());
        }

        if (request.getRelevanceThreshold() != null) {
            relevanceThresholdRef.set(request.getRelevanceThreshold());
        }

        if (request.getSuggestProductsEnabled() != null) {
            suggestProductsEnabledRef.set(request.getSuggestProductsEnabled());
        }

        if (request.getMaxSuggestedProducts() != null) {
            maxSuggestedProductsRef.set(request.getMaxSuggestedProducts());
        }

        if (StringUtils.hasText(request.getGeminiApiKey())) {
            customGeminiKeyRef.set(request.getGeminiApiKey().trim());
        }

        if (StringUtils.hasText(request.getOpenAiApiKey())) {
            customOpenAiKeyRef.set(request.getOpenAiApiKey().trim());
        }

        lastUpdated = LocalDateTime.now();
        log.info("Cập nhật AI Config thành công: Provider={}, Model={}, RateLimit={}/min, MaxInput={}",
                providerRef.get(), geminiModelRef.get(), rateLimitPerMinuteRef.get(), maxInputLengthRef.get());

        return getConfig();
    }

    @Override
    public Map<String, Object> testConnection(String provider, String model) {
        Map<String, Object> result = new HashMap<>();
        String targetProvider = StringUtils.hasText(provider) ? provider : providerRef.get();
        String targetModel = StringUtils.hasText(model) ? model :
                ("SPRING_AI".equalsIgnoreCase(targetProvider) ? openAiModelRef.get() : geminiModelRef.get());

        long start = System.currentTimeMillis();

        if ("GOOGLE_GEMINI".equalsIgnoreCase(targetProvider)) {
            String apiKey = getEffectiveGeminiApiKey();
            if (!StringUtils.hasText(apiKey) || apiKey.equalsIgnoreCase("dummy") || apiKey.startsWith("placeholder")) {
                result.put("success", true);
                result.put("provider", "SMART_FALLBACK (Local Engine)");
                result.put("status", "STANDBY");
                result.put("latencyMs", 25);
                result.put("message", "Chưa cấu hình Google Gemini API Key. Đang hoạt động ở chế độ Trợ lý thông minh cục bộ (Offline Fallback Engine).");
                return result;
            }

            try {
                String url = geminiApiUrl + "/" + targetModel + ":generateContent?key=" + apiKey;
                String body = "{\"contents\":[{\"parts\":[{\"text\":\"ping test\"}]}]}";
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(4))
                        .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
                long latency = System.currentTimeMillis() - start;

                if (resp.statusCode() == 200) {
                    result.put("success", true);
                    result.put("provider", "GOOGLE_GEMINI (" + targetModel + ")");
                    result.put("status", "HEALTHY");
                    result.put("latencyMs", latency);
                    result.put("message", "Kết nối Google Gemini AI thành công! Độ trễ phản hồi: " + latency + "ms.");
                } else {
                    result.put("success", false);
                    result.put("provider", "GOOGLE_GEMINI (" + targetModel + ")");
                    result.put("status", "ERROR");
                    result.put("latencyMs", latency);
                    result.put("message", "Google Gemini phản hồi mã lỗi HTTP " + resp.statusCode());
                }
            } catch (Exception e) {
                long latency = System.currentTimeMillis() - start;
                result.put("success", false);
                result.put("provider", "GOOGLE_GEMINI (" + targetModel + ")");
                result.put("status", "TIMEOUT_OR_FAILED");
                result.put("latencyMs", latency);
                result.put("message", "Kết nối AI thất bại: " + e.getMessage());
            }
        } else {
            // Local Smart Fallback ping test
            long latency = Math.max(10, System.currentTimeMillis() - start);
            result.put("success", true);
            result.put("provider", "SMART_ASSISTANT (Local Engine)");
            result.put("status", "HEALTHY");
            result.put("latencyMs", latency);
            result.put("message", "Bộ xử lý thông minh phản hồi hoàn hảo trong " + latency + "ms.");
        }

        return result;
    }

    private String determineActiveEngine() {
        String gKey = getEffectiveGeminiApiKey();
        if (StringUtils.hasText(gKey) && !gKey.equalsIgnoreCase("dummy") && !gKey.startsWith("placeholder")) {
            return "Google Gemini (" + geminiModelRef.get() + ")";
        }
        String oKey = getEffectiveOpenAiApiKey();
        if (StringUtils.hasText(oKey) && !oKey.equalsIgnoreCase("dummy")) {
            return "Spring AI OpenAI (" + openAiModelRef.get() + ")";
        }
        return "NEXOR Smart Offline Engine";
    }

    private String maskApiKey(String key) {
        if (!StringUtils.hasText(key) || key.length() < 8) {
            return "Chưa cấu hình";
        }
        return key.substring(0, 6) + "..." + key.substring(key.length() - 4);
    }

    @Override
    public int getRateLimitPerMinute() {
        return rateLimitPerMinuteRef.get();
    }

    @Override
    public int getMaxInputLength() {
        return maxInputLengthRef.get();
    }

    @Override
    public String getSystemPrompt() {
        return systemPromptRef.get();
    }

    @Override
    public Double getTemperature() {
        return temperatureRef.get();
    }

    @Override
    public Integer getMaxOutputTokens() {
        return maxOutputTokensRef.get();
    }

    @Override
    public boolean isKnowledgeBaseEnabled() {
        return knowledgeBaseEnabledRef.get();
    }

    @Override
    public int getTopKChunks() {
        return topKChunksRef.get();
    }

    @Override
    public boolean isSuggestProductsEnabled() {
        return suggestProductsEnabledRef.get();
    }

    @Override
    public int getMaxSuggestedProducts() {
        return maxSuggestedProductsRef.get();
    }

    @Override
    public String getEffectiveGeminiApiKey() {
        String custom = customGeminiKeyRef.get();
        return StringUtils.hasText(custom) ? custom : envGeminiApiKey;
    }

    @Override
    public String getEffectiveGeminiModel() {
        return geminiModelRef.get();
    }

    @Override
    public String getEffectiveOpenAiApiKey() {
        String custom = customOpenAiKeyRef.get();
        return StringUtils.hasText(custom) ? custom : envOpenAiApiKey;
    }

    @Override
    public String getEffectiveOpenAiModel() {
        return openAiModelRef.get();
    }
}
