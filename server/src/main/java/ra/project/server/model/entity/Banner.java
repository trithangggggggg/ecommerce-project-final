package ra.project.server.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "banners", indexes = {
        @Index(name = "idx_banner_position", columnList = "position"),
        @Index(name = "idx_banner_active", columnList = "is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Banner extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "subtitle", length = 500)
    private String subtitle;

    @Column(name = "badge", length = 80)
    private String badge;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "link_url", length = 500)
    private String linkUrl;

    @Column(name = "position", nullable = false, length = 50)
    @Builder.Default
    private String position = "HERO_SLIDER"; // HERO_SLIDER, HERO_PROMO, VERTICAL_PROMO

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "click_count", nullable = false)
    @Builder.Default
    private Long clickCount = 0L;
}

