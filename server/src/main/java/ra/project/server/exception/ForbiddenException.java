package ra.project.server.exception;

import org.springframework.http.HttpStatus;

public class ForbiddenException extends AppException {

    public ForbiddenException() {
        super(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này");
    }

    public ForbiddenException(String message) {
        super(HttpStatus.FORBIDDEN, message);
    }
}
