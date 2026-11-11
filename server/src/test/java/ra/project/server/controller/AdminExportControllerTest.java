package ra.project.server.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.response.AdminUserResponse;
import ra.project.server.model.dto.response.RevenueTimelineResponse;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.ProductVariant;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductVariantRepository;
import ra.project.server.service.DashboardService;
import ra.project.server.service.UserService;
import ra.project.server.util.ExcelExporter;

import java.io.OutputStream;
import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminExportControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ExcelExporter excelExporter;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private UserService userService;

    @Mock
    private DashboardService dashboardService;

    @InjectMocks
    private AdminExportController adminExportController;

    private static final String EXCEL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(adminExportController)
                .build();
    }

    @Test
    @DisplayName("GET /api/admin/export/orders returns 200 with Excel content type and attachment header")
    void testExportOrders() throws Exception {
        when(orderRepository.findOrdersForExport(isNull(), isNull(), isNull())).thenReturn(List.of(new Order()));

        doAnswer(invocation -> {
            OutputStream out = invocation.getArgument(1);
            out.write("fake-excel-data".getBytes());
            return null;
        }).when(excelExporter).exportOrders(anyList(), any(OutputStream.class));

        mockMvc.perform(get("/api/admin/export/orders"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString(EXCEL_CONTENT_TYPE)))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("Bao_Cao_Don_Hang")));
    }

    @Test
    @DisplayName("GET /api/admin/export/inventory returns 200 with Excel content type")
    void testExportInventory() throws Exception {
        when(productVariantRepository.findAllActiveWithProduct()).thenReturn(List.of(new ProductVariant()));

        doAnswer(invocation -> {
            OutputStream out = invocation.getArgument(1);
            out.write("fake-excel-data".getBytes());
            return null;
        }).when(excelExporter).exportInventory(anyList(), any(OutputStream.class));

        mockMvc.perform(get("/api/admin/export/inventory"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString(EXCEL_CONTENT_TYPE)))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("Bao_Cao_Ton_Kho")));
    }

    @Test
    @DisplayName("GET /api/admin/export/customers returns 200 with Excel content type")
    void testExportCustomers() throws Exception {
        AdminUserResponse customer = AdminUserResponse.builder().id(1L).fullName("Test").build();
        when(userService.getAllUsers(isNull(), isNull())).thenReturn(ApiResponse.success("Success", List.of(customer)));

        doAnswer(invocation -> {
            OutputStream out = invocation.getArgument(1);
            out.write("fake-excel-data".getBytes());
            return null;
        }).when(excelExporter).exportCustomers(anyList(), any(OutputStream.class));

        mockMvc.perform(get("/api/admin/export/customers"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString(EXCEL_CONTENT_TYPE)))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("Bao_Cao_Khach_Hang")));
    }

    @Test
    @DisplayName("GET /api/admin/export/revenue returns 200 with Excel content type")
    void testExportRevenue() throws Exception {
        RevenueTimelineResponse rev = RevenueTimelineResponse.builder()
                .range("month")
                .totalRevenue(BigDecimal.TEN)
                .totalOrders(1L)
                .timeline(List.of())
                .build();
        when(dashboardService.getRevenueTimeline("month")).thenReturn(rev);

        doAnswer(invocation -> {
            OutputStream out = invocation.getArgument(1);
            out.write("fake-excel-data".getBytes());
            return null;
        }).when(excelExporter).exportRevenue(any(RevenueTimelineResponse.class), any(OutputStream.class));

        mockMvc.perform(get("/api/admin/export/revenue").param("range", "month"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString(EXCEL_CONTENT_TYPE)))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("Bao_Cao_Doanh_Thu_month")));
    }
}

