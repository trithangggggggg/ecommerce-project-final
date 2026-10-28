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
public class OrderItemResponse {

    private Long id;
    private Long productId;
    private String productName;
    private Long variantId;
    private String variantName;
    private String sku;
    private String productImageUrl;
    private Integer quantity;
    private BigDecimal price;
    private BigDecimal totalPrice;
    private Long categoryId;
    private String categoryName;
}
