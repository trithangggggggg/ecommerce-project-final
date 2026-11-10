package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminWheelStatsResponse {
    private long totalSpins;
    private long spinsToday;
    private long uniqueUsers;
    private long vouchersIssued;
    private long vouchersUsed;
    private List<RewardDistributionItem> rewardDistributions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RewardDistributionItem {
        private Integer rewardId;
        private String rewardLabel;
        private long count;
        private double percentage;
    }
}

