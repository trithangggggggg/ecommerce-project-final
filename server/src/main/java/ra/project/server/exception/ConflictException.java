package ra.project.server.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends AppException {

    public ConflictException() {
        super(HttpStatus.CONFLICT, "Dữ liệu đã tồn tại hoặc xảy ra xung đột");
    }

    public ConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
