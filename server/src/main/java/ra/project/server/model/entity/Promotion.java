package ra.project.server.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "promotions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promotion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "discount", nullable = false, length = 100)
    private String discount;

    @Column(name = "min_order", length = 100)
    private String minOrder;

    @Column(name = "expiry", length = 50)
    private String expiry;

    @Column(name = "used_count")
    @Builder.Default
    private Integer usedCount = 0;

    @Column(name = "max_usage")
    @Builder.Default
    private Integer maxUsage = 100;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";
}
