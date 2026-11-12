package ra.project.server.model.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.model.enums.PaymentStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOrderUpdateRequest {
    private String receiverName;
    private String phoneNumber;
    private String shippingAddress;
    private String note;
    private Long carrierId;
    private String trackingCode;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private String cancelReason;
}

