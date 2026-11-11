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

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :start AND o.createdAt <= :end")
    long countOrdersBetween(
            @org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status != ra.project.server.model.enums.OrderStatus.CANCELLED AND o.createdAt >= :start AND o.createdAt <= :end")
    java.math.BigDecimal sumRevenueBetween(
            @org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status AND o.createdAt >= :start AND o.createdAt <= :end")
    long countOrdersByStatusBetween(
            @org.springframework.data.repository.query.Param("status") OrderStatus status,
            @org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);

    @org.springframework.data.jpa.repository.Query("SELECT o FROM Order o WHERE o.status != ra.project.server.model.enums.OrderStatus.CANCELLED AND o.createdAt >= :start AND o.createdAt <= :end ORDER BY o.createdAt ASC")
    List<Order> findActiveOrdersBetween(
            @org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);

    @org.springframework.data.jpa.repository.Query("SELECT o FROM Order o " +
            "LEFT JOIN FETCH o.user " +
            "LEFT JOIN FETCH o.shippingCarrier " +
            "WHERE (:status IS NULL OR o.status = :status) " +
            "AND (:start IS NULL OR o.createdAt >= :start) " +
            "AND (:end IS NULL OR o.createdAt <= :end) " +
            "ORDER BY o.createdAt DESC")
    List<Order> findOrdersForExport(
            @org.springframework.data.repository.query.Param("status") OrderStatus status,
            @org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);
}
