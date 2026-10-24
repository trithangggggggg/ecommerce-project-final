package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.Order;
import ra.project.server.model.enums.OrderStatus;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(Long userId);

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);

    Page<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status, Pageable pageable);
    
    java.util.Optional<Order> findFirstByCompensationCoupon(String compensationCoupon);
    
    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status != ra.project.server.model.enums.OrderStatus.CANCELLED")
    java.math.BigDecimal calculateTotalRevenue();

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT o FROM Order o JOIN o.orderItems oi " +
            "WHERE (oi.product.id = :productId OR (oi.variant IS NOT NULL AND oi.variant.product.id = :productId)) " +
            "AND o.status IN (:statuses) " +
            "ORDER BY o.createdAt DESC")
    List<Order> findActiveOrdersByProductId(
            @org.springframework.data.repository.query.Param("productId") Long productId,
            @org.springframework.data.repository.query.Param("statuses") List<OrderStatus> statuses);
}
