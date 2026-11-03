package ra.project.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.model.entity.Category;
import ra.project.server.model.entity.Supplier;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.Role;
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
        private final PasswordEncoder passwordEncoder;

        @Override
        @Transactional
        public void run(String... args) {
                initAdminUser();
                initCustomerUser();
                initCategoriesOnly();
                initSuppliersOnly();
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

        private void initSuppliersOnly() {
                if (supplierRepository.count() == 0) {
                        log.info(">>> [DataInitializer] Chưa có nhà cung cấp nào trong CSDL, tiến hành khởi tạo danh sách mẫu...");
                        List<Supplier> defaultSuppliers = List.of(
                                Supplier.builder().code("NCC-APPLE-VN").name("Apple Vietnam Authorized Distributor").brand("Apple").contact("028 3822 1234").email("distribution@apple.vn").address("Tòa nhà Deutsches Haus, Lê Duẩn, Quận 1, TP.HCM").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-SAMSUNG").name("Samsung Electronics Vina Corporation").brand("Samsung").contact("024 3755 8888").email("b2b.partner@samsung.com").address("Tòa nhà Bitexco Financial Tower, Quận 1, TP.HCM").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-FPT-SYNNEX").name("FPT Synnex Distribution Co., Ltd").brand("Dell, HP, Asus, Lenovo").contact("024 7300 6666").email("synnex.tech@fpt.com").address("Tòa nhà FPT Cầu Giấy, Duy Tân, Cầu Giấy, Hà Nội").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-DIGIWORLD").name("DGW - Digiworld Corporation").brand("Xiaomi, Sony, Acer").contact("028 3929 0059").email("partner@digiworld.com.vn").address("Số 195 Cô Bắc, Phường Cô Giang, Quận 1, TP.HCM").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-PETROSETCO").name("PSD - Petrosetco Distribution").brand("Apple, Microsoft, Corsair").contact("028 3911 8888").email("contact@psd.com.vn").address("Số 1-5 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-VINH-XUAN").name("Vĩnh Xuân Computer (SPC)").brand("ASUS, Gigabyte, MSI").contact("024 3943 9121").email("sales@spc.com.vn").address("Số 39 Trần Quốc Toản, Hàng Bài, Hoàn Kiếm, Hà Nội").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-VIEN-SON").name("Viễn Sơn Distribution (Micro-Star)").brand("MSI, Kingston, ViewSonic").contact("028 3832 6085").email("info@microstar.vn").address("Số 175 Bùi Thị Xuân, Phường Phạm Ngũ Lão, Quận 1, TP.HCM").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-ELITE-VN").name("Elite Technology JSC").brand("Cisco, Fortinet, HP Enterprise").contact("028 3512 3959").email("sales@elite-jsc.com").address("Tòa nhà Rosana, 60 Nguyễn Đình Chiểu, Quận 1, TP.HCM").status("INACTIVE").build(),
                                Supplier.builder().code("NCC-KTC-TECH").name("KTC Co., Ltd (Khải Thiên)").brand("Logitech, SanDisk, WD").contact("028 3835 1515").email("distribution@ktc.com.vn").address("384 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP.HCM").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-MEGATECH").name("Mega Technology Group").brand("Anker, Baseus, Ugreen").contact("024 3783 4567").email("partner@megatech.vn").address("Số 12 Duy Tân, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-LOGITECH-VN").name("Logitech Vietnam Representative Office").brand("Logitech, Astro Gaming").contact("028 3910 7799").email("vietnam.b2b@logitech.com").address("Tòa nhà Saigon Tower, Lê Duẩn, Quận 1, TP.HCM").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-LG-VN").name("LG Electronics Vietnam Hải Phòng").brand("LG Monitors, Gram Laptops").contact("0225 883 1000").email("b2b.lg@lge.com").address("KCN Tràng Duệ, An Dương, TP. Hải Phòng").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-AUDIO-TECH").name("Audio Technica & Marshall VN Distro").brand("Marshall, JBL, Harman Kardon").contact("028 3930 9999").email("sound.partner@audio.vn").address("180 Nam Kỳ Khởi Nghĩa, Phường 6, Quận 3, TP.HCM").status("ACTIVE").build(),
                                Supplier.builder().code("NCC-INTEL-VN").name("Intel Products Vietnam Co., Ltd").brand("Intel Core, Arc GPU").contact("028 3736 3000").email("partner.relations@intel.com").address("Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM").status("INACTIVE").build()
                        );
                        supplierRepository.saveAll(defaultSuppliers);
                        log.info(">>> [DataInitializer] Đã khởi tạo thành công {} nhà cung cấp vào CSDL!", defaultSuppliers.size());
                }
        }
}
