package ra.project.server.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "shipping_carriers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingCarrier extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "service_type", length = 150)
    private String serviceType;

    @Column(name = "hotline", length = 50)
    private String hotline;

    @Column(name = "active_orders")
    @Builder.Default
    private Integer activeOrders = 0;

    @Column(name = "rating")
    @Builder.Default
    private Double rating = 5.0;

    @Column(name = "shipping_fee", precision = 12, scale = 2)
    @Builder.Default
    private java.math.BigDecimal shippingFee = java.math.BigDecimal.valueOf(30000);

    @Column(name = "estimated_delivery", length = 100)
    @Builder.Default
    private String estimatedDelivery = "2 - 3 ngày làm việc";

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    /**
     * Fills missing defaults for legacy DB rows so both public and admin APIs
     * return safe non-null values without overwriting explicit Admin edits.
     */
    public boolean applyMissingDefaults() {
        boolean modified = false;
        if (this.shippingFee == null) {
            if ("GHTK".equalsIgnoreCase(this.code)) {
                this.shippingFee = java.math.BigDecimal.valueOf(22000);
            } else if ("VTP".equalsIgnoreCase(this.code) || "VIETTEL_POST".equalsIgnoreCase(this.code)) {
                this.shippingFee = java.math.BigDecimal.valueOf(25000);
            } else if ("JNT".equalsIgnoreCase(this.code) || "SPX".equalsIgnoreCase(this.code)) {
                this.shippingFee = java.math.BigDecimal.valueOf(28000);
            } else if ("GHN".equalsIgnoreCase(this.code)) {
                this.shippingFee = java.math.BigDecimal.valueOf(35000);
            } else if ("NEXOR".equalsIgnoreCase(this.code)) {
                this.shippingFee = java.math.BigDecimal.valueOf(50000);
            } else {
                this.shippingFee = java.math.BigDecimal.valueOf(30000);
            }
            modified = true;
        }
        if (this.rating == null) {
            this.rating = 5.0;
            modified = true;
        }
        if (this.activeOrders == null) {
            this.activeOrders = 0;
            modified = true;
        }
        if (this.estimatedDelivery == null || this.estimatedDelivery.isBlank()) {
            this.estimatedDelivery = "2 - 3 ngày làm việc";
            modified = true;
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "ACTIVE";
            modified = true;
        }
        return modified;
    }
}
