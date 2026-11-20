package ra.project.server.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import ra.project.server.service.OrderService;

/**
 * Scheduled job quét định kỳ các đơn hàng giữ chỗ thanh toán VietQR / SePay quá thời hạn (5 phút).
 * Tự động hủy đơn hàng, hoàn trả tồn kho và trả lại lượt dùng mã giảm giá cho khách.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderExpirationScheduler {

    private final OrderService orderService;

    /**
     * Chạy định kỳ mỗi 30 giây (delay ban đầu 10 giây sau khi server khởi động).
     */
    @Scheduled(fixedDelay = 30000, initialDelay = 10000)
    public void scanAndCancelExpiredQrOrders() {
        try {
            int cancelled = orderService.cancelExpiredUnpaidQrOrders();
            if (cancelled > 0) {
                log.info("[OrderExpirationScheduler] Đã hủy và hoàn kho thành công {} đơn hàng QR quá 5 phút chưa thanh toán.", cancelled);
            }
        } catch (Exception ex) {
            log.error("[OrderExpirationScheduler] Gặp lỗi khi quét hủy đơn hàng QR quá hạn: {}", ex.getMessage(), ex);
        }
    }
}
