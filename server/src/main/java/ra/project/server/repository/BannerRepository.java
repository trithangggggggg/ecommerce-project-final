package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.Banner;

import java.util.List;

@Repository
public interface BannerRepository extends JpaRepository<Banner, Long> {

    List<Banner> findByIsActiveTrueOrderByDisplayOrderAscIdAsc();

    List<Banner> findByPositionIgnoreCaseAndIsActiveTrueOrderByDisplayOrderAscIdAsc(String position);

    List<Banner> findAllByOrderByPositionAscDisplayOrderAscIdAsc();

    @Query("""
        SELECT b FROM Banner b
        WHERE (:keyword IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(COALESCE(b.subtitle, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:position IS NULL OR UPPER(b.position) = UPPER(:position))
          AND (:isActive IS NULL OR b.isActive = :isActive)
        ORDER BY b.displayOrder ASC, b.id DESC
    """)
    Page<Banner> searchAdminBanners(
            @Param("keyword") String keyword,
            @Param("position") String position,
            @Param("isActive") Boolean isActive,
            Pageable pageable
    );
}

