package ra.project.server.exception;

import org.springframework.http.HttpStatus;

public class UnauthorizedException extends AppException {

    public UnauthorizedException() {
        super(HttpStatus.UNAUTHORIZED, "Không có quyền truy cập hoặc phiên đăng nhập đã hết hạn");
    }

    public UnauthorizedException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }
}
