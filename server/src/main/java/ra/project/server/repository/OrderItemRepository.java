package ra.project.server.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.OrderItem;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrderId(Long orderId);

    @Query("SELECT COUNT(oi) > 0 FROM OrderItem oi WHERE oi.variant.id = :variantId")
    boolean existsByVariantId(@Param("variantId") Long variantId);

    @Query("SELECT oi.product.id, oi.productName, SUM(oi.quantity), SUM(oi.totalPrice), " +
           "COALESCE(oi.productImageUrl, p.imageUrl), c.name, COALESCE(p.price, 0) " +
           "FROM OrderItem oi " +
           "LEFT JOIN oi.product p " +
           "LEFT JOIN p.category c " +
           "WHERE oi.order.status != ra.project.server.model.enums.OrderStatus.CANCELLED " +
           "GROUP BY oi.product.id, oi.productName, oi.productImageUrl, p.imageUrl, c.name, p.price " +
           "ORDER BY SUM(oi.quantity) DESC")
    List<Object[]> findTopSellingProducts(org.springframework.data.domain.Pageable pageable);
}
