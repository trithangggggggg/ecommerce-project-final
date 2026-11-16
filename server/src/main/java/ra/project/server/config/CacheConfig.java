package ra.project.server.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Slf4j
@Configuration
@EnableCaching
public class CacheConfig {

    public static final String CACHE_CATEGORIES = "categories";
    public static final String CACHE_BRANDS = "brands";
    public static final String CACHE_PRODUCTS = "products";
    public static final String CACHE_BANNERS = "banners";
    public static final String CACHE_SYSTEM_SETTINGS = "system_settings";
    public static final String CACHE_POLICIES = "policies";
    public static final String CACHE_ARTICLES = "articles";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
                CACHE_CATEGORIES,
                CACHE_BRANDS,
                CACHE_PRODUCTS,
                CACHE_BANNERS,
                CACHE_SYSTEM_SETTINGS,
                CACHE_POLICIES,
                CACHE_ARTICLES
        );
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .initialCapacity(100)
                .maximumSize(2000)
                .expireAfterWrite(Duration.ofMinutes(15))
                .recordStats());
        log.info(">>> [CacheConfig] Đã kích hoạt In-Memory Caffeine RAM Cache (TTL: 15m, MaxSize: 2000 items, Stats: ON)");
        return cacheManager;
    }
}

