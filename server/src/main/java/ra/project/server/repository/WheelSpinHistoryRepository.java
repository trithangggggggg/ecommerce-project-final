package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.dto.response.AdminWheelSpinHistoryResponse;
import ra.project.server.model.entity.WheelSpinHistory;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WheelSpinHistoryRepository extends JpaRepository<WheelSpinHistory, Long> {

    boolean existsByUserIdAndSpinDate(Long userId, LocalDate spinDate);

    Optional<WheelSpinHistory> findByUserIdAndSpinDate(Long userId, LocalDate spinDate);

    @Modifying
    void deleteByUserIdAndSpinDate(Long userId, LocalDate spinDate);

    long countBySpinDate(LocalDate spinDate);

    @Query("SELECT COUNT(DISTINCT h.userId) FROM WheelSpinHistory h")
    long countDistinctUsers();

    @Query("SELECT h.rewardId, h.rewardLabel, COUNT(h.id) FROM WheelSpinHistory h GROUP BY h.rewardId, h.rewardLabel ORDER BY h.rewardId ASC")
    List<Object[]> countSpinsByReward();

    @Query("SELECT new ra.project.server.model.dto.response.AdminWheelSpinHistoryResponse(" +
            "h.id, h.userId, u.username, u.email, u.fullName, u.avatarUrl, " +
            "h.spinDate, h.rewardId, h.rewardLabel, h.voucherCode, h.createdAt, " +
            "p.usedCount, p.status, p.discount, p.minOrder) " +
            "FROM WheelSpinHistory h " +
            "LEFT JOIN User u ON h.userId = u.id " +
            "LEFT JOIN Promotion p ON h.voucherCode = p.code " +
            "WHERE (:keyword IS NULL OR :keyword = '' " +
            "      OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "      OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "      OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "      OR LOWER(h.voucherCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "      OR LOWER(h.rewardLabel) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:spinDate IS NULL OR h.spinDate = :spinDate) " +
            "ORDER BY h.createdAt DESC")
    Page<AdminWheelSpinHistoryResponse> searchHistory(
            @Param("keyword") String keyword,
            @Param("spinDate") LocalDate spinDate,
            Pageable pageable
    );

    @Query("SELECT new ra.project.server.model.dto.response.AdminWheelSpinHistoryResponse(" +
            "h.id, h.userId, u.username, u.email, u.fullName, u.avatarUrl, " +
            "h.spinDate, h.rewardId, h.rewardLabel, h.voucherCode, h.createdAt, " +
            "p.usedCount, p.status, p.discount, p.minOrder) " +
            "FROM WheelSpinHistory h " +
            "LEFT JOIN User u ON h.userId = u.id " +
            "LEFT JOIN Promotion p ON h.voucherCode = p.code " +
            "WHERE h.id = :id")
    Optional<AdminWheelSpinHistoryResponse> findDetailById(@Param("id") Long id);
}
