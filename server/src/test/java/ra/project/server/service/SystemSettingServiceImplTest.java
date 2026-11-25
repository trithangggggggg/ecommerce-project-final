package ra.project.server.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ra.project.server.exception.BadRequestException;
import ra.project.server.model.entity.SystemSetting;
import ra.project.server.repository.SystemSettingRepository;
import ra.project.server.service.impl.SystemSettingServiceImpl;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: SystemSettingServiceImpl")
class SystemSettingServiceImplTest {

    @Mock
    private SystemSettingRepository systemSettingRepository;

    @InjectMocks
    private SystemSettingServiceImpl settingService;

    @Test
    @DisplayName("getPublicSettings phân nhóm chính xác cấu hình từ DB")
    @SuppressWarnings("unchecked")
    void getPublicSettings_returnsGroupedConfig() {
        List<SystemSetting> rows = List.of(
                SystemSetting.builder().settingKey("shipping.freeshipThreshold").settingValue("15000000").isPublic(true).build(),
                SystemSetting.builder().settingKey("shipping.halfShipThreshold").settingValue("8000000").isPublic(true).build(),
                SystemSetting.builder().settingKey("payment.codEnabled").settingValue("false").isPublic(true).build(),
                SystemSetting.builder().settingKey("payment.sepayEnabled").settingValue("true").isPublic(true).build(),
                SystemSetting.builder().settingKey("store.hotline").settingValue("1900 9999").isPublic(true).build(),
                SystemSetting.builder().settingKey("general.wheelEnabled").settingValue("false").isPublic(true).build()
        );
        when(systemSettingRepository.findByIsPublicTrueOrderBySettingGroupAscIdAsc()).thenReturn(rows);

        Map<String, Object> result = settingService.getPublicSettings();

        Map<String, Object> shipping = (Map<String, Object>) result.get("shipping");
        Map<String, Object> payment = (Map<String, Object>) result.get("payment");
        Map<String, Object> store = (Map<String, Object>) result.get("store");
        Map<String, Object> general = (Map<String, Object>) result.get("general");

        assertEquals(new BigDecimal("15000000"), shipping.get("freeshipThreshold"));
        assertEquals(new BigDecimal("8000000"), shipping.get("halfShipThreshold"));
        assertEquals(false, payment.get("codEnabled"));
        assertEquals(true, payment.get("sepayEnabled"));
        assertEquals("1900 9999", store.get("hotline"));
        assertEquals(false, general.get("wheelEnabled"));
    }

    @Test
    @DisplayName("bulkUpdate tự suy luận nhóm & isPublic cho key mới và cập nhật key cũ")
    void bulkUpdate_createsAndUpdatesSettings() {
        SystemSetting existing = SystemSetting.builder()
                .id(1L)
                .settingKey("shipping.freeshipThreshold")
                .settingValue("20000000")
                .settingGroup("SHIPPING")
                .isPublic(true)
                .build();

        when(systemSettingRepository.findBySettingKeyIgnoreCase("shipping.freeshipThreshold"))
                .thenReturn(Optional.of(existing));
        when(systemSettingRepository.findBySettingKeyIgnoreCase("ai.temperature"))
                .thenReturn(Optional.empty());
        when(systemSettingRepository.save(any(SystemSetting.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("shipping.freeshipThreshold", 25000000);
        payload.put("ai.temperature", "0.5");

        List<SystemSetting> updated = settingService.bulkUpdate(payload);

        assertEquals(2, updated.size());
        assertEquals("25000000", existing.getSettingValue());
        SystemSetting newAi = updated.get(1);
        assertEquals("AI", newAi.getSettingGroup());
        assertEquals(false, newAi.getIsPublic());
        assertEquals("NUMBER", newAi.getValueType());
    }

    @Test
    @DisplayName("createSetting báo lỗi trùng settingKey")
    void createSetting_duplicateKey_throwsBadRequest() {
        when(systemSettingRepository.existsBySettingKeyIgnoreCase("store.name")).thenReturn(true);
        assertThrows(BadRequestException.class, () ->
                settingService.createSetting(SystemSetting.builder().settingKey("store.name").settingValue("X").build()));
    }

    @Test
    @DisplayName("getDecimal & getBoolean trả fallback an toàn khi giá trị DB sai định dạng")
    void getDecimalAndBoolean_fallbackOnInvalidValue() {
        when(systemSettingRepository.findBySettingKeyIgnoreCase("shipping.defaultFee"))
                .thenReturn(Optional.of(SystemSetting.builder().settingValue("not-a-number").build()));
        when(systemSettingRepository.findBySettingKeyIgnoreCase("payment.codEnabled"))
                .thenReturn(Optional.empty());

        assertEquals(BigDecimal.valueOf(30000), settingService.getDecimal("shipping.defaultFee", BigDecimal.valueOf(30000)));
        assertTrue(settingService.getBoolean("payment.codEnabled", true));
    }
}

