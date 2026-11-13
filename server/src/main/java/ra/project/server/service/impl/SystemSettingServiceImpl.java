package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ra.project.server.common.response.PageResponse;
import ra.project.server.config.CacheConfig;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.entity.SystemSetting;
import ra.project.server.repository.SystemSettingRepository;
import ra.project.server.service.SystemSettingService;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class SystemSettingServiceImpl implements SystemSettingService {

    private final SystemSettingRepository systemSettingRepository;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.CACHE_SYSTEM_SETTINGS, key = "'public'")
    public Map<String, Object> getPublicSettings() {
        List<SystemSetting> publicSettings = systemSettingRepository.findByIsPublicTrueOrderBySettingGroupAscIdAsc();
        Map<String, String> values = new LinkedHashMap<>();
        for (SystemSetting s : publicSettings) {
            values.put(s.getSettingKey(), s.getSettingValue());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("values", values);

        Map<String, Object> shipping = new LinkedHashMap<>();
        shipping.put("freeshipThreshold", parseDecimal(values.get("shipping.freeshipThreshold"), BigDecimal.valueOf(20_000_000)));
        shipping.put("halfShipThreshold", parseDecimal(values.get("shipping.halfShipThreshold"), BigDecimal.valueOf(10_000_000)));
        shipping.put("defaultFee", parseDecimal(values.get("shipping.defaultFee"), BigDecimal.valueOf(30_000)));
        shipping.put("estimatedLeadTime", values.getOrDefault("shipping.estimatedLeadTime", "2 - 3 ngày làm việc"));
        result.put("shipping", shipping);

        Map<String, Object> payment = new LinkedHashMap<>();
        payment.put("codEnabled", parseBool(values.get("payment.codEnabled"), true));
        payment.put("sepayEnabled", parseBool(values.get("payment.sepayEnabled"), true));
        payment.put("vnpayEnabled", parseBool(values.get("payment.vnpayEnabled"), false));
        result.put("payment", payment);

        Map<String, Object> store = new LinkedHashMap<>();
        store.put("name", values.getOrDefault("store.name", "NEXOR Technology Store"));
        store.put("shortName", values.getOrDefault("store.shortName", "NEXOR"));
        store.put("tagline", values.getOrDefault("store.tagline", "Hệ sinh thái Công nghệ & Trải nghiệm AI"));
        store.put("hotline", values.getOrDefault("store.hotline", "1800 6688"));
        store.put("hotlineLabel", values.getOrDefault("store.hotlineLabel", "1800 6688 (Miễn phí)"));
        store.put("email", values.getOrDefault("store.email", "support@nexor.vn"));
        store.put("address", values.getOrDefault("store.address", "Tầng 12, Tòa nhà Nexor Tower, Quận 1, TP. Hồ Chí Minh"));
        store.put("openHours", values.getOrDefault("store.openHours", "08:00 - 22:00 (Thứ 2 - Chủ Nhật)"));
        store.put("copyright", values.getOrDefault("store.copyright", "© 2026 NEXOR Technology. Bảo lưu mọi quyền."));
        result.put("store", store);

        Map<String, Object> social = new LinkedHashMap<>();
        social.put("facebookUrl", values.getOrDefault("social.facebookUrl", ""));
        social.put("youtubeUrl", values.getOrDefault("social.youtubeUrl", ""));
        social.put("zaloUrl", values.getOrDefault("social.zaloUrl", ""));
        result.put("social", social);

        Map<String, Object> general = new LinkedHashMap<>();
        general.put("wheelEnabled", parseBool(values.get("general.wheelEnabled"), true));
        general.put("promoTickerText", values.getOrDefault("general.promoTickerText", ""));
        general.put("flashSaleBannerTitle", values.getOrDefault("general.flashSaleBannerTitle", "GIỜ VÀNG GIÁ SỐC - SĂN DEAL CHÍNH HÃNG"));
        result.put("general", general);

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SystemSetting> searchAdminSettings(String keyword, String group, Pageable pageable) {
        String cleanKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String cleanGroup = (StringUtils.hasText(group) && !"ALL".equalsIgnoreCase(group)) ? group.trim().toUpperCase() : null;
        Page<SystemSetting> page = systemSettingRepository.searchAdminSettings(cleanKeyword, cleanGroup, pageable);
        return PageResponse.from(page);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SystemSetting> getAllAdminSettings(String group) {
        if (StringUtils.hasText(group) && !"ALL".equalsIgnoreCase(group)) {
            return systemSettingRepository.findBySettingGroupIgnoreCaseOrderByIdAsc(group.trim());
        }
        return systemSettingRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public SystemSetting getSettingById(Long id) {
        return systemSettingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cấu hình hệ thống", "id", id));
    }

    @Override
    @CacheEvict(value = CacheConfig.CACHE_SYSTEM_SETTINGS, allEntries = true)
    public SystemSetting createSetting(SystemSetting request) {
        if (!StringUtils.hasText(request.getSettingKey())) {
            throw new BadRequestException("Mã khóa cấu hình (settingKey) không được để trống");
        }
        String key = request.getSettingKey().trim();
        if (systemSettingRepository.existsBySettingKeyIgnoreCase(key)) {
            throw new BadRequestException("Khóa cấu hình '" + key + "' đã tồn tại");
        }
        SystemSetting setting = SystemSetting.builder()
                .settingKey(key)
                .settingValue(request.getSettingValue())
                .settingGroup(StringUtils.hasText(request.getSettingGroup()) ? request.getSettingGroup().trim().toUpperCase() : "GENERAL")
                .label(StringUtils.hasText(request.getLabel()) ? request.getLabel().trim() : key)
                .description(request.getDescription())
                .valueType(StringUtils.hasText(request.getValueType()) ? request.getValueType().trim().toUpperCase() : "STRING")
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : true)
                .build();
        return systemSettingRepository.save(setting);
    }

    @Override
    @CacheEvict(value = CacheConfig.CACHE_SYSTEM_SETTINGS, allEntries = true)
    public SystemSetting updateSetting(Long id, SystemSetting request) {
        SystemSetting existing = getSettingById(id);
        if (StringUtils.hasText(request.getSettingKey())) {
            String newKey = request.getSettingKey().trim();
            if (!newKey.equalsIgnoreCase(existing.getSettingKey()) && systemSettingRepository.existsBySettingKeyIgnoreCase(newKey)) {
                throw new BadRequestException("Khóa cấu hình '" + newKey + "' đã tồn tại");
            }
            existing.setSettingKey(newKey);
        }
        existing.setSettingValue(request.getSettingValue());
        if (StringUtils.hasText(request.getSettingGroup())) {
            existing.setSettingGroup(request.getSettingGroup().trim().toUpperCase());
        }
        if (request.getLabel() != null) {
            existing.setLabel(request.getLabel().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription().trim());
        }
        if (StringUtils.hasText(request.getValueType())) {
            existing.setValueType(request.getValueType().trim().toUpperCase());
        }
        if (request.getIsPublic() != null) {
            existing.setIsPublic(request.getIsPublic());
        }
        return systemSettingRepository.save(existing);
    }

    @Override
    @CacheEvict(value = CacheConfig.CACHE_SYSTEM_SETTINGS, allEntries = true)
    public List<SystemSetting> bulkUpdate(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return Collections.emptyList();
        }
        List<SystemSetting> updated = new ArrayList<>();
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            String key = entry.getKey();
            if (!StringUtils.hasText(key)) continue;
            String val = entry.getValue() != null ? entry.getValue().toString() : "";

            SystemSetting setting = systemSettingRepository.findBySettingKeyIgnoreCase(key.trim())
                    .orElseGet(() -> SystemSetting.builder()
                            .settingKey(key.trim())
                            .settingGroup(inferGroupFromKey(key.trim()))
                            .label(key.trim())
                            .valueType(inferValueType(val))
                            .isPublic(!key.trim().toLowerCase().startsWith("ai."))
                            .build());
            setting.setSettingValue(val);
            updated.add(systemSettingRepository.save(setting));
        }
        return updated;
    }

    @Override
    @CacheEvict(value = CacheConfig.CACHE_SYSTEM_SETTINGS, allEntries = true)
    public void deleteSetting(Long id) {
        SystemSetting existing = getSettingById(id);
        systemSettingRepository.delete(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public String getString(String key, String defaultValue) {
        return systemSettingRepository.findBySettingKeyIgnoreCase(key)
                .map(SystemSetting::getSettingValue)
                .filter(StringUtils::hasText)
                .orElse(defaultValue);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getDecimal(String key, BigDecimal defaultValue) {
        String raw = systemSettingRepository.findBySettingKeyIgnoreCase(key)
                .map(SystemSetting::getSettingValue)
                .orElse(null);
        return parseDecimal(raw, defaultValue);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean getBoolean(String key, boolean defaultValue) {
        String raw = systemSettingRepository.findBySettingKeyIgnoreCase(key)
                .map(SystemSetting::getSettingValue)
                .orElse(null);
        return parseBool(raw, defaultValue);
    }

    private BigDecimal parseDecimal(String raw, BigDecimal fallback) {
        if (!StringUtils.hasText(raw)) return fallback;
        try {
            return new BigDecimal(raw.trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private boolean parseBool(String raw, boolean fallback) {
        if (!StringUtils.hasText(raw)) return fallback;
        return Boolean.parseBoolean(raw.trim());
    }

    private String inferGroupFromKey(String key) {
        String lower = key.toLowerCase();
        if (lower.startsWith("shipping.")) return "SHIPPING";
        if (lower.startsWith("payment.")) return "PAYMENT";
        if (lower.startsWith("store.")) return "STORE_CONTACT";
        if (lower.startsWith("social.")) return "SOCIAL";
        if (lower.startsWith("ai.")) return "AI";
        return "GENERAL";
    }

    private String inferValueType(String val) {
        if ("true".equalsIgnoreCase(val) || "false".equalsIgnoreCase(val)) return "BOOLEAN";
        try {
            new BigDecimal(val);
            return "NUMBER";
        } catch (Exception ignored) {
            return val.length() > 200 ? "TEXT" : "STRING";
        }
    }
}

