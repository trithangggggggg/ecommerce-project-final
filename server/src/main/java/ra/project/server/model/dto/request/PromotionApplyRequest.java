package ra.project.server.model.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionApplyRequest {
    private String code;
    private BigDecimal subtotal;
    private BigDecimal shippingFee;
}
