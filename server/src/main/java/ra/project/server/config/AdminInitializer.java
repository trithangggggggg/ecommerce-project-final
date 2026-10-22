package ra.project.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.UserRepository;

/**
 * Seeder Idempotent khởi tạo và đồng bộ tài khoản Quản trị viên (Admin)
 * Chạy mỗi lần ứng dụng Spring Boot khởi động:
 * 1. Không phụ thuộc vào init.sql
 * 2. Luôn gán lại Role.ADMIN và status = true kể cả khi tài khoản đã tồn tại trong DB cũ
 * 3. Đồng bộ mật khẩu mã hóa BCrypt từ biến môi trường / GitHub Secrets
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class AdminInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:${ADMIN_USERNAME:admin}}")
    private String adminUsername;

    @Value("${app.admin.email:${ADMIN_EMAIL:admin@nexor.vn}}")
    private String adminEmail;

    @Value("${app.admin.password:${ADMIN_PASSWORD:123456}}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String username = StringUtils.hasText(adminUsername) ? adminUsername.trim() : "admin";
        String email = StringUtils.hasText(adminEmail) ? adminEmail.trim() : "admin@nexor.vn";
        String password = StringUtils.hasText(adminPassword) ? adminPassword.trim() : "123456";

        log.info(">>> [AdminInitializer] Khởi chạy Admin Seeder (Idempotent): username='{}', email='{}'", username, email);

        // Tìm kiếm tài khoản admin theo email hoặc username (hỗ trợ cả các alias admin, admin@nexor.vn từ DB cũ)
        User admin = userRepository.findByEmailIgnoreCase(email)
                .or(() -> userRepository.findByUsernameIgnoreCase(username))
                .or(() -> userRepository.findByUsernameIgnoreCase("admin"))
                .or(() -> userRepository.findByEmailIgnoreCase("admin@nexor.vn"))
                .orElseGet(() -> {
                    log.info(">>> [AdminInitializer] Không tìm thấy tài khoản Admin, tiến hành tạo mới...");
                    return User.builder()
                            .fullName("Quản trị viên Hệ thống")
                            .phoneNumber("0988888888")
                            .address("Tòa nhà NEXOR Flagship, Hà Nội")
                            .avatarUrl("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150")
                            .build();
                });

        // 1. Luôn đồng bộ username và email chính xác theo cấu hình
        admin.setUsername(username);
        admin.setEmail(email);

        // 2. Luôn gán lại role Role.ADMIN (đáp ứng hasRole("ADMIN") trong SecurityConfig)
        admin.setRole(Role.ADMIN);

        // 3. Luôn gán lại status = true (hoạt động, không bị khóa)
        admin.setStatus(true);

        // 4. Luôn đảm bảo mật khẩu được mã hóa BCrypt theo cấu hình
        if (admin.getPassword() == null || !passwordEncoder.matches(password, admin.getPassword())) {
            admin.setPassword(passwordEncoder.encode(password));
            log.info(">>> [AdminInitializer] Đã cập nhật hash mật khẩu mới cho Quản trị viên");
        }

        User saved = userRepository.save(admin);
        log.info(">>> [AdminInitializer] Hoàn tất Seeder Quản trị viên: ID={}, username='{}', email='{}', role={}, status={}",
                saved.getId(), saved.getUsername(), saved.getEmail(), saved.getRole(), saved.getStatus());
    }
}
