package ra.project.server.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import ra.project.server.service.impl.EmailServiceImpl;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: EmailServiceImpl (HTML Email & OTP Delivery)")
class EmailServiceImplTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailServiceImpl emailService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromEmail", "trithang2006vn@gmail.com");
    }

    private MimeMessage createEmptyMimeMessage() {
        return new MimeMessage(Session.getInstance(new Properties()));
    }

    @Test
    @DisplayName("TC_EMAIL_01: Gửi email OTP định dạng HTML 6 chữ số thành công")
    void sendOtpEmail_success() {
        MimeMessage mimeMessage = createEmptyMimeMessage();
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doNothing().when(mailSender).send(any(MimeMessage.class));

        boolean result = emailService.sendOtpEmail("customer@test.com", "Nguyễn Văn A", "849201");

        assertTrue(result);
        verify(mailSender, times(1)).createMimeMessage();
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("TC_EMAIL_02: Mock lỗi dịch vụ gửi mail (MailSendException) -> Bắt ngoại lệ và trả về false, không sập app")
    void sendOtpEmail_whenMailSenderThrowsException_catchesAndReturnsFalse() {
        MimeMessage mimeMessage = createEmptyMimeMessage();
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new MailSendException("SMTP server connection timeout"))
                .when(mailSender).send(any(MimeMessage.class));

        boolean result = emailService.sendOtpEmail("customer@test.com", "Nguyễn Văn A", "849201");

        assertFalse(result, "Hệ thống phải bắt ngoại lệ và trả về false một cách an toàn mà không làm sập ứng dụng");
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("TC_EMAIL_03: Gửi email khi fullName rỗng -> Sử dụng tên mặc định 'Khách hàng NEXOR'")
    void sendOtpEmail_nullFullName_usesDefaultDisplayName() {
        MimeMessage mimeMessage = createEmptyMimeMessage();
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doNothing().when(mailSender).send(any(MimeMessage.class));

        boolean result = emailService.sendOtpEmail("customer@test.com", null, "123456");

        assertTrue(result);
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }
}
