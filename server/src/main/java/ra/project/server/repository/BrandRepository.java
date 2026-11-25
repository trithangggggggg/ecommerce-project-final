package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.Brand;

import java.util.List;
import java.util.Optional;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {

    Optional<Brand> findBySlugIgnoreCase(String slug);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);

    List<Brand> findByStatusTrueOrderByDisplayOrderAscNameAsc();

    @Query("""
        SELECT b FROM Brand b
        WHERE (:keyword IS NULL OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:status IS NULL OR b.status = :status)
        ORDER BY b.displayOrder ASC, b.id DESC
    """)
    Page<Brand> searchAdminBrands(
            @Param("keyword") String keyword,
            @Param("status") Boolean status,
            Pageable pageable
    );
}

