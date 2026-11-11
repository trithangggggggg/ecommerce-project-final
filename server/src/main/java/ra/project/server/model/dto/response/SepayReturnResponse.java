package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentStatus;

/**
 * Kết quả tóm tắt trả về cho Frontend hiển thị sau khi khách hàng hoàn tất/hủy/gặp lỗi tại cổng thanh toán SePay.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SepayReturnResponse {

    private boolean success;
    private boolean cancelled;
    private String status;
    private String message;
    private Long orderId;
    private String invoiceNumber;
    private String sepayOrderId;
    private Long amount;
    private OrderStatus orderStatus;
    private PaymentStatus paymentStatus;
}

