package ra.project.server.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;

import static org.junit.jupiter.api.Assertions.*;

class CacheConfigTest {

    @Test
    @DisplayName("Cấu hình Caffeine Cache Manager khởi tạo đầy đủ các cache")
    void cacheManager_initializesAllCaches() {
        CacheConfig config = new CacheConfig();
        CacheManager cacheManager = config.cacheManager();

        assertNotNull(cacheManager);
        assertInstanceOf(CaffeineCacheManager.class, cacheManager);

        assertNotNull(cacheManager.getCache(CacheConfig.CACHE_CATEGORIES));
        assertNotNull(cacheManager.getCache(CacheConfig.CACHE_BRANDS));
        assertNotNull(cacheManager.getCache(CacheConfig.CACHE_PRODUCTS));
        assertNotNull(cacheManager.getCache(CacheConfig.CACHE_BANNERS));
        assertNotNull(cacheManager.getCache(CacheConfig.CACHE_SYSTEM_SETTINGS));
        assertNotNull(cacheManager.getCache(CacheConfig.CACHE_POLICIES));
        assertNotNull(cacheManager.getCache(CacheConfig.CACHE_ARTICLES));

        Cache categoryCache = cacheManager.getCache(CacheConfig.CACHE_CATEGORIES);
        categoryCache.put("testKey", "testVal");
        assertEquals("testVal", categoryCache.get("testKey", String.class));
    }
}

