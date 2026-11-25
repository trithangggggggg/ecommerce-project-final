package ra.project.server.service;

import ra.project.server.model.dto.response.*;

import java.util.List;
import java.util.Map;

public interface DashboardService {

    RevenueTimelineResponse getRevenueTimeline(String range);

    KpiSummaryResponse getKpiSummary();

    List<TopProductResponse> getTopProducts(int limit);

    List<LowStockAlertResponse> getLowStockAlerts(int threshold);

    Map<String, Object> getDashboardStats();
}

