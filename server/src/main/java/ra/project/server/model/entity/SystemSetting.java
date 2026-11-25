package ra.project.server.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "system_settings", indexes = {
        @Index(name = "idx_sys_setting_key", columnList = "setting_key", unique = true),
        @Index(name = "idx_sys_setting_group", columnList = "setting_group")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSetting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "setting_key", nullable = false, unique = true, length = 120)
    private String settingKey;

    @Column(name = "setting_value", columnDefinition = "LONGTEXT")
    private String settingValue;

    @Column(name = "setting_group", nullable = false, length = 50)
    @Builder.Default
    private String settingGroup = "GENERAL"; // GENERAL, SHIPPING, PAYMENT, STORE_CONTACT, SOCIAL, AI

    @Column(name = "label", length = 200)
    private String label;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "value_type", nullable = false, length = 30)
    @Builder.Default
    private String valueType = "STRING"; // STRING, NUMBER, BOOLEAN, TEXT, JSON

    @Column(name = "is_public", nullable = false)
    @Builder.Default
    private Boolean isPublic = true;
}

