package ra.project.server.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.StoreLocation;

import java.util.List;

@Repository
public interface StoreLocationRepository extends JpaRepository<StoreLocation, Long> {

    List<StoreLocation> findByStatusIgnoreCase(String status);

    List<StoreLocation> findByProvinceContainingIgnoreCaseAndStatusIgnoreCase(String province, String status);

    List<StoreLocation> findByProvinceContainingIgnoreCase(String province);

    List<StoreLocation> findAllByOrderByCreatedAtDesc();

    List<StoreLocation> findAllByOrderByIdAsc();

    boolean existsByNameIgnoreCase(String name);
}

