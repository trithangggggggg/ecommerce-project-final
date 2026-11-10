package ra.project.server.model.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VisualSearchProductItem {

    private Long id;
    private String name;
    private String brand;
    private String categoryName;
    private String imageUrl;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Integer matchPercent;
    private String matchReason;
    private ProductVariantResponse bestVariant;
}

