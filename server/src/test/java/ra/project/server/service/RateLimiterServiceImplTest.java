package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import ra.project.server.service.impl.RateLimiterServiceImpl;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterServiceImplTest {

    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterServiceImpl();
    }

    @Test
    @DisplayName("Cho phép các yêu cầu chat hợp lệ trong ngưỡng 15 requests/phút")
    void allowChatRequest_withinLimit_returnsTrue() {
        String testIp = "192.168.1.100";
        for (int i = 0; i < 15; i++) {
            boolean allowed = rateLimiterService.allowChatRequest(testIp);
            assertTrue(allowed, "Lượt thứ " + (i + 1) + " phải được cho phép");
        }
    }

    @Test
    @DisplayName("Từ chối khi client gửi request thứ 16 trong vòng 60 giây")
    void allowChatRequest_exceedLimit_returnsFalse() {
        String testIp = "192.168.1.101";
        for (int i = 0; i < 15; i++) {
            rateLimiterService.allowChatRequest(testIp);
        }

        // Request thứ 16
        boolean sixteenthAllowed = rateLimiterService.allowChatRequest(testIp);
        assertFalse(sixteenthAllowed, "Lượt thứ 16 phải bị rate limit chặn lại");

        long remainingSec = rateLimiterService.getRemainingSeconds(testIp);
        assertTrue(remainingSec > 0 && remainingSec <= 60, "Thời gian chờ phải từ 1 đến 60 giây");
    }

    @Test
    @DisplayName("Các IP khác nhau có bộ đếm độc lập")
    void allowChatRequest_differentIps_independentCounters() {
        String ip1 = "10.0.0.1";
        String ip2 = "10.0.0.2";

        for (int i = 0; i < 15; i++) {
            rateLimiterService.allowChatRequest(ip1);
        }

        assertFalse(rateLimiterService.allowChatRequest(ip1));
        assertTrue(rateLimiterService.allowChatRequest(ip2), "IP2 không bị ảnh hưởng bởi IP1");
    }
}

