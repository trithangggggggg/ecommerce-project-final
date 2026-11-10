package ra.project.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
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

        @Override
        @Transactional
        public void run(String... args) {
                initAdminUser();
                initCustomerUser();
                initCategoriesOnly();
                initSuppliersOnly();
                initArticlesOnly();
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

        private void initArticlesOnly() {
                if (articleRepository.count() == 0) {
                        log.info(">>> [DataInitializer] Chưa có bài viết tin tức nào, tiến hành khởi tạo danh sách bài viết mẫu...");
                        List<Article> sampleArticles = List.of(
                                Article.builder()
                                        .title("Đánh giá MacBook Air M3: Đỉnh cao laptop mỏng nhẹ cho lập trình viên và sinh viên")
                                        .slug("danh-gia-macbook-air-m3-dinh-cao-laptop-mong-nhe-cho-lap-trinh-vien-va-sinh-vien")
                                        .summary("MacBook Air M3 mang lại hiệu năng ấn tượng, thời lượng pin cả ngày và khả năng xuất 2 màn hình ngoài. Cùng tìm hiểu xem đây có phải là chiếc máy đáng nâng cấp nhất năm 2026?")
                                        .content("<h2>1. Thiết kế sang trọng, tinh tế đến từng đường nét</h2>"
                                                + "<p>MacBook Air M3 vẫn duy trì ngôn ngữ thiết kế vuông vức hiện đại, siêu mỏng nhẹ chỉ <strong>1.24 kg</strong>. Vỏ nhôm nguyên khối tái chế 100% thân thiện với môi trường, đặc biệt phiên bản màu Midnight đã được bổ sung lớp phủ anot hóa giảm thiểu đáng kể dấu vân tay.</p>"
                                                + "<h2>2. Sức mạnh đột phá từ con chip Apple M3</h2>"
                                                + "<p>Chip M3 được sản xuất trên tiến trình <strong>3nm</strong> tiên tiến nhất thế giới, đem đến bước nhảy vọt về hiệu suất GPU với công nghệ Ray Tracing và Mesh Shading bằng phần cứng.</p>"
                                                + "<ul>"
                                                + "<li><strong>Tốc độ CPU:</strong> Nhanh hơn 35% so với M1 và 20% so với M2.</li>"
                                                + "<li><strong>Xử lý đồ họa GPU:</strong> Chơi mượt mà các tựa game đồ họa cao và render video 4K ProRes nhanh chóng.</li>"
                                                + "<li><strong>Neural Engine 16 lõi:</strong> Tối ưu cho các mô hình AI máy học nội bộ chạy cực nhanh và tiết kiệm điện.</li>"
                                                + "</ul>"
                                                + "<h2>3. Trải nghiệm pin bền bỉ lên tới 18 giờ liên tục</h2>"
                                                + "<p>Bạn hoàn toàn có thể làm việc trọn vẹn cả ngày dài tại quán cà phê mà không cần mang theo củ sạc. Màn hình Liquid Retina 500 nits sống động với dải màu P3 rực rỡ.</p>"
                                                + "<blockquote><p>MacBook Air M3 xứng đáng là chiếc máy tính xách tay mỏng nhẹ toàn diện nhất thị trường hiện nay cho công việc, học tập và sáng tạo nội dung.</p></blockquote>")
                                        .thumbnail("/images/macbook-hero-banner.jpg")
                                        .category("Đánh giá")
                                        .views(128L)
                                        .status(true)
                                        .build(),

                                Article.builder()
                                        .title("Xu hướng AI và Trí tuệ nhân tạo năm 2026: Kỷ nguyên của các trợ lý Agentic")
                                        .slug("xu-huong-ai-va-tri-tue-nhan-tao-nam-2026-ky-nguyen-cua-cac-tro-ly-agentic")
                                        .summary("Năm 2026 đánh dấu bước ngoặt khi AI không chỉ trả lời câu hỏi mà đã có thể tự động lập kế hoạch, sử dụng công cụ và giải quyết công việc phức tạp thay con người.")
                                        .content("<h2>1. Từ Chatbot thế hệ cũ sang Agentic AI chủ động</h2>"
                                                + "<p>Nếu như những năm trước, chúng ta quen thuộc với việc hỏi - đáp cùng các mô hình ngôn ngữ lớn (LLM), thì năm 2026 chứng kiến sự bùng nổ của <em>Hệ thống Tự hành (Agentic Systems)</em>. Các Agent có khả năng tự suy luận, tự gọi API, viết code và sửa lỗi mà không cần sự can thiệp liên tục từ người dùng.</p>"
                                                + "<h2>2. Tích hợp AI ngay trong phần cứng thiết bị di động</h2>"
                                                + "<p>Các dòng chip mới nhất như Snapdragon 8 Elite, Apple A18 Pro và Tensor G5 đều trang bị NPU siêu mạnh, cho phép xử lý thị giác máy tính và trợ lý giọng nói trực tiếp On-device với độ trễ gần như bằng 0 mà vẫn bảo mật thông tin riêng tư tuyệt đối.</p>"
                                                + "<h2>3. Đón đầu công nghệ tại hệ thống bán lẻ NEXOR</h2>"
                                                + "<p>Tại NEXOR, chúng tôi luôn cập nhật nhanh nhất các thiết bị công nghệ hỗ trợ AI tiên tiến nhất cùng sự tư vấn chuyên sâu từ đội ngũ kỹ thuật viên am hiểu công nghệ.</p>")
                                        .thumbnail("/images/tech-future-banner.jpg")
                                        .category("Công nghệ")
                                        .views(256L)
                                        .status(true)
                                        .build(),

                                Article.builder()
                                        .title("So sánh iPhone 16 Pro Max và Samsung Galaxy S24 Ultra: Kèo đối đầu đỉnh cao")
                                        .slug("so-sanh-iphone-16-pro-max-va-samsung-galaxy-s24-ultra-keo-doi-dau-dinh-cao")
                                        .summary("Hai chiếc smartphone cao cấp nhất hiện nay đến từ Apple và Samsung có những điểm gì khác biệt? Đâu là sự lựa chọn tối ưu cho nhu cầu sử dụng của bạn?")
                                        .content("<h2>1. Màn hình và Thiết kế: Khung viền Titan đẳng cấp</h2>"
                                                + "<p>Cả iPhone 16 Pro Max và Galaxy S24 Ultra đều sử dụng khung viền Titan cấp 5 cao cấp, mang lại cảm giác cầm nắm chắc chắn, chống trầy xước và giảm trọng lượng đáng kể.</p>"
                                                + "<h2>2. Nhiếp ảnh và Quay phim: 5x Zoom quang học & Camera Control</h2>"
                                                + "<p>iPhone 16 Pro Max bổ sung nút điều khiển Camera Control tiện lợi và quay video 4K 120fps Dolby Vision điện ảnh. Trong khi đó, Galaxy S24 Ultra ghi điểm nhờ cảm biến 200MP siêu nét cùng bút S-Pen đa năng tích hợp sâu trong thân máy.</p>"
                                                + "<h2>3. Kết luận</h2>"
                                                + "<p>Nếu bạn yêu thích hệ sinh thái mượt mà của Apple và khả năng quay video đỉnh cao, hãy chọn <strong>iPhone 16 Pro Max</strong>. Nếu bạn muốn màn hình chống chói Dynamic AMOLED đỉnh nhất và bộ công cụ Galaxy AI mạnh mẽ, <strong>Galaxy S24 Ultra</strong> là sự lựa chọn số 1.</p>")
                                        .thumbnail("/images/iphone-16-pro-max.jpg")
                                        .category("Đánh giá")
                                        .views(342L)
                                        .status(true)
                                        .build(),

                                Article.builder()
                                        .title("Top 5 mẹo tối ưu hiệu năng Laptop Gaming ASUS ROG cho game thủ chuyên nghiệp")
                                        .slug("top-5-meo-toi-uu-hieu-nang-laptop-gaming-asus-rog-cho-game-thu-chuyen-nghiep")
                                        .summary("Bỏ túi ngay 5 thiết lập quan trọng giúp laptop ASUS ROG tản nhiệt mát mẻ hơn, tăng FPS khi leo rank và kéo dài tuổi thọ phần cứng máy.")
                                        .content("<h2>1. Kích hoạt MUX Switch và NVIDIA Advanced Optimus</h2>"
                                                + "<p>Chuyển chế độ sang dGPU Discrete Graphics trong ứng dụng Armoury Crate để luồng xuất hình đi trực tiếp từ card rời, giúp giảm độ trễ hiển thị và tăng ngay từ 10% đến 25% FPS trong game Esport.</p>"
                                                + "<h2>2. Tùy chỉnh Fan Curve trong Armoury Crate</h2>"
                                                + "<p>Hãy chuyển sang profile <em>Turbo</em> hoặc <em>Manual</em> khi chơi game nặng để quạt tản nhiệt quay ở công suất tối ưu sớm hơn, giữ cho CPU và GPU luôn duy trì dưới 82 độ C.</p>"
                                                + "<h2>3. Cập nhật Game Ready Driver mới nhất</h2>"
                                                + "<p>Thường xuyên kiểm tra GeForce Experience để cài đặt driver mới nhất được tối ưu hóa riêng cho các tựa game hot hiện hành.</p>")
                                        .thumbnail("/images/asus-rog-strix.jpg")
                                        .category("Thủ thuật")
                                        .views(89L)
                                        .status(true)
                                        .build()
                        );
                        articleRepository.saveAll(sampleArticles);
                        log.info(">>> [DataInitializer] Đã khởi tạo thành công {} bài viết tin tức mẫu chuẩn SEO vào CSDL!", sampleArticles.size());
                }
        }
}
