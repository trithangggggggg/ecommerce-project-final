package ra.project.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.model.entity.Category;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.CategoryRepository;
import ra.project.server.repository.UserRepository;

@Slf4j
@Component
@org.springframework.core.annotation.Order(1)
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

        private final UserRepository userRepository;
        private final CategoryRepository categoryRepository;
        private final PasswordEncoder passwordEncoder;

        @Override
        @Transactional
        public void run(String... args) {
                initAdminUser();
                initCustomerUser();
                initCategoriesOnly();
        }

        private void initCustomerUser() {
                String custEmail = "customer@nexor.vn";
                String custUsername = "customer";
                String custPassword = "123123123";

                log.info(">>> [DataInitializer] Kiểm tra và khởi tạo tài khoản Khách hàng: email='{}', username='{}'",
                                custEmail, custUsername);

                User customer = userRepository.findByEmailIgnoreCase(custEmail)
                                .or(() -> userRepository.findByUsernameIgnoreCase(custUsername))
                                .orElseGet(() -> {
                                        log.info(">>> [DataInitializer] Không tìm thấy tài khoản Khách hàng, tiến hành tạo mới...");
                                        return User.builder()
                                                        .fullName("Khách hàng Mẫu")
                                                        .phoneNumber("0912345678")
                                                        .address("Tòa nhà NEXOR Flagship, Hà Nội")
                                                        .avatarUrl("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150")
                                                        .build();
                                });

                customer.setUsername(custUsername);
                customer.setEmail(custEmail);
                customer.setRole(Role.CUSTOMER);
                customer.setStatus(true);

                if (customer.getPassword() == null || !passwordEncoder.matches(custPassword, customer.getPassword())) {
                        customer.setPassword(passwordEncoder.encode(custPassword));
                        log.info(">>> [DataInitializer] Đã mã hóa và cập nhật mật khẩu cho Khách hàng (123123123)");
                }

                User saved = userRepository.save(customer);
                log.info(">>> [DataInitializer] Hoàn tất Seeder Khách hàng: ID={}, username='{}', email='{}', role={}, status={}",
                                saved.getId(), saved.getUsername(), saved.getEmail(), saved.getRole(), saved.getStatus());
        }

        private void initAdminUser() {
                String adminEmail = "admin@nexor.vn";
                String adminUsername = "admin";
                String adminPassword = "123123123";

                log.info(">>> [DataInitializer] Kiểm tra và khởi tạo tài khoản Quản trị viên (ADMIN): email='{}', username='{}'",
                                adminEmail, adminUsername);

                User admin = userRepository.findByEmailIgnoreCase(adminEmail)
                                .or(() -> userRepository.findByUsernameIgnoreCase(adminUsername))
                                .or(() -> userRepository.findByUsernameIgnoreCase("admin"))
                                .or(() -> userRepository.findByEmailIgnoreCase("admin@nexor.vn"))
                                .orElseGet(() -> {
                                        log.info(">>> [DataInitializer] Không tìm thấy tài khoản Admin, tiến hành tạo mới...");
                                        return User.builder()
                                                        .fullName("Quản trị viên Hệ thống")
                                                        .phoneNumber("0988888888")
                                                        .address("Tòa nhà NEXOR Flagship, Hà Nội")
                                                        .avatarUrl("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150")
                                                        .build();
                                });

                admin.setUsername(adminUsername);
                admin.setEmail(adminEmail);
                admin.setRole(Role.ADMIN);
                admin.setStatus(true);

                if (admin.getPassword() == null || !passwordEncoder.matches(adminPassword, admin.getPassword())) {
                        admin.setPassword(passwordEncoder.encode(adminPassword));
                        log.info(">>> [DataInitializer] Đã mã hóa và cập nhật mật khẩu mới cho Quản trị viên (123123123)");
                }

                User saved = userRepository.save(admin);
                log.info(">>> [DataInitializer] Hoàn tất Seeder Quản trị viên: ID={}, username='{}', email='{}', role={}, status={}",
                                saved.getId(), saved.getUsername(), saved.getEmail(), saved.getRole(), saved.getStatus());
        }

        private void initCategoriesOnly() {
                getOrCreateCategory("Điện thoại", "Các dòng điện thoại thông minh chính hãng mới nhất");
                getOrCreateCategory("Laptop", "Máy tính xách tay văn phòng và gaming hiệu năng cao");
                getOrCreateCategory("Máy tính bảng", "Thiết bị giải trí, học tập và làm việc đồ họa linh hoạt");
                getOrCreateCategory("Thiết bị âm thanh", "Tai nghe True Wireless, tai nghe chụp tai và loa Bluetooth");
                getOrCreateCategory("Đồng hồ & Phụ kiện", "Đồng hồ thông minh thể thao và phụ kiện chính hãng");
        }

        private Category getOrCreateCategory(String name, String description) {
                return categoryRepository.findByName(name).orElseGet(() -> {
                        Category category = Category.builder()
                                        .name(name)
                                        .description(description)
                                        .status(true)
                                        .build();
                        return categoryRepository.save(category);
                });
        }
}
