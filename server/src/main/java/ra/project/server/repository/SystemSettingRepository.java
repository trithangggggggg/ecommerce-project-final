package ra.project.server.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.SystemSetting;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {

    Optional<SystemSetting> findBySettingKeyIgnoreCase(String settingKey);

    boolean existsBySettingKeyIgnoreCase(String settingKey);

    List<SystemSetting> findByIsPublicTrueOrderBySettingGroupAscIdAsc();

    List<SystemSetting> findBySettingGroupIgnoreCaseOrderByIdAsc(String settingGroup);

    @Query("""
        SELECT s FROM SystemSetting s
        WHERE (:keyword IS NULL OR LOWER(s.settingKey) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(COALESCE(s.label, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(COALESCE(s.settingValue, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:settingGroup IS NULL OR UPPER(s.settingGroup) = UPPER(:settingGroup))
        ORDER BY s.settingGroup ASC, s.id ASC
    """)
    Page<SystemSetting> searchAdminSettings(
            @Param("keyword") String keyword,
            @Param("settingGroup") String settingGroup,
            Pageable pageable
    );
}

