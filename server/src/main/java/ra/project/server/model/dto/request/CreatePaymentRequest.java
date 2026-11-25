package ra.project.server.model.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request khởi tạo form/phiên thanh toán SePay cho đơn hàng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentRequest {

    @NotNull(message = "Mã đơn hàng (orderId) không được để trống")
    private Long orderId;

    /**
     * Mô tả đơn hàng gửi sang SePay (mặc định "Thanh toan don hang #{orderId}").
     */
    private String description;

    /**
     * Phương thức thanh toán tùy chọn trên cổng SePay: BANK_TRANSFER, NAPAS_BANK_TRANSFER hoặc CARD.
     * Để trống nếu muốn hiển thị tất cả phương thức đã kích hoạt trên cổng SePay.
     */
    private String paymentMethod;
}
