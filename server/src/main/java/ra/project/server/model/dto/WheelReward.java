package ra.project.server.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WheelReward {
    private Integer id;
    private String label;
    private String shortLabel;
    private String discount;
    private String type; // "ORDER" or "SHIPPING"
    private String minOrder;
    private BigDecimal maxDiscountAmount;
    private Integer weight;
    private String color;
    private String textColor;
    private String icon;
}

