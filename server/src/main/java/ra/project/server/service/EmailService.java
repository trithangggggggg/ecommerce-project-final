package ra.project.server.service;

public interface EmailService {

    /**
     * Gửi mã xác thực OTP qua Email (sử dụng EmailJS REST API hoặc fallback)
     *
     * @param toEmail Địa chỉ email người nhận
     * @param fullName Họ tên người nhận
     * @param otp Mã xác thực OTP gồm 6 chữ số
     * @return true nếu gửi thành công, false nếu thất bại
     */
    boolean sendOtpEmail(String toEmail, String fullName, String otp);
}

