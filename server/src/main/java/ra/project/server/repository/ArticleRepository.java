package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.Article;

import java.util.Optional;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {

    Optional<Article> findBySlug(String slug);

    Optional<Article> findBySlugAndStatusTrue(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    @Query("SELECT a FROM Article a WHERE a.status = true " +
           "AND (:category IS NULL OR :category = '' OR a.category = :category) " +
           "AND (:keyword IS NULL OR :keyword = '' OR LOWER(a.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(a.summary) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Article> findPublicArticles(@Param("category") String category,
                                     @Param("keyword") String keyword,
                                     Pageable pageable);

    @Query("SELECT a FROM Article a WHERE " +
           "(:status IS NULL OR a.status = :status) " +
           "AND (:category IS NULL OR :category = '' OR a.category = :category) " +
           "AND (:keyword IS NULL OR :keyword = '' OR LOWER(a.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(a.summary) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Article> findAdminArticles(@Param("status") Boolean status,
                                    @Param("category") String category,
                                    @Param("keyword") String keyword,
                                    Pageable pageable);

    @Modifying
    @Query("UPDATE Article a SET a.views = COALESCE(a.views, 0) + 1 WHERE a.id = :id")
    void incrementViews(@Param("id") Long id);

    @Query("SELECT DISTINCT a.category FROM Article a WHERE a.status = true AND a.category IS NOT NULL AND TRIM(a.category) <> '' ORDER BY a.category ASC")
    java.util.List<String> findDistinctPublicCategories();

    @Query("SELECT DISTINCT a.category FROM Article a WHERE a.category IS NOT NULL AND TRIM(a.category) <> '' ORDER BY a.category ASC")
    java.util.List<String> findDistinctAllCategories();
}

