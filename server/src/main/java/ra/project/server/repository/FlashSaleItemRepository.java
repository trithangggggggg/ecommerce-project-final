package ra.project.server.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.FlashSaleItem;

import java.util.List;

@Repository
public interface FlashSaleItemRepository extends JpaRepository<FlashSaleItem, Long> {
    List<FlashSaleItem> findByFlashSaleIdOrderByDisplayOrderAscIdAsc(Long flashSaleId);
    void deleteByFlashSaleId(Long flashSaleId);
}

