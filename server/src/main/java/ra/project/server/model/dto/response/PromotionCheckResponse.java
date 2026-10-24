package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionCheckResponse {
    private String code;
    private String title;
    private String discount;
    private BigDecimal discountAmount;
    private BigDecimal subtotal;
    private BigDecimal finalTotal;
    private String minOrder;
    private String expiry;
    private boolean isValid;
    private String message;
}
