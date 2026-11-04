package ra.project.server.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import ra.project.server.service.AiConfigService;
import ra.project.server.service.RateLimiterService;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class RateLimiterServiceImpl implements RateLimiterService {

    // Cho phép tối đa 15 requests trong cửa sổ 60 giây (1 phút) cho mỗi IP mặc định
    private static final int DEFAULT_MAX_REQUESTS_PER_WINDOW = 15;
    private static final long WINDOW_DURATION_MILLIS = 60_000L; // 60s

    private final Map<String, Deque<Long>> clientRequestLog = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private AiConfigService aiConfigService;

    private int getMaxRequestsPerWindow() {
        if (aiConfigService != null) {
            return aiConfigService.getRateLimitPerMinute();
        }
        return DEFAULT_MAX_REQUESTS_PER_WINDOW;
    }

    @Override
    public boolean allowChatRequest(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = "unknown-client";
        }

        int maxLimit = getMaxRequestsPerWindow();
        long now = System.currentTimeMillis();
        long windowStart = now - WINDOW_DURATION_MILLIS;

        Deque<Long> timestamps = clientRequestLog.computeIfAbsent(clientIp, k -> new ArrayDeque<>());

        synchronized (timestamps) {
            // Xóa các lượt gọi nằm ngoài cửa sổ 60s
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }

            if (timestamps.size() < maxLimit) {
                timestamps.addLast(now);
                return true;
            } else {
                log.warn("Rate limit kích hoạt đối với IP [{}]: {} requests trong 60s (Giới hạn: {})", clientIp, timestamps.size(), maxLimit);
                return false;
            }
        }
    }

    @Override
    public long getRemainingSeconds(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return 5L;
        }

        Deque<Long> timestamps = clientRequestLog.get(clientIp);
        if (timestamps == null) {
            return 0L;
        }

        synchronized (timestamps) {
            if (timestamps.isEmpty()) {
                return 0L;
            }
            Long oldest = timestamps.peekFirst();
            if (oldest == null) return 0L;

            long elapsed = System.currentTimeMillis() - oldest;
            long waitMillis = WINDOW_DURATION_MILLIS - elapsed;
            return Math.max(1L, (waitMillis + 999) / 1000);
        }
    }
}

