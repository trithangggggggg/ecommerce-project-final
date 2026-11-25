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
public class TopProductResponse {
    private Long productId;
    private String productName;
    private String imageUrl;
    private String categoryName;
    private BigDecimal price;
    private Long totalSold;
    private BigDecimal totalRevenue;
}

