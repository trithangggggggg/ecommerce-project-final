package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiSummaryResponse {
    // Doanh thu tháng
    private BigDecimal currentMonthRevenue;
    private BigDecimal previousMonthRevenue;
    private Double revenueGrowthRate;

    // Đơn hàng
    private Long currentMonthOrders;
    private Long previousMonthOrders;
    private Double orderGrowthRate;

    // Khách hàng mới
    private Long currentMonthNewCustomers;
    private Long previousMonthNewCustomers;
    private Double customerGrowthRate;

    // Chỉ số bổ sung
    private Long completedOrders;
    private Long cancelledOrders;
    private Double completionRate;
    private BigDecimal currentMonthAov;
}

