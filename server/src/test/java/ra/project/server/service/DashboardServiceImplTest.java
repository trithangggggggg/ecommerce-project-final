package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import ra.project.server.model.dto.response.*;
import ra.project.server.model.entity.*;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.*;
import ra.project.server.service.impl.DashboardServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    private Order sampleOrder;

    @BeforeEach
    void setUp() {
        sampleOrder = Order.builder()
                .id(1L)
                .trackingCode("ORD-1001")
                .totalAmount(BigDecimal.valueOf(15000000))
                .status(OrderStatus.PROCESSING)
                .receiverName("Nguyễn Văn A")
                .phoneNumber("0987654321")
                .shippingAddress("Hà Nội")
                .build();
        sampleOrder.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("getRevenueTimeline: 7days range returns 7 data points")
    void testGetRevenueTimeline7Days() {
        when(orderRepository.findActiveOrdersBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(sampleOrder));

        RevenueTimelineResponse response = dashboardService.getRevenueTimeline("7days");

        assertNotNull(response);
        assertEquals("7days", response.getRange());
        assertEquals(7, response.getTimeline().size());
        assertEquals(BigDecimal.valueOf(15000000), response.getTotalRevenue());
        assertEquals(1L, response.getTotalOrders());
    }

    @Test
    @DisplayName("getRevenueTimeline: 30days range returns 30 data points")
    void testGetRevenueTimeline30Days() {
        when(orderRepository.findActiveOrdersBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        RevenueTimelineResponse response = dashboardService.getRevenueTimeline("30days");

        assertNotNull(response);
        assertEquals("30days", response.getRange());
        assertEquals(30, response.getTimeline().size());
        assertEquals(BigDecimal.ZERO, response.getTotalRevenue());
        assertEquals(0L, response.getTotalOrders());
    }

    @Test
    @DisplayName("getRevenueTimeline: year range returns 12 months")
    void testGetRevenueTimelineYear() {
        when(orderRepository.findActiveOrdersBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(sampleOrder));

        RevenueTimelineResponse response = dashboardService.getRevenueTimeline("year");

        assertNotNull(response);
        assertEquals("year", response.getRange());
        assertEquals(12, response.getTimeline().size());
        assertEquals("T1", response.getTimeline().get(0).getLabel());
        assertEquals("T12", response.getTimeline().get(11).getLabel());
    }

    @Test
    @DisplayName("getKpiSummary: calculates revenue, orders, customers and MoM growth rate")
    void testGetKpiSummary() {
        when(orderRepository.sumRevenueBetween(any(), any()))
                .thenReturn(BigDecimal.valueOf(200000000)) // current
                .thenReturn(BigDecimal.valueOf(100000000)); // prev
        when(orderRepository.countOrdersBetween(any(), any()))
                .thenReturn(50L) // current
                .thenReturn(40L); // prev
        when(userRepository.countByRoleAndCreatedAtBetween(eq(Role.CUSTOMER), any(), any()))
                .thenReturn(30L) // current
                .thenReturn(20L); // prev
        when(orderRepository.countOrdersByStatusBetween(eq(OrderStatus.COMPLETED), any(), any())).thenReturn(45L);
        when(orderRepository.countOrdersByStatusBetween(eq(OrderStatus.CANCELLED), any(), any())).thenReturn(5L);

        KpiSummaryResponse kpi = dashboardService.getKpiSummary();

        assertNotNull(kpi);
        assertEquals(BigDecimal.valueOf(200000000), kpi.getCurrentMonthRevenue());
        assertEquals(BigDecimal.valueOf(100000000), kpi.getPreviousMonthRevenue());
        assertEquals(100.0, kpi.getRevenueGrowthRate()); // 100% growth
        assertEquals(50L, kpi.getCurrentMonthOrders());
        assertEquals(25.0, kpi.getOrderGrowthRate()); // (50 - 40)/40 = 25%
        assertEquals(30L, kpi.getCurrentMonthNewCustomers());
        assertEquals(50.0, kpi.getCustomerGrowthRate()); // (30 - 20)/20 = 50%
        assertEquals(90.0, kpi.getCompletionRate()); // 45 / 50 = 90%
    }

    @Test
    @DisplayName("getTopProducts: returns aggregated top sellers from order items")
    void testGetTopProducts() {
        Object[] row = new Object[]{
                10L, "iPhone 15 Pro", 12L, BigDecimal.valueOf(360000000), "https://img.jpg", "Điện thoại", BigDecimal.valueOf(30000000)
        };
        List<Object[]> rawList = new ArrayList<>();
        rawList.add(row);

        when(orderItemRepository.findTopSellingProducts(any(Pageable.class))).thenReturn(rawList);

        List<TopProductResponse> list = dashboardService.getTopProducts(10);

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals("iPhone 15 Pro", list.get(0).getProductName());
        assertEquals(12L, list.get(0).getTotalSold());
        assertEquals(BigDecimal.valueOf(360000000), list.get(0).getTotalRevenue());
    }

    @Test
    @DisplayName("getTopProducts: fallback to active products when no orders exist")
    void testGetTopProductsFallback() {
        when(orderItemRepository.findTopSellingProducts(any(Pageable.class))).thenReturn(Collections.emptyList());

        Category cat = Category.builder().id(1L).name("Laptop").build();
        Product p = Product.builder()
                .id(1L)
                .name("MacBook Air M3")
                .price(BigDecimal.valueOf(28000000))
                .category(cat)
                .imageUrl("https://mac.jpg")
                .build();

        when(productRepository.findByStatusAndIsDeletedFalse(eq("ACTIVE"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(p)));

        List<TopProductResponse> list = dashboardService.getTopProducts(10);

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals("MacBook Air M3", list.get(0).getProductName());
        assertEquals(0L, list.get(0).getTotalSold());
    }

    @Test
    @DisplayName("getLowStockAlerts: returns product variants below threshold")
    void testGetLowStockAlerts() {
        Product p = Product.builder()
                .id(5L)
                .name("Samsung Galaxy S24 Ultra")
                .imageUrl("https://samsung.jpg")
                .category(Category.builder().name("Điện thoại").build())
                .build();

        ProductVariant pv = ProductVariant.builder()
                .id(12L)
                .product(p)
                .sku("SS-S24U-512GB")
                .stock(3)
                .price(BigDecimal.valueOf(31000000))
                .build();

        when(productVariantRepository.findLowStockVariants(10)).thenReturn(List.of(pv));

        List<LowStockAlertResponse> alerts = dashboardService.getLowStockAlerts(10);

        assertNotNull(alerts);
        assertEquals(1, alerts.size());
        assertEquals(12L, alerts.get(0).getVariantId());
        assertEquals(3, alerts.get(0).getCurrentStock());
        assertEquals(10, alerts.get(0).getThreshold());
        assertEquals("SS-S24U-512GB", alerts.get(0).getSku());
    }

    @Test
    @DisplayName("getDashboardStats: returns basic summary map")
    void testGetDashboardStats() {
        when(productRepository.countActiveProducts()).thenReturn(120L);
        when(orderRepository.count()).thenReturn(350L);
        when(userRepository.countByRole(Role.CUSTOMER)).thenReturn(80L);
        when(orderRepository.calculateTotalRevenue()).thenReturn(BigDecimal.valueOf(500000000));

        Map<String, Object> stats = dashboardService.getDashboardStats();

        assertNotNull(stats);
        assertEquals(120L, stats.get("totalProducts"));
        assertEquals(350L, stats.get("totalOrders"));
        assertEquals(80L, stats.get("totalCustomers"));
        assertEquals(500000000L, stats.get("totalRevenueRaw"));
        assertTrue(stats.get("totalRevenueFormatted").toString().contains("500.000.000"));
    }
}
