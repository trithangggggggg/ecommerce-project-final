package ra.project.server.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.WheelSpinHistory;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface WheelSpinHistoryRepository extends JpaRepository<WheelSpinHistory, Long> {

    boolean existsByUserIdAndSpinDate(Long userId, LocalDate spinDate);

    Optional<WheelSpinHistory> findByUserIdAndSpinDate(Long userId, LocalDate spinDate);
}

