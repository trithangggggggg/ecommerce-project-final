package ra.project.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;
import ra.project.server.model.entity.Article;
import ra.project.server.model.entity.Category;
import ra.project.server.model.entity.Supplier;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.ArticleRepository;
import ra.project.server.repository.CategoryRepository;
import ra.project.server.repository.SupplierRepository;
import ra.project.server.repository.UserRepository;

import java.util.List;

@Slf4j
@Component
@org.springframework.core.annotation.Order(1)
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

        private final UserRepository userRepository;
        private final CategoryRepository categoryRepository;
        private final SupplierRepository supplierRepository;
        private final ArticleRepository articleRepository;
        private final PasswordEncoder passwordEncoder;
        private final DataSource dataSource;

        @Value("${app.seed.enabled:true}")
        private boolean seedEnabled;

        @Value("${app.seed.admin-email:admin@nexor.vn}")
        private String adminEmail;
        @Value("${app.seed.admin-username:admin}")
        private String adminUsername;
        @Value("${app.seed.admin-password:}")
        private String adminInitialSecret;

        @Value("${app.seed.customer-email:customer@nexor.vn}")
        private String customerEmail;
        @Value("${app.seed.customer-username:customer}")
        private String customerUsername;
        @Value("${app.seed.customer-password:}")
        private String customerInitialSecret;

        @Override
        @Transactional
        public void run(String... args) {
                if (!seedEnabled) {
                        log.info(">>> [DataInitializer] Bỏ qua Seeding dữ liệu (app.seed.enabled=false)");
                        return;
                }
                initAdminUser();
                initCustomerUser();
                initSeedDataFromSql();
        }

        private void initCustomerUser() {
                boolean exists = userRepository.findByEmailIgnoreCase(customerEmail)
                                .or(() -> userRepository.findByUsernameIgnoreCase(customerUsername))
                                .isPresent();
                if (exists) {
                        log.info(">>> [DataInitializer] Tài khoản Khách hàng ('{}') đã tồn tại trong CSDL. Bỏ qua khởi tạo.", customerUsername);
                        return;
                }

                if (!StringUtils.hasText(customerInitialSecret)) {
                        log.info(">>> [DataInitializer] Chưa cấu hình biến môi trường CUSTOMER_PASSWORD. Bỏ qua khởi tạo tài khoản Khách hàng.");
                        return;
                }

                log.info(">>> [DataInitializer] Khởi tạo tài khoản Khách hàng từ biến môi trường...");
                User customer = User.builder()
                                .username(customerUsername)
                                .email(customerEmail)
                                .password(passwordEncoder.encode(customerInitialSecret))
                                .fullName("Khách hàng Mẫu")
                                .phoneNumber("0912345678")
                                .address("Tòa nhà NEXOR Flagship, Hà Nội")
                                .avatarUrl("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150")
                                .role(Role.CUSTOMER)
                                .status(true)
                                .build();

                User saved = userRepository.save(customer);
                log.info(">>> [DataInitializer] Hoàn tất tạo tài khoản Khách hàng: ID={}, username='{}', email='{}'",
                                saved.getId(), saved.getUsername(), saved.getEmail());
        }

        private void initAdminUser() {
                boolean exists = userRepository.findByEmailIgnoreCase(adminEmail)
                                .or(() -> userRepository.findByUsernameIgnoreCase(adminUsername))
                                .isPresent();
                if (exists) {
                        log.info(">>> [DataInitializer] Tài khoản Quản trị viên ('{}') đã tồn tại trong CSDL. Bỏ qua khởi tạo.", adminUsername);
                        return;
                }

                if (!StringUtils.hasText(adminInitialSecret)) {
                        log.info(">>> [DataInitializer] Chưa cấu hình biến môi trường ADMIN_PASSWORD. Bỏ qua khởi tạo tài khoản Quản trị viên.");
                        return;
                }

                log.info(">>> [DataInitializer] Khởi tạo tài khoản Quản trị viên từ biến môi trường...");
                User admin = User.builder()
                                .username(adminUsername)
                                .email(adminEmail)
                                .password(passwordEncoder.encode(adminInitialSecret))
                                .fullName("Quản trị viên Hệ thống")
                                .phoneNumber("0988888888")
                                .address("Tòa nhà NEXOR Flagship, Hà Nội")
                                .avatarUrl("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150")
                                .role(Role.ADMIN)
                                .status(true)
                                .build();

                User saved = userRepository.save(admin);
                log.info(">>> [DataInitializer] Hoàn tất tạo tài khoản Quản trị viên: ID={}, username='{}', email='{}'",
                                saved.getId(), saved.getUsername(), saved.getEmail());
        }

        private void initSeedDataFromSql() {
                if (categoryRepository.count() == 0 || supplierRepository.count() == 0 || articleRepository.count() == 0) {
                        try {
                                ResourceDatabasePopulator populator = new ResourceDatabasePopulator(
                                                new ClassPathResource("data-seed.sql"));
                                populator.setContinueOnError(true);
                                populator.execute(dataSource);
                                log.info(">>> [DataInitializer] Đã nạp thành công dữ liệu mẫu từ data-seed.sql!");
                        } catch (Exception e) {
                                log.warn(">>> [DataInitializer] Không thể nạp data-seed.sql: {}", e.getMessage());
                        }
                }
        }
}
