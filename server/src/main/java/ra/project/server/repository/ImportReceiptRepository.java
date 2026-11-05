package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.ImportReceipt;

import java.util.Optional;

@Repository
public interface ImportReceiptRepository extends JpaRepository<ImportReceipt, Long> {

    boolean existsByReceiptCodeIgnoreCase(String receiptCode);

    Optional<ImportReceipt> findByReceiptCodeIgnoreCase(String receiptCode);

    @Query("SELECT r FROM ImportReceipt r WHERE " +
           "(:keyword IS NULL OR :keyword = '' " +
           "OR LOWER(r.receiptCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.supplierName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.warehouse) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.importerName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY r.createdAt DESC")
    Page<ImportReceipt> searchReceipts(@Param("keyword") String keyword, Pageable pageable);
}

