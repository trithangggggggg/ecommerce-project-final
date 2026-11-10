package ra.project.server.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "articles", indexes = {
        @Index(name = "idx_article_slug", columnList = "slug", unique = true),
        @Index(name = "idx_article_category", columnList = "category"),
        @Index(name = "idx_article_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Article extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "slug", nullable = false, unique = true, length = 255)
    private String slug;

    @Column(name = "summary", length = 1000)
    private String summary;

    @Lob
    @Column(name = "content", columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "thumbnail", length = 500)
    private String thumbnail;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "views", nullable = false)
    @Builder.Default
    private Long views = 0L;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private Boolean status = true;
}

