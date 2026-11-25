package ra.project.server.model.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentStatus;

import java.time.LocalDateTime;

/**
 * Kết quả tóm tắt trạng thái thanh toán trả về cho Frontend hiển thị (dùng cho polling QR & màn kết quả).
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
    private String paymentReference;
    private Long amount;
    private OrderStatus orderStatus;
    private PaymentStatus paymentStatus;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime paidAt;
}

