package ra.project.server.exception;

import org.springframework.http.HttpStatus;

public class BadRequestException extends AppException {

    public BadRequestException() {
        super(HttpStatus.BAD_REQUEST, "Yêu cầu không hợp lệ");
    }

    public BadRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
