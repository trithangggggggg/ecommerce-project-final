package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.FlashSale;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FlashSaleRepository extends JpaRepository<FlashSale, Long> {

    @EntityGraph(attributePaths = {"items", "items.product"})
    @Query("""
        SELECT fs FROM FlashSale fs
        WHERE fs.isActive = true
          AND fs.startTime <= :now
          AND fs.endTime >= :now
        ORDER BY fs.endTime ASC, fs.id DESC
    """)
    List<FlashSale> findActiveFlashSales(@Param("now") LocalDateTime now);

    @EntityGraph(attributePaths = {"items", "items.product"})
    @Query("""
        SELECT fs FROM FlashSale fs
        WHERE fs.isActive = true
        ORDER BY fs.startTime DESC, fs.id DESC
    """)
    List<FlashSale> findLatestActiveOrUpcoming();

    @EntityGraph(attributePaths = {"items", "items.product"})
    Optional<FlashSale> findWithItemsById(Long id);

    @Query("""
        SELECT fs FROM FlashSale fs
        WHERE (:keyword IS NULL OR LOWER(fs.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(COALESCE(fs.description, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:isActive IS NULL OR fs.isActive = :isActive)
        ORDER BY fs.startTime DESC, fs.id DESC
    """)
    Page<FlashSale> searchAdminFlashSales(
            @Param("keyword") String keyword,
            @Param("isActive") Boolean isActive,
            Pageable pageable
    );
}

