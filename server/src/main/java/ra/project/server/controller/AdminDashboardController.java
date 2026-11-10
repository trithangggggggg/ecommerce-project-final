package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.response.*;
import ra.project.server.service.DashboardService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminDashboardController {

    private final DashboardService dashboardService;

    /**
     * Lấy tổng quan số liệu cơ bản (sản phẩm, đơn hàng, khách hàng, tổng doanh thu)
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu Dashboard thành công", dashboardService.getDashboardStats()));
    }

    /**
     * GET /api/admin/dashboard/revenue-timeline?range={7days|30days|month|year}
     * Gom nhóm doanh thu theo mốc thời gian (theo ngày hoặc theo tháng)
     */
    @GetMapping("/revenue-timeline")
    public ResponseEntity<ApiResponse<RevenueTimelineResponse>> getRevenueTimeline(
            @RequestParam(name = "range", defaultValue = "7days") String range) {
        RevenueTimelineResponse response = dashboardService.getRevenueTimeline(range);
        return ResponseEntity.ok(ApiResponse.success("Lấy biểu đồ doanh thu thành công", response));
    }

    /**
     * GET /api/admin/dashboard/kpi-summary
     * Doanh thu tháng, tổng đơn, khách hàng mới, tăng trưởng % MoM
     */
    @GetMapping("/kpi-summary")
    public ResponseEntity<ApiResponse<KpiSummaryResponse>> getKpiSummary() {
        KpiSummaryResponse response = dashboardService.getKpiSummary();
        return ResponseEntity.ok(ApiResponse.success("Lấy chỉ số KPI tổng quan thành công", response));
    }

    /**
     * GET /api/admin/dashboard/top-products?limit=10
     * Top sản phẩm bán chạy nhất
     */
    @GetMapping("/top-products")
    public ResponseEntity<ApiResponse<List<TopProductResponse>>> getTopProducts(
            @RequestParam(name = "limit", defaultValue = "10") Integer limit) {
        List<TopProductResponse> response = dashboardService.getTopProducts(limit != null ? limit : 10);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách top sản phẩm bán chạy thành công", response));
    }

    /**
     * GET /api/admin/dashboard/low-stock-alerts?threshold=10
     * Cảnh báo các mẫu / biến thể sắp hết hàng
     */
    @GetMapping("/low-stock-alerts")
    public ResponseEntity<ApiResponse<List<LowStockAlertResponse>>> getLowStockAlerts(
            @RequestParam(name = "threshold", defaultValue = "10") Integer threshold) {
        List<LowStockAlertResponse> response = dashboardService.getLowStockAlerts(threshold != null ? threshold : 10);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cảnh báo tồn kho thành công", response));
    }
}
