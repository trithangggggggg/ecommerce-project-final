package ra.project.server.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.WishlistItem;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<WishlistItem, Long> {

    @Query("SELECT w FROM WishlistItem w JOIN FETCH w.product p LEFT JOIN FETCH p.category " +
           "WHERE w.user.id = :userId AND (p.isDeleted = FALSE OR p.isDeleted IS NULL) " +
           "ORDER BY w.createdAt DESC")
    List<WishlistItem> findActiveByUserId(@Param("userId") Long userId);

    @Query("SELECT w.product.id FROM WishlistItem w JOIN w.product p " +
           "WHERE w.user.id = :userId AND (p.isDeleted = FALSE OR p.isDeleted IS NULL) " +
           "ORDER BY w.createdAt DESC")
    List<Long> findProductIdsByUserId(@Param("userId") Long userId);

    Optional<WishlistItem> findByUserIdAndProductId(Long userId, Long productId);

    boolean existsByUserIdAndProductId(Long userId, Long productId);

    void deleteByUserIdAndProductId(Long userId, Long productId);
}

