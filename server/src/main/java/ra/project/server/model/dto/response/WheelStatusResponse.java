package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ra.project.server.model.dto.WheelReward;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WheelStatusResponse {
    private boolean canSpin;
    private boolean hasSpunToday;
    @Builder.Default
    private int remainingSpins = 0;
    private String message;
    private String todayVoucherCode;
    private String todayRewardLabel;
    private List<WheelReward> rewards;
}
