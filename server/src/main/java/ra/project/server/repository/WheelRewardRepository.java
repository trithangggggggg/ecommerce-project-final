package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.WheelRewardEntity;

import java.util.List;

@Repository
public interface WheelRewardRepository extends JpaRepository<WheelRewardEntity, Long> {

    List<WheelRewardEntity> findByIsActiveTrueOrderByDisplayOrderAscIdAsc();

    List<WheelRewardEntity> findAllByOrderByDisplayOrderAscIdAsc();

    @Query("""
        SELECT w FROM WheelRewardEntity w
        WHERE (:keyword IS NULL OR LOWER(w.label) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(w.shortLabel) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(w.discount) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:isActive IS NULL OR w.isActive = :isActive)
        ORDER BY w.displayOrder ASC, w.id ASC
    """)
    Page<WheelRewardEntity> searchAdminRewards(
            @Param("keyword") String keyword,
            @Param("isActive") Boolean isActive,
            Pageable pageable
    );
}

