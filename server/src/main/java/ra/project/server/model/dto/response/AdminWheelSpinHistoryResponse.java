package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminWheelSpinHistoryResponse {
    private Long id;
    private Long userId;
    private String username;
    private String email;
    private String fullName;
    private String avatarUrl;
    private LocalDate spinDate;
    private Integer rewardId;
    private String rewardLabel;
    private String voucherCode;
    private LocalDateTime createdAt;

    // Thông tin khuyến mãi đi kèm (nếu có voucher)
    private Integer usedCount;
    private String voucherStatus;
    private String discount;
    private String minOrder;
}

