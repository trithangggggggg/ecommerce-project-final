package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ra.project.server.model.enums.PaymentMethod;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderPreviewDto {
    private String draftId;
    private Long productId;
    private String productName;
    private String productImageUrl;
    private int quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalAmount;
    private String receiverName;
    private String phoneNumber;
    private String shippingAddress;
    private String note;
    private PaymentMethod paymentMethod;
    private String paymentMethodName;
    private boolean awaitingConfirmation;
}
