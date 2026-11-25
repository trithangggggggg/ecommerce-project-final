package ra.project.server.service;

public interface RateLimiterService {

    /**
     * Kiểm tra xem IP client có được phép gửi yêu cầu chat tiếp theo không.
     * Áp dụng thuật toán Sliding Window Counter.
     *
     * @param clientIp Địa chỉ IP của client
     * @return true nếu trong ngưỡng cho phép; false nếu vượt quá rate limit (spam)
     */
    boolean allowChatRequest(String clientIp);

    /**
     * Lấy số giây còn lại cần chờ nếu bị vượt ngưỡng giới hạn.
     *
     * @param clientIp Địa chỉ IP của client
     * @return số giây cần chờ (ví dụ: 15s)
     */
    long getRemainingSeconds(String clientIp);
}

