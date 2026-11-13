package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/admin/cache")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCacheController {

    private final CacheManager cacheManager;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCacheStats() {
        Map<String, Object> statsMap = new LinkedHashMap<>();

        for (String name : cacheManager.getCacheNames()) {
            org.springframework.cache.Cache cache = cacheManager.getCache(name);
            Map<String, Object> detail = new LinkedHashMap<>();

            if (cache instanceof CaffeineCache caffeineCache) {
                com.github.benmanes.caffeine.cache.Cache<Object, Object> nativeCache = caffeineCache.getNativeCache();
                com.github.benmanes.caffeine.cache.stats.CacheStats stats = nativeCache.stats();

                detail.put("size", nativeCache.estimatedSize());
                detail.put("hitCount", stats.hitCount());
                detail.put("missCount", stats.missCount());
                detail.put("hitRate", Math.round(stats.hitRate() * 10000.0) / 100.0 + "%");
                detail.put("evictionCount", stats.evictionCount());
            } else {
                detail.put("status", "ACTIVE");
            }
            statsMap.put(name, detail);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("type", "In-Memory Caffeine RAM Cache");
        response.put("caches", statsMap);
        response.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê In-Memory RAM Cache thành công", response));
    }

    @PostMapping("/clear")
    public ResponseEntity<ApiResponse<String>> clearAllCaches(@RequestParam(required = false) String cacheName) {
        if (cacheName != null && !cacheName.isBlank()) {
            org.springframework.cache.Cache cache = cacheManager.getCache(cacheName.trim());
            if (cache != null) {
                cache.clear();
                log.info(">>> [AdminCache] Đã xóa toàn bộ dữ liệu trong RAM cache '{}'", cacheName);
                return ResponseEntity.ok(ApiResponse.success("Đã làm mới bộ nhớ RAM cho cache '" + cacheName + "'"));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "Không tìm thấy cache với tên: " + cacheName));
        }

        for (String name : cacheManager.getCacheNames()) {
            org.springframework.cache.Cache cache = cacheManager.getCache(name);
            if (cache != null) {
                cache.clear();
            }
        }
        log.info(">>> [AdminCache] Đã xóa toàn bộ tất cả In-Memory RAM caches");
        return ResponseEntity.ok(ApiResponse.success("Đã làm mới toàn bộ bộ nhớ RAM Cache thành công!"));
    }
}

