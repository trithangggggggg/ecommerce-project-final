package ra.project.server.controller;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.model.dto.response.AdminUserResponse;
import ra.project.server.model.dto.response.RevenueTimelineResponse;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.ProductVariant;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductVariantRepository;
import ra.project.server.service.DashboardService;
import ra.project.server.service.UserService;
import ra.project.server.util.ExcelExporter;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Controller phụ trách xuất báo cáo dữ liệu lớn ra file Excel (.xlsx) chuẩn doanh nghiệp.
 * Sử dụng Apache POI SXSSFWorkbook chống tràn bộ nhớ RAM (OOM).
 */
@RestController
@RequestMapping("/api/admin/export")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminExportController {

    private final ExcelExporter excelExporter;
    private final OrderRepository orderRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserService userService;
    private final DashboardService dashboardService;

    private static final String EXCEL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /**
     * GET /api/admin/export/orders
     * Xuất danh sách đơn hàng theo trạng thái hoặc khoảng thời gian
     */
    @GetMapping("/orders")
    public void exportOrders(
            @RequestParam(name = "status", required = false) OrderStatus status,
            @RequestParam(name = "fromDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(name = "toDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            HttpServletResponse response
    ) throws IOException {
        log.info("Admin export orders request: status={}, fromDate={}, toDate={}", status, fromDate, toDate);

        LocalDateTime start = fromDate != null ? fromDate.atStartOfDay() : null;
        LocalDateTime end = toDate != null ? toDate.atTime(LocalTime.MAX) : null;

        List<Order> orders = orderRepository.findOrdersForExport(status, start, end);

        String filename = "Bao_Cao_Don_Hang_" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".xlsx";
        setDownloadResponseHeaders(response, filename);

        excelExporter.exportOrders(orders, response.getOutputStream());
    }

    /**
     * GET /api/admin/export/inventory
     * Xuất danh sách tồn kho / sản phẩm (có thể lọc theo sản phẩm sắp hết hàng)
     */
    @GetMapping("/inventory")
    public void exportInventory(
            @RequestParam(name = "lowStockOnly", defaultValue = "false") boolean lowStockOnly,
            @RequestParam(name = "threshold", defaultValue = "10") int threshold,
            HttpServletResponse response
    ) throws IOException {
        log.info("Admin export inventory request: lowStockOnly={}, threshold={}", lowStockOnly, threshold);

        List<ProductVariant> variants;
        if (lowStockOnly) {
            variants = productVariantRepository.findLowStockVariants(threshold);
        } else {
            variants = productVariantRepository.findAllActiveWithProduct();
        }

        String filename = "Bao_Cao_Ton_Kho_" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".xlsx";
        setDownloadResponseHeaders(response, filename);

        excelExporter.exportInventory(variants, response.getOutputStream());
    }

    /**
     * GET /api/admin/export/customers
     * Xuất danh sách khách hàng CRM (kèm lịch sử chi tiêu, số đơn đã mua)
     */
    @GetMapping("/customers")
    public void exportCustomers(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "status", required = false) Boolean status,
            HttpServletResponse response
    ) throws IOException {
        log.info("Admin export customers request: keyword={}, status={}", keyword, status);

        List<AdminUserResponse> customers = userService.getAllUsers(keyword, status).getData();
        if (customers == null) {
            customers = List.of();
        }

        String filename = "Bao_Cao_Khach_Hang_" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".xlsx";
        setDownloadResponseHeaders(response, filename);

        excelExporter.exportCustomers(customers, response.getOutputStream());
    }

    /**
     * GET /api/admin/export/revenue
     * Xuất báo cáo doanh thu tài chính theo timeline (7days, 30days, month, year)
     */
    @GetMapping("/revenue")
    public void exportRevenue(
            @RequestParam(name = "range", defaultValue = "month") String range,
            HttpServletResponse response
    ) throws IOException {
        log.info("Admin export revenue request: range={}", range);

        RevenueTimelineResponse revenueData = dashboardService.getRevenueTimeline(range);

        String filename = "Bao_Cao_Doanh_Thu_" + range + "_" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".xlsx";
        setDownloadResponseHeaders(response, filename);

        excelExporter.exportRevenue(revenueData, response.getOutputStream());
    }

    // =========================================================================
    // HELPER: Cấu hình Headers HTTP cho Download File Excel
    // =========================================================================

    private void setDownloadResponseHeaders(HttpServletResponse response, String filename) {
        response.setContentType(EXCEL_CONTENT_TYPE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());

        // Header Content-Disposition tương thích đa nền tảng trình duyệt (Chrome, Firefox, Safari, Edge)
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename);
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
    }
}

