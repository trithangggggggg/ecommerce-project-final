package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import ra.project.server.model.dto.request.AiConfigRequest;
import ra.project.server.model.dto.response.AiConfigResponse;
import ra.project.server.service.impl.AiConfigServiceImpl;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AiConfigServiceImplTest {

    private AiConfigServiceImpl aiConfigService;

    @BeforeEach
    void setUp() {
        aiConfigService = new AiConfigServiceImpl();
        ReflectionTestUtils.setField(aiConfigService, "envGeminiApiKey", "dummy");
        ReflectionTestUtils.setField(aiConfigService, "envGeminiModel", "gemini-1.5-flash");
        ReflectionTestUtils.setField(aiConfigService, "geminiApiUrl", "https://generativelanguage.googleapis.com/v1beta/models");
        ReflectionTestUtils.setField(aiConfigService, "envOpenAiApiKey", "");
        ReflectionTestUtils.setField(aiConfigService, "envOpenAiModel", "gpt-4o-mini");
        aiConfigService.init();
    }

    @Test
    @DisplayName("Lấy cấu hình AI mặc định thành công")
    void getConfig_returnsDefaultValues() {
        AiConfigResponse config = aiConfigService.getConfig();

        assertNotNull(config);
        assertEquals("GOOGLE_GEMINI", config.getProvider());
        assertEquals("gemini-1.5-flash", config.getModelName());
        assertTrue(config.getKnowledgeBaseEnabled());
    }

    @Test
    @DisplayName("Cập nhật cấu hình AI thành công")
    void updateConfig_updatesRuntimeState() {
        AiConfigRequest req = AiConfigRequest.builder()
                .provider("GOOGLE_GEMINI")
                .modelName("gemini-1.5-pro")
                .systemPrompt("Custom Prompt")
                .temperature(0.5)
                .maxOutputTokens(800)
                .knowledgeBaseEnabled(false)
                .build();

        AiConfigResponse updated = aiConfigService.updateConfig(req);

        assertNotNull(updated);
        assertEquals("GOOGLE_GEMINI", updated.getProvider());
        assertEquals("gemini-1.5-pro", updated.getModelName());
        assertEquals("Custom Prompt", updated.getSystemPrompt());
        assertEquals(0.5, updated.getTemperature());
        assertEquals(800, updated.getMaxOutputTokens());
        assertFalse(updated.getKnowledgeBaseEnabled());
    }

    @Test
    @DisplayName("Test kết nối Smart Fallback cục bộ trả về trạng thái HEALTHY")
    void testConnection_smartFallback_returnsHealthy() {
        Map<String, Object> res = aiConfigService.testConnection("SMART_ASSISTANT", null);

        assertNotNull(res);
        assertTrue((Boolean) res.get("success"));
        assertEquals("HEALTHY", res.get("status"));
        assertEquals("SMART_ASSISTANT (Local Engine)", res.get("provider"));
    }

    @Test
    @DisplayName("Test kết nối Google Gemini khi dùng API key dummy chuyển về Standby")
    void testConnection_geminiDummyKey_returnsStandby() {
        Map<String, Object> res = aiConfigService.testConnection("GOOGLE_GEMINI", "gemini-1.5-flash");

        assertNotNull(res);
        assertTrue((Boolean) res.get("success"));
        assertEquals("STANDBY", res.get("status"));
        assertTrue(res.get("provider").toString().contains("SMART_FALLBACK"));
    }
}
