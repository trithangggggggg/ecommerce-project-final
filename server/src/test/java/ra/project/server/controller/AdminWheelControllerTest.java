package ra.project.server.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.model.dto.WheelReward;
import ra.project.server.model.dto.response.AdminWheelSpinHistoryResponse;
import ra.project.server.model.dto.response.AdminWheelStatsResponse;
import ra.project.server.service.WheelService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: AdminWheelController (Quản lý Vòng quay may mắn Admin)")
class AdminWheelControllerTest {

    private MockMvc mockMvc;

    @Mock
    private WheelService wheelService;

    @InjectMocks
    private AdminWheelController adminWheelController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(adminWheelController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/admin/wheel/history: Trả về danh sách lịch sử quay phân trang 200 OK")
    void whenGetSpinHistory_thenReturn200() throws Exception {
        AdminWheelSpinHistoryResponse item = AdminWheelSpinHistoryResponse.builder()
                .id(1L)
                .userId(10L)
                .username("testuser")
                .rewardLabel("10K Voucher")
                .voucherCode("WHEEL-10K-ABC123")
                .spinDate(LocalDate.now())
                .createdAt(LocalDateTime.now())
                .build();

        PageResponse<AdminWheelSpinHistoryResponse> pageResponse = PageResponse.<AdminWheelSpinHistoryResponse>builder()
                .content(List.of(item))
                .pageNumber(0)
                .pageSize(10)
                .totalElements(1)
                .totalPages(1)
                .build();

        when(wheelService.getSpinHistory(any(), any(), any(PageRequest.class)))
                .thenReturn(ApiResponse.success("Lấy lịch sử thành công", pageResponse));

        mockMvc.perform(get("/api/admin/wheel/history")
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].username").value("testuser"))
                .andExpect(jsonPath("$.data.content[0].voucherCode").value("WHEEL-10K-ABC123"));
    }

    @Test
    @DisplayName("GET /api/admin/wheel/stats: Trả về thống kê tổng quan 200 OK")
    void whenGetStats_thenReturn200() throws Exception {
        AdminWheelStatsResponse stats = AdminWheelStatsResponse.builder()
                .totalSpins(120)
                .spinsToday(15)
                .uniqueUsers(80)
                .vouchersIssued(120)
                .vouchersUsed(45)
                .rewardDistributions(List.of())
                .build();

        when(wheelService.getWheelStats())
                .thenReturn(ApiResponse.success("Lấy thống kê thành công", stats));

        mockMvc.perform(get("/api/admin/wheel/stats")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalSpins").value(120))
                .andExpect(jsonPath("$.data.spinsToday").value(15));
    }

    @Test
    @DisplayName("GET /api/admin/wheel/rewards: Trả về 8 ô phần thưởng cấu hình 200 OK")
    void whenGetRewards_thenReturn200() throws Exception {
        WheelReward reward = WheelReward.builder()
                .id(0)
                .label("10K Voucher")
                .weight(30)
                .build();

        when(wheelService.getDefaultRewards()).thenReturn(List.of(reward));

        mockMvc.perform(get("/api/admin/wheel/rewards")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].label").value("10K Voucher"));
    }

    @Test
    @DisplayName("DELETE /api/admin/wheel/history/1: Xóa lịch sử quay thành công 200 OK")
    void whenDeleteHistory_thenReturn200() throws Exception {
        when(wheelService.deleteSpinHistory(1L))
                .thenReturn(ApiResponse.success("Xóa thành công", null));

        mockMvc.perform(delete("/api/admin/wheel/history/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/admin/wheel/reset-user/10: Reset lượt quay hôm nay cho user 200 OK")
    void whenResetUserSpin_thenReturn200() throws Exception {
        when(wheelService.resetUserDailySpin(10L))
                .thenReturn(ApiResponse.success("Reset thành công", null));

        mockMvc.perform(post("/api/admin/wheel/reset-user/10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}

