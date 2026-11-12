package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.Policy;

import java.util.List;
import java.util.Optional;

@Repository
public interface PolicyRepository extends JpaRepository<Policy, Long> {

    List<Policy> findByIsActiveTrueOrderByDisplayOrderAscIdAsc();

    Optional<Policy> findBySlugIgnoreCase(String slug);

    Optional<Policy> findBySlugIgnoreCaseAndIsActiveTrue(String slug);

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);

    @Query("""
        SELECT p FROM Policy p
        WHERE (:keyword IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(COALESCE(p.summary, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:category IS NULL OR UPPER(p.category) = UPPER(:category))
          AND (:isActive IS NULL OR p.isActive = :isActive)
        ORDER BY p.displayOrder ASC, p.id DESC
    """)
    Page<Policy> searchAdminPolicies(
            @Param("keyword") String keyword,
            @Param("category") String category,
            @Param("isActive") Boolean isActive,
            Pageable pageable
    );
}

