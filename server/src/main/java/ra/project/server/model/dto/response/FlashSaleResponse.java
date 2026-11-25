package ra.project.server.model.dto.response;

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
public class FlashSaleResponse {

    private Long id;
    private String title;
    private String description;
    private String badgeText;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Boolean isActive;
    private Long remainingSeconds;
    private String runtimeStatus; // LIVE, UPCOMING, ENDED, INACTIVE
    private Integer itemCount;
    private List<FlashSaleItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FlashSaleItemResponse {
        private Long id;
        private Long productId;
        private String productName;
        private String productBrand;
        private String productImageUrl;
        private BigDecimal salePrice;
        private BigDecimal originalPrice;
        private Integer discountPercent;
        private Integer stockLimit;
        private Integer soldCount;
        private Integer remainingStock;
        private Integer displayOrder;
    }
}

