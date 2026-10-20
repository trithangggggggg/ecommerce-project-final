package ra.project.server.common.response;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.*;

class ApiResponseTest {

    @Test
    void testSuccessWithData() {
        ApiResponse<String> response = ApiResponse.success("test data");
        assertTrue(response.isSuccess());
        assertEquals(200, response.getStatus());
        assertEquals("Thành công", response.getMessage());
        assertEquals("test data", response.getData());
        assertNotNull(response.getTimestamp());
    }

    @Test
    void testSuccessWithMessageAndData() {
        ApiResponse<Integer> response = ApiResponse.success("Custom message", 42);
        assertTrue(response.isSuccess());
        assertEquals(200, response.getStatus());
        assertEquals("Custom message", response.getMessage());
        assertEquals(42, response.getData());
    }

    @Test
    void testErrorWithStatusAndMessage() {
        ApiResponse<Void> response = ApiResponse.error(HttpStatus.NOT_FOUND, "Not found");
        assertFalse(response.isSuccess());
        assertEquals(404, response.getStatus());
        assertEquals("Not found", response.getMessage());
        assertNull(response.getData());
    }
}
