package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.Product;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    List<Product> findByCategoryId(Long categoryId);

    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);

    Page<Product> findByCategoryIdAndStatusTrue(Long categoryId, Pageable pageable);

    List<Product> findByNameContainingIgnoreCase(String name);

    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    long countByCategoryId(Long categoryId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.isDeleted = false OR p.isDeleted IS NULL")
    long countActiveProducts();

    @Modifying
    @Query("UPDATE Product p SET p.stock = (SELECT COALESCE(SUM(v.stock), 0) FROM ProductVariant v WHERE v.product.id = p.id AND v.status = true) WHERE p.id = :productId")
    void syncProductTotalStock(@Param("productId") Long productId);
}
