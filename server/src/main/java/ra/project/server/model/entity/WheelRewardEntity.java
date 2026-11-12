package ra.project.server.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "wheel_rewards", indexes = {
        @Index(name = "idx_wheel_reward_active", columnList = "is_active"),
        @Index(name = "idx_wheel_reward_order", columnList = "display_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WheelRewardEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "label", nullable = false, length = 120)
    private String label;

    @Column(name = "short_label", nullable = false, length = 50)
    private String shortLabel;

    @Column(name = "discount", nullable = false, length = 50)
    private String discount;

    @Column(name = "reward_type", nullable = false, length = 30)
    @Builder.Default
    private String type = "ORDER"; // ORDER or SHIPPING

    @Column(name = "min_order", length = 100)
    private String minOrder;

    @Column(name = "max_discount_amount", precision = 12, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "weight", nullable = false)
    @Builder.Default
    private Integer weight = 10;

    @Column(name = "color", length = 30)
    @Builder.Default
    private String color = "#1e40af";

    @Column(name = "text_color", length = 30)
    @Builder.Default
    private String textColor = "#ffffff";

    @Column(name = "icon", length = 50)
    @Builder.Default
    private String icon = "gift";

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

