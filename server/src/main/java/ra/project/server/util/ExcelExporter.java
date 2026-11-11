package ra.project.server.util;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.DefaultIndexedColorMap;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.springframework.stereotype.Component;
import ra.project.server.model.dto.response.AdminUserResponse;
import ra.project.server.model.dto.response.RevenueTimelineResponse;
import ra.project.server.model.dto.response.TimelineItemResponse;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.ProductOptionValue;
import ra.project.server.model.entity.ProductVariant;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Tiện ích xuất dữ liệu lớn ra file Excel (.xlsx) chuẩn doanh nghiệp.
 * Sử dụng SXSSFWorkbook (Streaming mode với window 100 rows) chống tràn bộ nhớ RAM (OOM).
 * Header màu thương hiệu #1E40AF, font chữ Unicode không lỗi tiếng Việt, định dạng số tiền VND và ngày tháng chuẩn.
 */
@Component
@Slf4j
public class ExcelExporter {

    private static final byte[] BRAND_COLOR_RGB = new byte[]{(byte) 30, (byte) 64, (byte) 175}; // #1E40AF
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Xuất danh sách Đơn hàng (Orders) ra luồng OutputStream
     */
    public void exportOrders(List<Order> orders, OutputStream outputStream) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            workbook.setCompressTempFiles(true);
            ExcelStyles styles = createStyles(workbook);

            SXSSFSheet sheet = workbook.createSheet("Danh Sách Đơn Hàng");
            sheet.trackAllColumnsForAutoSizing();

            // 1. Tiêu đề báo cáo
            createReportHeader(sheet, styles, "BÁO CÁO CHI TIẾT ĐƠN HÀNG HỆ THỐNG", 12);

            // 2. Dòng Header cột
            String[] headers = {
                    "STT", "Mã đơn hàng", "Ngày đặt", "Khách hàng", "Số điện thoại",
                    "Địa chỉ giao hàng", "Đơn vị vận chuyển", "Phương thức TT",
                    "Trạng thái", "Phí vận chuyển", "Giảm giá Voucher", "Tổng tiền thanh toán"
            };

            Row headerRow = sheet.createRow(3);
            headerRow.setHeightInPoints(28);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(styles.headerStyle);
            }

            // 3. Đổ dữ liệu các dòng
            int rowIdx = 4;
            int stt = 1;
            BigDecimal totalRevenue = BigDecimal.ZERO;
            BigDecimal totalShipping = BigDecimal.ZERO;
            BigDecimal totalDiscount = BigDecimal.ZERO;

            for (Order order : orders) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);

                // STT
                createCell(row, 0, stt++, styles.textCenterStyle);

                // Mã đơn hàng
                createCell(row, 1, "#ORD-" + order.getId(), styles.textCenterStyle);

                // Ngày đặt
                createCell(row, 2, order.getCreatedAt() != null ? order.getCreatedAt().format(DATE_TIME_FORMATTER) : "—", styles.textCenterStyle);

                // Khách hàng
                String customerName = order.getReceiverName();
                if ((customerName == null || customerName.isBlank()) && order.getUser() != null) {
                    customerName = order.getUser().getFullName() != null ? order.getUser().getFullName() : order.getUser().getUsername();
                }
                createCell(row, 3, customerName != null ? customerName : "Khách lẻ", styles.textStyle);

                // Số điện thoại
                createCell(row, 4, order.getPhoneNumber() != null ? order.getPhoneNumber() : "—", styles.textCenterStyle);

                // Địa chỉ giao hàng
                createCell(row, 5, order.getShippingAddress() != null ? order.getShippingAddress() : "—", styles.textStyle);

                // Đơn vị vận chuyển
                String carrierName = order.getShippingCarrier() != null ? order.getShippingCarrier().getName() : "Mặc định";
                createCell(row, 6, carrierName, styles.textStyle);

                // Phương thức thanh toán
                createCell(row, 7, formatPaymentMethod(order.getPaymentMethod()), styles.textCenterStyle);

                // Trạng thái đơn hàng
                createCell(row, 8, formatOrderStatus(order.getStatus()), styles.textCenterStyle);

                // Phí vận chuyển
                BigDecimal shippingFee = order.getShippingFee() != null ? order.getShippingFee() : BigDecimal.ZERO;
                totalShipping = totalShipping.add(shippingFee);
                createNumericCell(row, 9, shippingFee.doubleValue(), styles.currencyStyle);

                // Giảm giá Voucher
                BigDecimal discount = order.getDiscountAmount() != null ? order.getDiscountAmount() : BigDecimal.ZERO;
                totalDiscount = totalDiscount.add(discount);
                createNumericCell(row, 10, discount.doubleValue(), styles.currencyStyle);

                // Tổng tiền thanh toán
                BigDecimal totalAmount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
                if (order.getStatus() != OrderStatus.CANCELLED) {
                    totalRevenue = totalRevenue.add(totalAmount);
                }
                createNumericCell(row, 11, totalAmount.doubleValue(), styles.currencyStyle);
            }

            // 4. Dòng tổng cộng (TOTAL)
            Row totalRow = sheet.createRow(rowIdx);
            totalRow.setHeightInPoints(26);
            Cell totalLabelCell = totalRow.createCell(0);
            totalLabelCell.setCellValue("TỔNG CỘNG (" + orders.size() + " ĐƠN HÀNG)");
            totalLabelCell.setCellStyle(styles.totalLabelStyle);

            for (int c = 1; c <= 8; c++) {
                Cell emptyCell = totalRow.createCell(c);
                emptyCell.setCellStyle(styles.totalLabelStyle);
            }

            createNumericCell(totalRow, 9, totalShipping.doubleValue(), styles.totalCurrencyStyle);
            createNumericCell(totalRow, 10, totalDiscount.doubleValue(), styles.totalCurrencyStyle);
            createNumericCell(totalRow, 11, totalRevenue.doubleValue(), styles.totalCurrencyStyle);

            // Tự động căn chỉnh độ rộng cột
            autoSizeColumns(sheet, headers.length);

            // Ghi ra luồng
            workbook.write(outputStream);
            outputStream.flush();
            workbook.dispose();
        }
    }

    /**
     * Xuất danh sách Tồn kho / Sản phẩm (Inventory) ra luồng OutputStream
     */
    public void exportInventory(List<ProductVariant> variants, OutputStream outputStream) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            workbook.setCompressTempFiles(true);
            ExcelStyles styles = createStyles(workbook);

            SXSSFSheet sheet = workbook.createSheet("Báo Cáo Tồn Kho");
            sheet.trackAllColumnsForAutoSizing();

            // 1. Tiêu đề báo cáo
            createReportHeader(sheet, styles, "BÁO CÁO QUẢN LÝ TỒN KHO & SẢN PHẨM", 10);

            // 2. Dòng Header cột
            String[] headers = {
                    "STT", "Mã SKU", "Tên sản phẩm", "Phân loại / Biến thể",
                    "Danh mục", "Giá niêm yết (Gốc)", "Giá bán hiện tại",
                    "Số lượng tồn kho", "Tình trạng tồn", "Trạng thái bán"
            };

            Row headerRow = sheet.createRow(3);
            headerRow.setHeightInPoints(28);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(styles.headerStyle);
            }

            // 3. Đổ dữ liệu
            int rowIdx = 4;
            int stt = 1;
            long totalStock = 0;

            for (ProductVariant pv : variants) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);

                createCell(row, 0, stt++, styles.textCenterStyle);
                createCell(row, 1, pv.getSku() != null ? pv.getSku() : "—", styles.textCenterStyle);
                createCell(row, 2, pv.getProduct() != null ? pv.getProduct().getName() : "—", styles.textStyle);

                // Option values (Màu sắc, Dung lượng...)
                String variantDesc = "Mặc định";
                if (pv.getOptionValues() != null && !pv.getOptionValues().isEmpty()) {
                    variantDesc = pv.getOptionValues().stream()
                            .map(ProductOptionValue::getValue)
                            .collect(Collectors.joining(" / "));
                }
                createCell(row, 3, variantDesc, styles.textStyle);

                // Danh mục
                String catName = (pv.getProduct() != null && pv.getProduct().getCategory() != null)
                        ? pv.getProduct().getCategory().getName() : "Chưa phân loại";
                createCell(row, 4, catName, styles.textStyle);

                // Giá gốc
                double originalPrice = pv.getOriginalPrice() != null ? pv.getOriginalPrice().doubleValue() : 0.0;
                createNumericCell(row, 5, originalPrice, styles.currencyStyle);

                // Giá bán
                double price = pv.getPrice() != null ? pv.getPrice().doubleValue() : 0.0;
                createNumericCell(row, 6, price, styles.currencyStyle);

                // Số lượng tồn
                int stock = pv.getStock() != null ? pv.getStock() : 0;
                totalStock += stock;
                createNumericCell(row, 7, stock, styles.numberStyle);

                // Tình trạng tồn
                String stockStatus;
                if (stock <= 0) {
                    stockStatus = "Hết hàng";
                } else if (stock <= 10) {
                    stockStatus = "Sắp hết hàng";
                } else {
                    stockStatus = "Còn hàng";
                }
                createCell(row, 8, stockStatus, styles.textCenterStyle);

                // Trạng thái kinh doanh
                boolean isSelling = Boolean.TRUE.equals(pv.getStatus());
                createCell(row, 9, isSelling ? "Đang bán" : "Ngừng bán", styles.textCenterStyle);
            }

            // 4. Dòng tổng cộng
            Row totalRow = sheet.createRow(rowIdx);
            totalRow.setHeightInPoints(26);
            Cell totalLabelCell = totalRow.createCell(0);
            totalLabelCell.setCellValue("TỔNG CỘNG (" + variants.size() + " PHÂN LOẠI SẢN PHẨM)");
            totalLabelCell.setCellStyle(styles.totalLabelStyle);

            for (int c = 1; c <= 6; c++) {
                Cell emptyCell = totalRow.createCell(c);
                emptyCell.setCellStyle(styles.totalLabelStyle);
            }

            createNumericCell(totalRow, 7, totalStock, styles.totalNumberStyle);

            Cell tail1 = totalRow.createCell(8);
            tail1.setCellStyle(styles.totalLabelStyle);
            Cell tail2 = totalRow.createCell(9);
            tail2.setCellStyle(styles.totalLabelStyle);

            autoSizeColumns(sheet, headers.length);

            workbook.write(outputStream);
            outputStream.flush();
            workbook.dispose();
        }
    }

    /**
     * Xuất danh sách Khách hàng (Customers) ra luồng OutputStream
     */
    public void exportCustomers(List<AdminUserResponse> customers, OutputStream outputStream) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            workbook.setCompressTempFiles(true);
            ExcelStyles styles = createStyles(workbook);

            SXSSFSheet sheet = workbook.createSheet("Danh Sách Khách Hàng");
            sheet.trackAllColumnsForAutoSizing();

            createReportHeader(sheet, styles, "BÁO CÁO QUẢN LÝ DỮ LIỆU KHÁCH HÀNG (CRM)", 11);

            String[] headers = {
                    "STT", "ID", "Tên đăng nhập", "Họ và tên", "Email",
                    "Số điện thoại", "Địa chỉ", "Số đơn đã mua",
                    "Tổng chi tiêu lũy kế", "Trạng thái", "Ngày tham gia"
            };

            Row headerRow = sheet.createRow(3);
            headerRow.setHeightInPoints(28);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(styles.headerStyle);
            }

            int rowIdx = 4;
            int stt = 1;
            long totalOrdersCount = 0;
            BigDecimal totalSpending = BigDecimal.ZERO;

            for (AdminUserResponse u : customers) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);

                createCell(row, 0, stt++, styles.textCenterStyle);
                createCell(row, 1, u.getId() != null ? String.valueOf(u.getId()) : "—", styles.textCenterStyle);
                createCell(row, 2, u.getUsername() != null ? u.getUsername() : "—", styles.textStyle);
                createCell(row, 3, u.getFullName() != null ? u.getFullName() : "—", styles.textStyle);
                createCell(row, 4, u.getEmail() != null ? u.getEmail() : "—", styles.textStyle);
                createCell(row, 5, u.getPhoneNumber() != null ? u.getPhoneNumber() : "—", styles.textCenterStyle);
                createCell(row, 6, u.getAddress() != null ? u.getAddress() : "—", styles.textStyle);

                int orderCount = u.getOrdersCount() != null ? u.getOrdersCount() : 0;
                totalOrdersCount += orderCount;
                createNumericCell(row, 7, orderCount, styles.numberStyle);

                BigDecimal spent = u.getTotalSpent() != null ? u.getTotalSpent() : BigDecimal.ZERO;
                totalSpending = totalSpending.add(spent);
                createNumericCell(row, 8, spent.doubleValue(), styles.currencyStyle);

                boolean isActive = Boolean.TRUE.equals(u.getStatus());
                createCell(row, 9, isActive ? "Hoạt động" : "Đã khóa", styles.textCenterStyle);

                createCell(row, 10, u.getCreatedAt() != null ? u.getCreatedAt().format(DATE_FORMATTER) : "—", styles.textCenterStyle);
            }

            // Dòng tổng cộng
            Row totalRow = sheet.createRow(rowIdx);
            totalRow.setHeightInPoints(26);
            Cell totalLabelCell = totalRow.createCell(0);
            totalLabelCell.setCellValue("TỔNG CỘNG (" + customers.size() + " KHÁCH HÀNG)");
            totalLabelCell.setCellStyle(styles.totalLabelStyle);

            for (int c = 1; c <= 6; c++) {
                Cell emptyCell = totalRow.createCell(c);
                emptyCell.setCellStyle(styles.totalLabelStyle);
            }

            createNumericCell(totalRow, 7, totalOrdersCount, styles.totalNumberStyle);
            createNumericCell(totalRow, 8, totalSpending.doubleValue(), styles.totalCurrencyStyle);

            Cell tail1 = totalRow.createCell(9);
            tail1.setCellStyle(styles.totalLabelStyle);
            Cell tail2 = totalRow.createCell(10);
            tail2.setCellStyle(styles.totalLabelStyle);

            autoSizeColumns(sheet, headers.length);

            workbook.write(outputStream);
            outputStream.flush();
            workbook.dispose();
        }
    }

    /**
     * Xuất Báo cáo Doanh thu (Revenue) theo timeline ra luồng OutputStream
     */
    public void exportRevenue(RevenueTimelineResponse revenueData, OutputStream outputStream) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            workbook.setCompressTempFiles(true);
            ExcelStyles styles = createStyles(workbook);

            SXSSFSheet sheet = workbook.createSheet("Báo Cáo Doanh Thu");
            sheet.trackAllColumnsForAutoSizing();

            String timeRangeTitle = switch (revenueData.getRange() != null ? revenueData.getRange().toLowerCase() : "") {
                case "year" -> "DOANH THU THEO NĂM NÀY";
                case "month" -> "DOANH THU THEO THÁNG NÀY";
                case "30days" -> "DOANH THU 30 NGÀY QUA";
                default -> "DOANH THU 7 NGÀY GẦN NHẤT";
            };

            createReportHeader(sheet, styles, "BÁO CÁO PHÂN TÍCH DOANH THU HỆ THỐNG (" + timeRangeTitle + ")", 5);

            String[] headers = {
                    "STT", "Mốc thời gian", "Số lượng đơn hoàn tất", "Doanh thu phát sinh (VND)", "Tỷ trọng doanh thu"
            };

            Row headerRow = sheet.createRow(3);
            headerRow.setHeightInPoints(28);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(styles.headerStyle);
            }

            int rowIdx = 4;
            int stt = 1;
            List<TimelineItemResponse> items = revenueData.getTimeline() != null ? revenueData.getTimeline() : List.of();
            BigDecimal totalRev = revenueData.getTotalRevenue() != null ? revenueData.getTotalRevenue() : BigDecimal.ZERO;
            long totalOrders = revenueData.getTotalOrders() != null ? revenueData.getTotalOrders() : 0;

            for (TimelineItemResponse item : items) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);

                createCell(row, 0, stt++, styles.textCenterStyle);
                createCell(row, 1, item.getLabel() != null ? item.getLabel() : item.getDate(), styles.textCenterStyle);

                long orders = item.getOrderCount() != null ? item.getOrderCount() : 0;
                createNumericCell(row, 2, orders, styles.numberStyle);

                BigDecimal rev = item.getRevenue() != null ? item.getRevenue() : BigDecimal.ZERO;
                createNumericCell(row, 3, rev.doubleValue(), styles.currencyStyle);

                // Tỷ trọng %
                double percentage = 0.0;
                if (totalRev.compareTo(BigDecimal.ZERO) > 0 && rev.compareTo(BigDecimal.ZERO) > 0) {
                    percentage = rev.doubleValue() / totalRev.doubleValue();
                }
                Cell pctCell = row.createCell(4);
                pctCell.setCellValue(percentage);
                pctCell.setCellStyle(styles.percentStyle);
            }

            // Dòng tổng cộng
            Row totalRow = sheet.createRow(rowIdx);
            totalRow.setHeightInPoints(26);

            Cell totalLabelCell = totalRow.createCell(0);
            totalLabelCell.setCellValue("TỔNG CỘNG TOÀN KỲ");
            totalLabelCell.setCellStyle(styles.totalLabelStyle);

            Cell emptyCell = totalRow.createCell(1);
            emptyCell.setCellStyle(styles.totalLabelStyle);

            createNumericCell(totalRow, 2, totalOrders, styles.totalNumberStyle);
            createNumericCell(totalRow, 3, totalRev.doubleValue(), styles.totalCurrencyStyle);

            Cell totalPctCell = totalRow.createCell(4);
            totalPctCell.setCellValue(1.0);
            totalPctCell.setCellStyle(styles.totalPercentStyle);

            autoSizeColumns(sheet, headers.length);

            workbook.write(outputStream);
            outputStream.flush();
            workbook.dispose();
        }
    }

    // =========================================================================
    // HELPER METHODS: TẠO CELL & CELL STYLES
    // =========================================================================

    private void createCell(Row row, int col, Object value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value.toString() : "");
        cell.setCellStyle(style);
    }

    private void createNumericCell(Row row, int col, double value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void createReportHeader(SXSSFSheet sheet, ExcelStyles styles, String reportTitle, int totalCols) {
        Row titleRow = sheet.createRow(0);
        titleRow.setHeightInPoints(26);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue(reportTitle);
        titleCell.setCellStyle(styles.titleStyle);

        Row dateRow = sheet.createRow(1);
        dateRow.setHeightInPoints(18);
        Cell dateCell = dateRow.createCell(0);
        dateCell.setCellValue("Thời gian xuất báo cáo: " + LocalDateTime.now().format(DATE_TIME_FORMATTER) + " | Hệ thống thương mại điện tử NEXOR");
        dateCell.setCellStyle(styles.subTitleStyle);
    }

    private void autoSizeColumns(SXSSFSheet sheet, int columnCount) {
        for (int i = 0; i < columnCount; i++) {
            sheet.autoSizeColumn(i);
            int currentWidth = sheet.getColumnWidth(i);
            int paddedWidth = Math.min(Math.max(currentWidth + 1400, 3600), 22000);
            sheet.setColumnWidth(i, paddedWidth);
        }
    }

    private String formatOrderStatus(OrderStatus status) {
        if (status == null) return "—";
        return switch (status) {
            case PENDING -> "Chờ xác nhận";
            case PROCESSING -> "Đang đóng gói";
            case SHIPPING -> "Đang vận chuyển";
            case COMPLETED -> "Hoàn thành";
            case CANCELLED -> "Đã hủy";
            default -> status.name();
        };
    }

    private String formatPaymentMethod(PaymentMethod method) {
        if (method == null) return "—";
        return switch (method) {
            case COD -> "Thanh toán khi nhận hàng (COD)";
            case VNPAY -> "Cổng VNPAY";
            case MOMO -> "Ví MoMo";
            case ONLINE -> "Thanh toán trực tuyến";
            case BANK_TRANSFER -> "Chuyển khoản";
            default -> method.name();
        };
    }

    private ExcelStyles createStyles(SXSSFWorkbook workbook) {
        DataFormat dataFormat = workbook.createDataFormat();

        // 1. Font chung
        Font baseFont = workbook.createFont();
        baseFont.setFontName("Segoe UI");
        baseFont.setFontHeightInPoints((short) 10);

        Font boldFont = workbook.createFont();
        boldFont.setFontName("Segoe UI");
        boldFont.setFontHeightInPoints((short) 10);
        boldFont.setBold(true);

        Font headerFont = workbook.createFont();
        headerFont.setFontName("Segoe UI");
        headerFont.setFontHeightInPoints((short) 10);
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());

        Font titleFont = workbook.createFont();
        titleFont.setFontName("Segoe UI");
        titleFont.setFontHeightInPoints((short) 14);
        titleFont.setBold(true);
        titleFont.setColor(IndexedColors.DARK_BLUE.getIndex());

        Font subTitleFont = workbook.createFont();
        subTitleFont.setFontName("Segoe UI");
        subTitleFont.setFontHeightInPoints((short) 9);
        subTitleFont.setItalic(true);
        subTitleFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());

        // 2. Title Styles
        CellStyle titleStyle = workbook.createCellStyle();
        titleStyle.setFont(titleFont);
        titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

        CellStyle subTitleStyle = workbook.createCellStyle();
        subTitleStyle.setFont(subTitleFont);
        subTitleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

        // 3. Header Style (#1E40AF)
        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFont(headerFont);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        headerStyle.setWrapText(true);
        setBorders(headerStyle);

        if (headerStyle instanceof XSSFCellStyle xssfStyle) {
            XSSFColor brandColor = new XSSFColor(BRAND_COLOR_RGB, new DefaultIndexedColorMap());
            xssfStyle.setFillForegroundColor(brandColor);
            xssfStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        } else {
            headerStyle.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }

        // 4. Data Styles
        CellStyle textStyle = workbook.createCellStyle();
        textStyle.setFont(baseFont);
        textStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorders(textStyle);

        CellStyle textCenterStyle = workbook.createCellStyle();
        textCenterStyle.setFont(baseFont);
        textCenterStyle.setAlignment(HorizontalAlignment.CENTER);
        textCenterStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorders(textCenterStyle);

        CellStyle currencyStyle = workbook.createCellStyle();
        currencyStyle.setFont(baseFont);
        currencyStyle.setAlignment(HorizontalAlignment.RIGHT);
        currencyStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        currencyStyle.setDataFormat(dataFormat.getFormat("#,##0 \"đ\""));
        setBorders(currencyStyle);

        CellStyle numberStyle = workbook.createCellStyle();
        numberStyle.setFont(baseFont);
        numberStyle.setAlignment(HorizontalAlignment.RIGHT);
        numberStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        numberStyle.setDataFormat(dataFormat.getFormat("#,##0"));
        setBorders(numberStyle);

        CellStyle percentStyle = workbook.createCellStyle();
        percentStyle.setFont(baseFont);
        percentStyle.setAlignment(HorizontalAlignment.RIGHT);
        percentStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        percentStyle.setDataFormat(dataFormat.getFormat("0.0%"));
        setBorders(percentStyle);

        // 5. Total Styles
        CellStyle totalLabelStyle = workbook.createCellStyle();
        totalLabelStyle.setFont(boldFont);
        totalLabelStyle.setAlignment(HorizontalAlignment.LEFT);
        totalLabelStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        setTotalBorders(totalLabelStyle);
        totalLabelStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalLabelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        CellStyle totalCurrencyStyle = workbook.createCellStyle();
        totalCurrencyStyle.setFont(boldFont);
        totalCurrencyStyle.setAlignment(HorizontalAlignment.RIGHT);
        totalCurrencyStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        totalCurrencyStyle.setDataFormat(dataFormat.getFormat("#,##0 \"đ\""));
        setTotalBorders(totalCurrencyStyle);
        totalCurrencyStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalCurrencyStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        CellStyle totalNumberStyle = workbook.createCellStyle();
        totalNumberStyle.setFont(boldFont);
        totalNumberStyle.setAlignment(HorizontalAlignment.RIGHT);
        totalNumberStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        totalNumberStyle.setDataFormat(dataFormat.getFormat("#,##0"));
        setTotalBorders(totalNumberStyle);
        totalNumberStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalNumberStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        CellStyle totalPercentStyle = workbook.createCellStyle();
        totalPercentStyle.setFont(boldFont);
        totalPercentStyle.setAlignment(HorizontalAlignment.RIGHT);
        totalPercentStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        totalPercentStyle.setDataFormat(dataFormat.getFormat("0.0%"));
        setTotalBorders(totalPercentStyle);
        totalPercentStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalPercentStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        return new ExcelStyles(
                titleStyle, subTitleStyle, headerStyle,
                textStyle, textCenterStyle, currencyStyle, numberStyle, percentStyle,
                totalLabelStyle, totalCurrencyStyle, totalNumberStyle, totalPercentStyle
        );
    }

    private void setBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setLeftBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setRightBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
    }

    private void setTotalBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.DOUBLE);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    private record ExcelStyles(
            CellStyle titleStyle,
            CellStyle subTitleStyle,
            CellStyle headerStyle,
            CellStyle textStyle,
            CellStyle textCenterStyle,
            CellStyle currencyStyle,
            CellStyle numberStyle,
            CellStyle percentStyle,
            CellStyle totalLabelStyle,
            CellStyle totalCurrencyStyle,
            CellStyle totalNumberStyle,
            CellStyle totalPercentStyle
    ) {
    }
}
