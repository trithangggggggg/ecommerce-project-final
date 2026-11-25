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
public class ImportReceiptItemResponse {

    private Long id;
    private Long productId;
    private String productName;
    private Long variantId;
    private String variantTitle;
    private String sku;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal sellingPrice;
    private BigDecimal totalPrice;
}
