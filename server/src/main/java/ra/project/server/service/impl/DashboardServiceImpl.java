package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ra.project.server.model.dto.response.*;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.ProductVariant;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.*;
import ra.project.server.service.DashboardService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public RevenueTimelineResponse getRevenueTimeline(String range) {
        String normalizedRange = StringUtils.hasText(range) ? range.trim().toLowerCase() : "7days";
        LocalDate today = LocalDate.now();

        if ("year".equals(normalizedRange)) {
            return buildYearTimeline(today);
        } else if ("month".equals(normalizedRange)) {
            LocalDate start = today.withDayOfMonth(1);
            LocalDate end = today.with(TemporalAdjusters.lastDayOfMonth());
            return buildDailyTimeline(start, end, "month");
        } else if ("30days".equals(normalizedRange)) {
            LocalDate start = today.minusDays(29);
            return buildDailyTimeline(start, today, "30days");
        } else {
            // default 7days
            LocalDate start = today.minusDays(6);
            return buildDailyTimeline(start, today, "7days");
        }
    }

    private RevenueTimelineResponse buildDailyTimeline(LocalDate startDate, LocalDate endDate, String rangeKey) {
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);

        List<Order> orders = orderRepository.findActiveOrdersBetween(startDateTime, endDateTime);

        // Gom nhóm theo LocalDate
        Map<LocalDate, List<Order>> ordersByDate = orders.stream()
                .filter(o -> o.getCreatedAt() != null)
                .collect(Collectors.groupingBy(o -> o.getCreatedAt().toLocalDate()));

        DateTimeFormatter labelFormatter = DateTimeFormatter.ofPattern("dd/MM");
        DateTimeFormatter isoFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        List<TimelineItemResponse> timeline = new ArrayList<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalOrders = 0L;

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            List<Order> dayOrders = ordersByDate.getOrDefault(date, Collections.emptyList());
            BigDecimal dayRevenue = dayOrders.stream()
                    .map(Order::getTotalAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long dayOrderCount = dayOrders.size();

            totalRevenue = totalRevenue.add(dayRevenue);
            totalOrders += dayOrderCount;

            timeline.add(TimelineItemResponse.builder()
                    .date(date.format(isoFormatter))
                    .label(date.format(labelFormatter))
                    .revenue(dayRevenue)
                    .orderCount(dayOrderCount)
                    .build());
        }

        BigDecimal aov = totalOrders > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalOrders), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return RevenueTimelineResponse.builder()
                .range(rangeKey)
                .totalRevenue(totalRevenue)
                .totalOrders(totalOrders)
                .averageOrderValue(aov)
                .timeline(timeline)
                .build();
    }

    private RevenueTimelineResponse buildYearTimeline(LocalDate today) {
        int currentYear = today.getYear();
        LocalDate startOfYear = LocalDate.of(currentYear, 1, 1);
        LocalDate endOfYear = LocalDate.of(currentYear, 12, 31);

        LocalDateTime startDateTime = startOfYear.atStartOfDay();
        LocalDateTime endDateTime = endOfYear.atTime(LocalTime.MAX);

        List<Order> orders = orderRepository.findActiveOrdersBetween(startDateTime, endDateTime);

        Map<YearMonth, List<Order>> ordersByMonth = orders.stream()
                .filter(o -> o.getCreatedAt() != null)
                .collect(Collectors.groupingBy(o -> YearMonth.from(o.getCreatedAt())));

        List<TimelineItemResponse> timeline = new ArrayList<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalOrders = 0L;

        for (int month = 1; month <= 12; month++) {
            YearMonth ym = YearMonth.of(currentYear, month);
            List<Order> monthOrders = ordersByMonth.getOrDefault(ym, Collections.emptyList());

            BigDecimal monthRevenue = monthOrders.stream()
                    .map(Order::getTotalAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long monthOrderCount = monthOrders.size();

            totalRevenue = totalRevenue.add(monthRevenue);
            totalOrders += monthOrderCount;

            timeline.add(TimelineItemResponse.builder()
                    .date(ym.toString())
                    .label("T" + month)
                    .revenue(monthRevenue)
                    .orderCount(monthOrderCount)
                    .build());
        }

        BigDecimal aov = totalOrders > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalOrders), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return RevenueTimelineResponse.builder()
                .range("year")
                .totalRevenue(totalRevenue)
                .totalOrders(totalOrders)
                .averageOrderValue(aov)
                .timeline(timeline)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public KpiSummaryResponse getKpiSummary() {
        YearMonth currentYm = YearMonth.now();
        YearMonth prevYm = currentYm.minusMonths(1);

        LocalDateTime startOfCurrent = currentYm.atDay(1).atStartOfDay();
        LocalDateTime endOfCurrent = currentYm.atEndOfMonth().atTime(LocalTime.MAX);

        LocalDateTime startOfPrev = prevYm.atDay(1).atStartOfDay();
        LocalDateTime endOfPrev = prevYm.atEndOfMonth().atTime(LocalTime.MAX);

        // 1. Doanh thu
        BigDecimal currentMonthRevenue = orderRepository.sumRevenueBetween(startOfCurrent, endOfCurrent);
        if (currentMonthRevenue == null) currentMonthRevenue = BigDecimal.ZERO;

        BigDecimal previousMonthRevenue = orderRepository.sumRevenueBetween(startOfPrev, endOfPrev);
        if (previousMonthRevenue == null) previousMonthRevenue = BigDecimal.ZERO;

        Double revenueGrowthRate = calculateGrowthRate(currentMonthRevenue.doubleValue(), previousMonthRevenue.doubleValue());

        // 2. Tổng đơn
        long currentMonthOrders = orderRepository.countOrdersBetween(startOfCurrent, endOfCurrent);
        long previousMonthOrders = orderRepository.countOrdersBetween(startOfPrev, endOfPrev);
        Double orderGrowthRate = calculateGrowthRate(currentMonthOrders, previousMonthOrders);

        // 3. Khách hàng mới
        long currentMonthNewCustomers = userRepository.countByRoleAndCreatedAtBetween(Role.CUSTOMER, startOfCurrent, endOfCurrent);
        long previousMonthNewCustomers = userRepository.countByRoleAndCreatedAtBetween(Role.CUSTOMER, startOfPrev, endOfPrev);
        Double customerGrowthRate = calculateGrowthRate(currentMonthNewCustomers, previousMonthNewCustomers);

        // 4. Chi tiết bổ sung
        long completedOrders = orderRepository.countOrdersByStatusBetween(OrderStatus.COMPLETED, startOfCurrent, endOfCurrent);
        long cancelledOrders = orderRepository.countOrdersByStatusBetween(OrderStatus.CANCELLED, startOfCurrent, endOfCurrent);

        Double completionRate = currentMonthOrders > 0
                ? Math.round(((double) completedOrders / currentMonthOrders * 100.0) * 10.0) / 10.0
                : 0.0;

        long activeMonthOrders = Math.max(0L, currentMonthOrders - cancelledOrders);
        BigDecimal currentMonthAov = activeMonthOrders > 0
                ? currentMonthRevenue.divide(BigDecimal.valueOf(activeMonthOrders), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return KpiSummaryResponse.builder()
                .currentMonthRevenue(currentMonthRevenue)
                .previousMonthRevenue(previousMonthRevenue)
                .revenueGrowthRate(revenueGrowthRate)
                .currentMonthOrders(currentMonthOrders)
                .previousMonthOrders(previousMonthOrders)
                .orderGrowthRate(orderGrowthRate)
                .currentMonthNewCustomers(currentMonthNewCustomers)
                .previousMonthNewCustomers(previousMonthNewCustomers)
                .customerGrowthRate(customerGrowthRate)
                .completedOrders(completedOrders)
                .cancelledOrders(cancelledOrders)
                .completionRate(completionRate)
                .currentMonthAov(currentMonthAov)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TopProductResponse> getTopProducts(int limit) {
        int targetLimit = Math.max(1, Math.min(limit, 50));
        Pageable pageable = PageRequest.of(0, targetLimit);

        List<Object[]> rawList = orderItemRepository.findTopSellingProducts(pageable);
        List<TopProductResponse> result = new ArrayList<>();

        if (rawList != null && !rawList.isEmpty()) {
            for (Object[] row : rawList) {
                Long productId = row[0] instanceof Number ? ((Number) row[0]).longValue() : null;
                String productName = row[1] != null ? row[1].toString() : "Sản phẩm";
                Long totalSold = row[2] instanceof Number ? ((Number) row[2]).longValue() : 0L;

                BigDecimal totalRevenue = BigDecimal.ZERO;
                if (row[3] instanceof BigDecimal) {
                    totalRevenue = (BigDecimal) row[3];
                } else if (row[3] instanceof Number) {
                    totalRevenue = BigDecimal.valueOf(((Number) row[3]).doubleValue());
                }

                String imageUrl = row[4] != null ? row[4].toString() : null;
                String categoryName = row[5] != null ? row[5].toString() : "Khác";

                BigDecimal price = BigDecimal.ZERO;
                if (row[6] instanceof BigDecimal) {
                    price = (BigDecimal) row[6];
                } else if (row[6] instanceof Number) {
                    price = BigDecimal.valueOf(((Number) row[6]).doubleValue());
                }

                result.add(TopProductResponse.builder()
                        .productId(productId)
                        .productName(productName)
                        .imageUrl(imageUrl)
                        .categoryName(categoryName)
                        .price(price)
                        .totalSold(totalSold)
                        .totalRevenue(totalRevenue)
                        .build());
            }
        } else {
            // Fallback: Nếu hệ thống chưa có đơn hàng nào, lấy các sản phẩm đang active để hiển thị
            List<Product> products = productRepository.findByStatusAndIsDeletedFalse("ACTIVE", PageRequest.of(0, targetLimit)).getContent();
            for (Product p : products) {
                result.add(TopProductResponse.builder()
                        .productId(p.getId())
                        .productName(p.getName())
                        .imageUrl(p.getImageUrl())
                        .categoryName(p.getCategory() != null ? p.getCategory().getName() : "Công nghệ")
                        .price(p.getPrice())
                        .totalSold(0L)
                        .totalRevenue(BigDecimal.ZERO)
                        .build());
            }
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LowStockAlertResponse> getLowStockAlerts(int threshold) {
        int targetThreshold = threshold <= 0 ? 10 : threshold;
        List<ProductVariant> lowVariants = productVariantRepository.findLowStockVariants(targetThreshold);

        List<LowStockAlertResponse> alerts = new ArrayList<>();
        for (ProductVariant pv : lowVariants) {
            Product product = pv.getProduct();
            String imageUrl = StringUtils.hasText(pv.getImageUrl()) ? pv.getImageUrl() : product.getImageUrl();
            String categoryName = product.getCategory() != null ? product.getCategory().getName() : "Khác";

            alerts.add(LowStockAlertResponse.builder()
                    .variantId(pv.getId())
                    .productId(product.getId())
                    .productName(product.getName())
                    .variantName(StringUtils.hasText(pv.getSku()) ? pv.getSku() : "Biến thể #" + pv.getId())
                    .sku(pv.getSku())
                    .currentStock(pv.getStock())
                    .threshold(targetThreshold)
                    .price(pv.getPrice())
                    .imageUrl(imageUrl)
                    .categoryName(categoryName)
                    .build());
        }

        return alerts;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        long totalProducts = productRepository.countActiveProducts();
        long totalOrders = orderRepository.count();
        long totalCustomers = userRepository.countByRole(Role.CUSTOMER);

        BigDecimal revenueRaw = orderRepository.calculateTotalRevenue();
        if (revenueRaw == null) {
            revenueRaw = BigDecimal.ZERO;
        }
        long revenueLong = revenueRaw.longValue();
        String formattedRevenue = String.format("%,d ₫", revenueLong).replace(',', '.');

        stats.put("totalProducts", totalProducts);
        stats.put("totalOrders", totalOrders);
        stats.put("totalCustomers", totalCustomers);
        stats.put("totalRevenueRaw", revenueLong);
        stats.put("totalRevenueFormatted", formattedRevenue);

        return stats;
    }

    private double calculateGrowthRate(double current, double previous) {
        if (previous == 0.0) {
            return current > 0.0 ? 100.0 : 0.0;
        }
        double rate = ((current - previous) / previous) * 100.0;
        return Math.round(rate * 10.0) / 10.0;
    }
}

