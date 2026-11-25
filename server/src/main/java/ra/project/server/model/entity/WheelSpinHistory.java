package ra.project.server.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "wheel_spin_histories",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_spin_date", columnNames = {"user_id", "spin_date"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WheelSpinHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "spin_date", nullable = false)
    private LocalDate spinDate;

    @Column(name = "reward_id", nullable = false)
    private Integer rewardId;

    @Column(name = "reward_label", nullable = false, length = 255)
    private String rewardLabel;

    @Column(name = "voucher_code", length = 100)
    private String voucherCode;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}

