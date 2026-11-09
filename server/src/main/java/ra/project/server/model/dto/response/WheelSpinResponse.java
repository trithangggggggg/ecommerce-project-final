package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ra.project.server.model.dto.WheelReward;
import ra.project.server.model.entity.Promotion;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WheelSpinResponse {
    private int rewardIndex;
    private WheelReward reward;
    private String voucherCode;
    private Promotion voucher;
    private String message;
}

