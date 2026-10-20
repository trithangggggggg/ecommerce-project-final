package ra.project.server.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.model.dto.request.UpdateProfileRequest;
import ra.project.server.model.dto.response.UserProfileResponse;
import ra.project.server.model.enums.Role;
import ra.project.server.service.UserService;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void whenGetProfileSuccess_thenReturn200WithProfile() throws Exception {
        UserProfileResponse userProfile = UserProfileResponse.builder()
                .id(1L)
                .username("nguyenvana")
                .email("vana@gmail.com")
                .fullName("Nguyen Van A")
                .phoneNumber("0901234567")
                .address("Hanoi, Vietnam")
                .role(Role.CUSTOMER)
                .createdAt(LocalDateTime.now())
                .build();

        when(userService.getCurrentUserProfile())
                .thenReturn(ApiResponse.success("Lấy thông tin cá nhân thành công", userProfile));

        mockMvc.perform(get("/api/users/profile").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Lấy thông tin cá nhân thành công"))
                .andExpect(jsonPath("$.data.username").value("nguyenvana"))
                .andExpect(jsonPath("$.data.phoneNumber").value("0901234567"));
    }

    @Test
    void whenGetProfileUnauthenticated_thenReturn401() throws Exception {
        when(userService.getCurrentUserProfile())
                .thenThrow(new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác này"));

        mockMvc.perform(get("/api/users/profile").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Vui lòng đăng nhập để thực hiện thao tác này"));
    }

    @Test
    void whenUpdateProfileSuccess_thenReturn200WithUpdatedProfile() throws Exception {
        UserProfileResponse updatedProfile = UserProfileResponse.builder()
                .id(1L)
                .username("nguyenvana")
                .email("vana@gmail.com")
                .fullName("Nguyen Van B")
                .phoneNumber("0987654321")
                .address("HCM City, Vietnam")
                .role(Role.CUSTOMER)
                .build();

        when(userService.updateCurrentUserProfile(any(UpdateProfileRequest.class)))
                .thenReturn(ApiResponse.success("Cập nhật thông tin cá nhân thành công", updatedProfile));

        String requestJson = """
                {
                    "fullName": "Nguyen Van B",
                    "phoneNumber": "0987654321",
                    "address": "HCM City, Vietnam"
                }
                """;

        mockMvc.perform(put("/api/users/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Cập nhật thông tin cá nhân thành công"))
                .andExpect(jsonPath("$.data.fullName").value("Nguyen Van B"))
                .andExpect(jsonPath("$.data.phoneNumber").value("0987654321"));
    }
}
