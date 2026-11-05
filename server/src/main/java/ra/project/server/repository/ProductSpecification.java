package ra.project.server.repository;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.ProductVariant;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ProductSpecification {

    public static Specification<Product> filter(
            String keyword,
            Long categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean status
    ) {
        String statusStr = status == null ? null : (status ? "ACTIVE" : "INACTIVE");
        return filter(keyword, categoryId, null, minPrice, maxPrice, statusStr, false);
    }

    public static Specification<Product> filter(
            String keyword,
            Long categoryId,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean status
    ) {
        String statusStr = status == null ? null : (status ? "ACTIVE" : "INACTIVE");
        return filter(keyword, categoryId, brand, minPrice, maxPrice, statusStr, false);
    }

    public static Specification<Product> filter(
            String keyword,
            Long categoryId,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String status
    ) {
        return filter(keyword, categoryId, brand, minPrice, maxPrice, status, false);
    }

    public static Specification<Product> filter(
            String keyword,
            Long categoryId,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String status,
            Boolean includeDeleted
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 0. Bỏ qua các sản phẩm đã bị xóa mềm (isDeleted = true) trừ khi includeDeleted = true
            if (!Boolean.TRUE.equals(includeDeleted)) {
                predicates.add(cb.or(cb.isNull(root.get("isDeleted")), cb.isFalse(root.get("isDeleted"))));
            }

            // 1. Tìm kiếm theo keyword trong tên, mô tả, thương hiệu, hoặc mã SKU của biến thể
            if (StringUtils.hasText(keyword)) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), pattern);
                Predicate descLike = cb.like(cb.lower(root.get("description")), pattern);
                Predicate brandLike = cb.like(cb.lower(root.get("brand")), pattern);

                Join<Product, ProductVariant> variantJoin = root.join("variants", JoinType.LEFT);
                Predicate skuLike = cb.like(cb.lower(variantJoin.get("sku")), pattern);

                predicates.add(cb.or(nameLike, descLike, brandLike, skuLike));
                if (query != null) {
                    query.distinct(true);
                }
            }

            // 2. Lọc theo danh mục
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            // 3. Lọc theo thương hiệu
            if (StringUtils.hasText(brand) && !"tất cả".equalsIgnoreCase(brand.trim())) {
                predicates.add(cb.equal(cb.lower(root.get("brand")), brand.trim().toLowerCase()));
            }

            // 4. Lọc theo giá tối thiểu
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            }

            // 5. Lọc theo giá tối đa
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            }

            // 6. Lọc theo trạng thái (ACTIVE, INACTIVE, COMING_SOON)
            if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status.trim())) {
                predicates.add(cb.equal(cb.upper(root.get("status")), status.trim().toUpperCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
