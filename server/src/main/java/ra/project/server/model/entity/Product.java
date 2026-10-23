package ra.project.server.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products", indexes = {
        @Index(name = "idx_product_name", columnList = "name"),
        @Index(name = "idx_product_category", columnList = "category_id"),
        @Index(name = "idx_product_price", columnList = "price"),
        @Index(name = "idx_product_brand", columnList = "brand")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "brand", length = 100)
    private String brand;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    /**
     * @deprecated Cột stock ở bảng products chỉ còn lưu tổng tồn kho (total_stock)
     * phục vụ denormalization / sorting. Mọi logic trừ kho, hoàn kho và quản lý kho
     * phải thực hiện trên {@link ProductVariant#getStock()}.
     */
    @Deprecated
    @Column(name = "stock", nullable = false)
    @Builder.Default
    private Integer stock = 0;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private Boolean status = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("position ASC")
    @Builder.Default
    private List<ProductOption> options = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProductVariant> variants = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("position ASC")
    @Builder.Default
    private List<ProductSpec> specs = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("position ASC")
    @Builder.Default
    private List<ProductImage> images = new ArrayList<>();

    public BigDecimal getMinPrice() {
        if (variants == null || variants.isEmpty()) {
            return this.price;
        }
        return variants.stream()
                .filter(v -> Boolean.TRUE.equals(v.getStatus()))
                .map(ProductVariant::getPrice)
                .min(BigDecimal::compareTo)
                .orElse(this.price);
    }

    public BigDecimal getMaxPrice() {
        if (variants == null || variants.isEmpty()) {
            return this.price;
        }
        return variants.stream()
                .filter(v -> Boolean.TRUE.equals(v.getStatus()))
                .map(ProductVariant::getPrice)
                .max(BigDecimal::compareTo)
                .orElse(this.price);
    }

    public Integer getTotalStock() {
        if (variants == null || variants.isEmpty()) {
            return this.stock;
        }
        return variants.stream()
                .filter(v -> Boolean.TRUE.equals(v.getStatus()))
                .mapToInt(v -> v.getStock() != null ? v.getStock() : 0)
                .sum();
    }
}
