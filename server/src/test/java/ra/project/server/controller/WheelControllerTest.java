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
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.model.dto.WheelReward;
import ra.project.server.model.dto.response.WheelSpinResponse;
import ra.project.server.model.dto.response.WheelStatusResponse;
import ra.project.server.model.entity.Promotion;
import ra.project.server.service.WheelService;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: WheelController (REST API Vòng quay may mắn)")
class WheelControllerTest {

    private MockMvc mockMvc;

    @Mock
    private WheelService wheelService;

    @InjectMocks
    private WheelController wheelController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(wheelController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/wheel/status: Trả về trạng thái vòng quay 200 OK")
    void whenGetStatus_thenReturn200WithConfig() throws Exception {
        WheelReward reward0 = WheelReward.builder().id(0).label("10K").build();
        WheelStatusResponse statusResponse = WheelStatusResponse.builder()
                .canSpin(true)
                .hasSpunToday(false)
                .message("Sẵn sàng quay")
                .rewards(List.of(reward0))
                .build();

        when(wheelService.getWheelStatus()).thenReturn(ApiResponse.success("Lấy trạng thái thành công", statusResponse));

        mockMvc.perform(get("/api/wheel/status")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.canSpin").value(true))
                .andExpect(jsonPath("$.data.hasSpunToday").value(false));
    }

    @Test
    @DisplayName("POST /api/wheel/spin: Quay thưởng thành công trả về 200 OK kèm mã voucher")
    void whenSpin_success_thenReturn200WithReward() throws Exception {
        WheelReward reward = WheelReward.builder().id(2).label("FREESHIP").discount("100%").build();
        Promotion promo = Promotion.builder().id(1L).code("WHEEL-FREESHIP-XYZ").userId(1L).build();

        WheelSpinResponse spinResponse = WheelSpinResponse.builder()
                .rewardIndex(2)
                .reward(reward)
                .voucherCode("WHEEL-FREESHIP-XYZ")
                .voucher(promo)
                .message("Trúng thưởng")
                .build();

        when(wheelService.spinWheel()).thenReturn(ApiResponse.success("Quay thưởng thành công!", spinResponse));

        mockMvc.perform(post("/api/wheel/spin")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.rewardIndex").value(2))
                .andExpect(jsonPath("$.data.voucherCode").value("WHEEL-FREESHIP-XYZ"));
    }

    @Test
    @DisplayName("POST /api/wheel/spin: Đã quay hôm nay -> Bị từ chối với 400 Bad Request")
    void whenSpin_alreadySpun_thenReturn400() throws Exception {
        when(wheelService.spinWheel()).thenThrow(new BadRequestException("Bạn đã sử dụng lượt quay hôm nay"));

        mockMvc.perform(post("/api/wheel/spin")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Bạn đã sử dụng lượt quay hôm nay"));
    }
}

