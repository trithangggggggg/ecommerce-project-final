package ra.project.server.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.model.dto.response.*;
import ra.project.server.service.DashboardService;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminDashboardControllerTest {

    private MockMvc mockMvc;

    @Mock
    private DashboardService dashboardService;

    @InjectMocks
    private AdminDashboardController adminDashboardController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(adminDashboardController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/admin/dashboard/stats returns 200 with map data")
    void testGetDashboardStats() throws Exception {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalProducts", 50L);
        stats.put("totalOrders", 120L);
        stats.put("totalCustomers", 45L);
        stats.put("totalRevenueRaw", 250000000L);
        stats.put("totalRevenueFormatted", "250.000.000 ₫");

        when(dashboardService.getDashboardStats()).thenReturn(stats);

        mockMvc.perform(get("/api/admin/dashboard/stats")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.totalProducts").value(50))
                .andExpect(jsonPath("$.data.totalOrders").value(120))
                .andExpect(jsonPath("$.data.totalRevenueRaw").value(250000000));
    }

    @Test
    @DisplayName("GET /api/admin/dashboard/revenue-timeline returns 200 with timeline array")
    void testGetRevenueTimeline() throws Exception {
        TimelineItemResponse item = TimelineItemResponse.builder()
                .date("2026-11-10")
                .label("10/11")
                .revenue(BigDecimal.valueOf(50000000))
                .orderCount(5L)
                .build();

        RevenueTimelineResponse response = RevenueTimelineResponse.builder()
                .range("7days")
                .totalRevenue(BigDecimal.valueOf(50000000))
                .totalOrders(5L)
                .averageOrderValue(BigDecimal.valueOf(10000000))
                .timeline(List.of(item))
                .build();

        when(dashboardService.getRevenueTimeline(anyString())).thenReturn(response);

        mockMvc.perform(get("/api/admin/dashboard/revenue-timeline?range=7days")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.range").value("7days"))
                .andExpect(jsonPath("$.data.totalRevenue").value(50000000))
                .andExpect(jsonPath("$.data.timeline[0].label").value("10/11"))
                .andExpect(jsonPath("$.data.timeline[0].revenue").value(50000000));
    }

    @Test
    @DisplayName("GET /api/admin/dashboard/kpi-summary returns 200 with MoM metrics")
    void testGetKpiSummary() throws Exception {
        KpiSummaryResponse kpi = KpiSummaryResponse.builder()
                .currentMonthRevenue(BigDecimal.valueOf(120000000))
                .previousMonthRevenue(BigDecimal.valueOf(100000000))
                .revenueGrowthRate(20.0)
                .currentMonthOrders(60L)
                .previousMonthOrders(50L)
                .orderGrowthRate(20.0)
                .currentMonthNewCustomers(30L)
                .previousMonthNewCustomers(25L)
                .customerGrowthRate(20.0)
                .completedOrders(55L)
                .cancelledOrders(5L)
                .completionRate(91.7)
                .currentMonthAov(BigDecimal.valueOf(2000000))
                .build();

        when(dashboardService.getKpiSummary()).thenReturn(kpi);

        mockMvc.perform(get("/api/admin/dashboard/kpi-summary")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.currentMonthRevenue").value(120000000))
                .andExpect(jsonPath("$.data.revenueGrowthRate").value(20.0))
                .andExpect(jsonPath("$.data.currentMonthOrders").value(60))
                .andExpect(jsonPath("$.data.orderGrowthRate").value(20.0));
    }

    @Test
    @DisplayName("GET /api/admin/dashboard/top-products returns 200 with product list")
    void testGetTopProducts() throws Exception {
        TopProductResponse prod = TopProductResponse.builder()
                .productId(1L)
                .productName("iPhone 15")
                .price(BigDecimal.valueOf(25000000))
                .totalSold(15L)
                .totalRevenue(BigDecimal.valueOf(375000000))
                .categoryName("Điện thoại")
                .build();

        when(dashboardService.getTopProducts(anyInt())).thenReturn(List.of(prod));

        mockMvc.perform(get("/api/admin/dashboard/top-products?limit=10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data[0].productId").value(1))
                .andExpect(jsonPath("$.data[0].productName").value("iPhone 15"))
                .andExpect(jsonPath("$.data[0].totalSold").value(15));
    }

    @Test
    @DisplayName("GET /api/admin/dashboard/low-stock-alerts returns 200 with low stock variants")
    void testGetLowStockAlerts() throws Exception {
        LowStockAlertResponse alert = LowStockAlertResponse.builder()
                .variantId(5L)
                .productId(2L)
                .productName("MacBook Pro 14")
                .variantName("MBP14-M3-16GB")
                .sku("MBP14-M3-16GB")
                .currentStock(2)
                .threshold(10)
                .price(BigDecimal.valueOf(45000000))
                .build();

        when(dashboardService.getLowStockAlerts(anyInt())).thenReturn(List.of(alert));

        mockMvc.perform(get("/api/admin/dashboard/low-stock-alerts?threshold=10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data[0].variantId").value(5))
                .andExpect(jsonPath("$.data[0].currentStock").value(2))
                .andExpect(jsonPath("$.data[0].threshold").value(10));
    }
}

