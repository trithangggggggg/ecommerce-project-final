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
}
