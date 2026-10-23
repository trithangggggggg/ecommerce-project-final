package ra.project.server.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "product_specs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductSpec {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    private Product product;

    @Column(name = "group_name", length = 100)
    private String groupName;

    @Column(name = "spec_key", nullable = false, length = 150)
    private String specKey;

    @Column(name = "spec_value", columnDefinition = "TEXT", nullable = false)
    private String specValue;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private Integer position = 0;
}
