package ra.project.server.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.config.CacheConfig;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AdminCacheControllerTest {

    private CacheManager cacheManager;
    private AdminCacheController controller;

    @BeforeEach
    void setUp() {
        CacheConfig config = new CacheConfig();
        cacheManager = config.cacheManager();
        controller = new AdminCacheController(cacheManager);
    }

    @Test
    @DisplayName("Lấy thống kê cache trong RAM thành công")
    void getCacheStats_returnsStats() {
        cacheManager.getCache(CacheConfig.CACHE_CATEGORIES).put("key1", "val1");

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.getCacheStats();

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().isSuccess());
        assertNotNull(response.getBody().getData());
        assertTrue(response.getBody().getData().containsKey("caches"));
    }

    @Test
    @DisplayName("Xóa toàn bộ RAM cache thành công")
    void clearAllCaches_clearsData() {
        cacheManager.getCache(CacheConfig.CACHE_CATEGORIES).put("key1", "val1");
        cacheManager.getCache(CacheConfig.CACHE_BRANDS).put("key2", "val2");

        ResponseEntity<ApiResponse<String>> res = controller.clearAllCaches(null);

        assertEquals(200, res.getStatusCode().value());
        assertNull(cacheManager.getCache(CacheConfig.CACHE_CATEGORIES).get("key1"));
        assertNull(cacheManager.getCache(CacheConfig.CACHE_BRANDS).get("key2"));
    }

    @Test
    @DisplayName("Xóa một cache cụ thể theo tên")
    void clearSpecificCache_clearsTargetOnly() {
        cacheManager.getCache(CacheConfig.CACHE_CATEGORIES).put("key1", "val1");
        cacheManager.getCache(CacheConfig.CACHE_BRANDS).put("key2", "val2");

        ResponseEntity<ApiResponse<String>> res = controller.clearAllCaches(CacheConfig.CACHE_CATEGORIES);

        assertEquals(200, res.getStatusCode().value());
        assertNull(cacheManager.getCache(CacheConfig.CACHE_CATEGORIES).get("key1"));
        assertNotNull(cacheManager.getCache(CacheConfig.CACHE_BRANDS).get("key2"));
    }
}

