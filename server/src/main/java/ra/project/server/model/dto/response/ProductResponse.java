package ra.project.server.model.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProductResponse {

    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private BigDecimal originalPrice;
    private Integer discountPercent;
    private Integer stock;
    private String imageUrl;
    private Boolean status;
    private Long categoryId;
    private String categoryName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Detailed fields (included on detail response)
    private List<ProductOptionResponse> options;
    private List<ProductVariantResponse> variants;
    private List<ProductSpecResponse> specs;
    private List<ProductImageResponse> images;
}
