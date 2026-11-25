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
public class LowStockAlertResponse {
    private Long variantId;
    private Long productId;
    private String productName;
    private String variantName;
    private String sku;
    private Integer currentStock;
    private Integer threshold;
    private BigDecimal price;
    private String imageUrl;
    private String categoryName;
}

