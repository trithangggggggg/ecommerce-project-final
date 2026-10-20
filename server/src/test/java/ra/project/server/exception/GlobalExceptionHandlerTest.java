package ra.project.server.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @RestController
    static class TestController {
        @GetMapping("/test/not-found")
        public void throwNotFound() {
            throw new ResourceNotFoundException("User", "id", 999L);
        }

        @GetMapping("/test/bad-request")
        public void throwBadRequest() {
            throw new BadRequestException("Tham số truyền vào không hợp lệ");
        }

        @GetMapping("/test/conflict")
        public void throwConflict() {
            throw new ConflictException("Tên đăng nhập đã tồn tại");
        }

        @GetMapping("/test/unauthorized")
        public void throwUnauthorized() {
            throw new UnauthorizedException("Thông tin đăng nhập không chính xác");
        }

        @GetMapping("/test/forbidden")
        public void throwForbidden() {
            throw new ForbiddenException("Bạn không có quyền truy cập");
        }

        @GetMapping("/test/server-error")
        public void throwGeneralError() {
            throw new RuntimeException("Lỗi kết nối cơ sở dữ liệu");
        }
    }

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void whenResourceNotFound_thenReturn404AndApiResponse() throws Exception {
        mockMvc.perform(get("/test/not-found").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Không tìm thấy User với id: '999'"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void whenBadRequest_thenReturn400AndApiResponse() throws Exception {
        mockMvc.perform(get("/test/bad-request").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Tham số truyền vào không hợp lệ"));
    }

    @Test
    void whenConflict_thenReturn409AndApiResponse() throws Exception {
        mockMvc.perform(get("/test/conflict").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Tên đăng nhập đã tồn tại"));
    }

    @Test
    void whenUnauthorized_thenReturn401AndApiResponse() throws Exception {
        mockMvc.perform(get("/test/unauthorized").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Thông tin đăng nhập không chính xác"));
    }

    @Test
    void whenForbidden_thenReturn403AndApiResponse() throws Exception {
        mockMvc.perform(get("/test/forbidden").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Bạn không có quyền truy cập"));
    }

    @Test
    void whenGeneralException_thenReturn500AndApiResponse() throws Exception {
        mockMvc.perform(get("/test/server-error").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value("Đã xảy ra lỗi máy chủ nội bộ, vui lòng thử lại sau"));
    }
}
