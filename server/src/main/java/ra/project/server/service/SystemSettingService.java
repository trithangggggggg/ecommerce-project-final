package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.entity.SystemSetting;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface SystemSettingService {

    Map<String, Object> getPublicSettings();

    PageResponse<SystemSetting> searchAdminSettings(String keyword, String group, Pageable pageable);

    List<SystemSetting> getAllAdminSettings(String group);

    SystemSetting getSettingById(Long id);

    SystemSetting createSetting(SystemSetting request);

    SystemSetting updateSetting(Long id, SystemSetting request);

    List<SystemSetting> bulkUpdate(Map<String, Object> payload);

    void deleteSetting(Long id);

    String getString(String key, String defaultValue);

    BigDecimal getDecimal(String key, BigDecimal defaultValue);

    boolean getBoolean(String key, boolean defaultValue);
}

