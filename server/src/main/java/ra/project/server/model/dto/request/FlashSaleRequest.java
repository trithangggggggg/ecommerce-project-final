package ra.project.server.model.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlashSaleRequest {

    private String title;
    private String description;
    private String badgeText;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Boolean isActive;

    @Builder.Default
    private List<FlashSaleItemRequest> items = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FlashSaleItemRequest {
        private Long productId;
        private BigDecimal salePrice;
        private BigDecimal originalPrice;
        private Integer stockLimit;
        private Integer soldCount;
        private Integer displayOrder;
    }
}

