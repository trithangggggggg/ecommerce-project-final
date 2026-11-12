package ra.project.server.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.Supplier;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    Optional<Supplier> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    @Query("SELECT s FROM Supplier s WHERE " +
           "(:status IS NULL OR :status = '' OR UPPER(s.status) = UPPER(:status)) " +
           "AND (:keyword IS NULL OR :keyword = '' OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(s.brand) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(s.contact) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(s.email) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY s.id DESC")
    List<Supplier> searchSuppliers(@Param("keyword") String keyword, @Param("status") String status);
}
