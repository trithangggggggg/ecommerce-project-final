package ra.project.server.service.impl;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import ra.project.server.service.EmailService;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:trithang2006vn@gmail.com}")
    private String fromEmail;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    @Override
    public boolean sendOtpEmail(String toEmail, String fullName, String otp) {
        String cleanEmail = toEmail != null ? toEmail.trim().toLowerCase() : "";
        String displayName = StringUtils.hasText(fullName) ? fullName.trim() : "Khách hàng NEXOR";
        String expireTimeStr = LocalDateTime.now().plusMinutes(5).format(TIME_FORMATTER);

        log.info(">>> [Spring Boot Mail - JavaMailSender] Đang gửi mã OTP tới email '{}' (Hết hạn lúc {})...",
                cleanEmail, expireTimeStr);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(fromEmail, "NEXOR Flagship Store");
            helper.setTo(cleanEmail);
            helper.setSubject("NEXOR - Mã xác thực OTP kích hoạt tài khoản");

            String htmlContent = buildHtmlOtpTemplate(displayName, otp, expireTimeStr);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info(">>> [Spring Boot Mail - JavaMailSender] Đã gửi email OTP thành công tới: {}", cleanEmail);
            return true;
        } catch (Exception e) {
            log.error(">>> [Spring Boot Mail - JavaMailSender] Gửi email OTP thất bại tới '{}': {}", cleanEmail, e.getMessage());
            printBackupConsoleOtp(cleanEmail, otp);
            return false;
        }
    }

    private void printBackupConsoleOtp(String email, String otp) {
        log.warn("================================================================================");
        log.warn(">>> [OTP TEST CONSOLE] Email: {} | Mã OTP: {} (Hiệu lực: 5 phút)", email, otp);
        log.warn("================================================================================");
    }

    private String buildHtmlOtpTemplate(String name, String otp, String expireTime) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Xác thực tài khoản NEXOR</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                        <tr>
                            <td style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 28px 24px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">NEXOR FLAGSHIP</h1>
                                <p style="color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px;">Hệ thống Thương Mại Điện Tử Công Nghệ Đỉnh Cao</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 32px 28px;">
                                <h2 style="color: #111827; font-size: 18px; margin-top: 0;">Xin chào %s,</h2>
                                <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                                    Cảm ơn bạn đã lựa chọn đăng ký tài khoản tại <strong>NEXOR Flagship Store</strong>. Để hoàn tất kích hoạt tài khoản, vui lòng sử dụng mã xác thực OTP 6 chữ số dưới đây:
                                </p>
                                <div style="text-align: center; margin: 28px 0; padding: 20px; background-color: #f8fafc; border: 2px dashed #3b82f6; border-radius: 10px;">
                                    <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: 'Courier New', monospace;">%s</span>
                                </div>
                                <p style="color: #dc2626; font-size: 13px; font-weight: 600; text-align: center; margin-bottom: 24px;">
                                    ⏱️ Mã này có hiệu lực trong vòng 5 phút (hết hạn lúc %s).
                                </p>
                                <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
                                    Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Tuyệt đối không chia sẻ mã này cho bất kỳ ai khác để đảm bảo an toàn tài khoản.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #f9fafb; padding: 18px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    © 2026 NEXOR Flagship Store. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """.formatted(name, otp, expireTime);
    }
}
