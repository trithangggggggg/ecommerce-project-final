package ra.project.server.util;

import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import ra.project.server.model.dto.response.AdminUserResponse;
import ra.project.server.model.dto.response.RevenueTimelineResponse;
import ra.project.server.model.dto.response.TimelineItemResponse;
import ra.project.server.model.entity.*;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ExcelExporterTest {

    private ExcelExporter excelExporter;

    @BeforeEach
    void setUp() {
        excelExporter = new ExcelExporter();
    }

    @Test
    @DisplayName("exportOrders creates valid Excel sheet with headers and data")
    void testExportOrders() throws IOException {
        User user = User.builder()
                .id(1L)
                .username("tuanminh")
                .fullName("Nguyễn Tuấn Minh")
                .build();

        Order order = Order.builder()
                .id(101L)
                .user(user)
                .receiverName("Nguyễn Tuấn Minh")
                .phoneNumber("0912345678")
                .shippingAddress("12 Thái Hà, Đống Đa, Hà Nội")
                .shippingFee(new BigDecimal("30000"))
                .discountAmount(new BigDecimal("50000"))
                .totalAmount(new BigDecimal("24990000"))
                .status(OrderStatus.COMPLETED)
                .paymentMethod(PaymentMethod.VNPAY)
                .build();
        order.setCreatedAt(LocalDateTime.now());

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        excelExporter.exportOrders(List.of(order), out);

        byte[] bytes = out.toByteArray();
        assertTrue(bytes.length > 0, "Excel output byte array must not be empty");

        // Verify valid XLSX with Apache POI XSSFWorkbook
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertNotNull(wb.getSheet("Danh Sách Đơn Hàng"));
            assertEquals("BÁO CÁO CHI TIẾT ĐƠN HÀNG HỆ THỐNG", wb.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
            assertEquals("STT", wb.getSheetAt(0).getRow(3).getCell(0).getStringCellValue());
            assertEquals("#ORD-101", wb.getSheetAt(0).getRow(4).getCell(1).getStringCellValue());
            assertEquals("Nguyễn Tuấn Minh", wb.getSheetAt(0).getRow(4).getCell(3).getStringCellValue());
        }
    }

    @Test
    @DisplayName("exportInventory creates valid Excel sheet with stock count")
    void testExportInventory() throws IOException {
        Category category = Category.builder().id(1L).name("Laptop").build();
        Product product = Product.builder().id(10L).name("MacBook Pro M3").category(category).build();

        ProductOptionValue optVal = ProductOptionValue.builder().value("Space Gray / 16GB").build();

        ProductVariant variant = ProductVariant.builder()
                .id(100L)
                .sku("MBP-M3-16GB-SG")
                .product(product)
                .price(new BigDecimal("39990000"))
                .originalPrice(new BigDecimal("42990000"))
                .stock(15)
                .status(true)
                .optionValues(List.of(optVal))
                .build();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        excelExporter.exportInventory(List.of(variant), out);

        byte[] bytes = out.toByteArray();
        assertTrue(bytes.length > 0);

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertNotNull(wb.getSheet("Báo Cáo Tồn Kho"));
            assertEquals("MBP-M3-16GB-SG", wb.getSheetAt(0).getRow(4).getCell(1).getStringCellValue());
            assertEquals("MacBook Pro M3", wb.getSheetAt(0).getRow(4).getCell(2).getStringCellValue());
            assertEquals(15.0, wb.getSheetAt(0).getRow(4).getCell(7).getNumericCellValue());
        }
    }

    @Test
    @DisplayName("exportCustomers creates valid Excel sheet")
    void testExportCustomers() throws IOException {
        AdminUserResponse customer = AdminUserResponse.builder()
                .id(5L)
                .username("customer01")
                .fullName("Trần Thị Hoa")
                .email("hoa.tran@example.com")
                .phoneNumber("0988776655")
                .address("TP. Hồ Chí Minh")
                .ordersCount(4)
                .totalSpent(new BigDecimal("45000000"))
                .status(true)
                .createdAt(LocalDateTime.now())
                .build();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        excelExporter.exportCustomers(List.of(customer), out);

        byte[] bytes = out.toByteArray();
        assertTrue(bytes.length > 0);

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertNotNull(wb.getSheet("Danh Sách Khách Hàng"));
            assertEquals("Trần Thị Hoa", wb.getSheetAt(0).getRow(4).getCell(3).getStringCellValue());
            assertEquals(4.0, wb.getSheetAt(0).getRow(4).getCell(7).getNumericCellValue());
        }
    }

    @Test
    @DisplayName("exportRevenue creates valid Excel sheet with timeline")
    void testExportRevenue() throws IOException {
        TimelineItemResponse item = TimelineItemResponse.builder()
                .date("2026-11-10")
                .label("10/11")
                .orderCount(12L)
                .revenue(new BigDecimal("120000000"))
                .build();

        RevenueTimelineResponse revenueData = RevenueTimelineResponse.builder()
                .range("7days")
                .totalRevenue(new BigDecimal("120000000"))
                .totalOrders(12L)
                .timeline(List.of(item))
                .build();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        excelExporter.exportRevenue(revenueData, out);

        byte[] bytes = out.toByteArray();
        assertTrue(bytes.length > 0);

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertNotNull(wb.getSheet("Báo Cáo Doanh Thu"));
            assertEquals("10/11", wb.getSheetAt(0).getRow(4).getCell(1).getStringCellValue());
            assertEquals(12.0, wb.getSheetAt(0).getRow(4).getCell(2).getNumericCellValue());
            assertEquals(120000000.0, wb.getSheetAt(0).getRow(4).getCell(3).getNumericCellValue());
        }
    }
}

