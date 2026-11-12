package ra.project.server.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "policies", indexes = {
        @Index(name = "idx_policy_slug", columnList = "slug", unique = true),
        @Index(name = "idx_policy_category", columnList = "category"),
        @Index(name = "idx_policy_active", columnList = "is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Policy extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "slug", nullable = false, unique = true, length = 220)
    private String slug;

    @Column(name = "category", nullable = false, length = 50)
    @Builder.Default
    private String category = "GENERAL"; // WARRANTY, RETURN, SHIPPING, PAYMENT, INSTALLMENT, PRIVACY, TERMS

    @Column(name = "summary", length = 500)
    private String summary;

    @Lob
    @Column(name = "content", columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

