package ra.project.server.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.ShippingCarrier;

import java.util.Optional;

@Repository
public interface ShippingCarrierRepository extends JpaRepository<ShippingCarrier, Long> {
    Optional<ShippingCarrier> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
}
