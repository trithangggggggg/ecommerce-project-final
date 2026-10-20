package ra.project.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.model.entity.Category;
import ra.project.server.model.entity.Product;
import ra.project.server.repository.CategoryRepository;
import ra.project.server.repository.ProductRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Override
    @Transactional
    public void run(String... args) {
        initCategoriesAndProducts();
    }

    private void initCategoriesAndProducts() {
        Category phoneCat = getOrCreateCategory("Điện thoại", "Các dòng điện thoại thông minh chính hãng mới nhất");
        Category laptopCat = getOrCreateCategory("Laptop", "Máy tính xách tay văn phòng và gaming hiệu năng cao");
        Category tabletCat = getOrCreateCategory("Máy tính bảng", "Thiết bị giải trí, học tập và làm việc đồ họa linh hoạt");
        Category audioCat = getOrCreateCategory("Thiết bị âm thanh", "Tai nghe True Wireless, tai nghe chụp tai và loa Bluetooth");
        Category watchCat = getOrCreateCategory("Đồng hồ & Phụ kiện", "Đồng hồ thông minh thể thao và phụ kiện chính hãng");

        if (productRepository.count() >= 20) {
            log.info("Database đã có đủ {} sản phẩm, bỏ qua bước tạo thêm.", productRepository.count());
            return;
        }

        List<Product> products = new ArrayList<>();

        // --- Danh mục: Điện thoại (5 sản phẩm) ---
        addProductIfNotExists(products, "iPhone 15 Pro Max 256GB",
                "Thiết kế Titan chuẩn hàng không vũ trụ siêu bền, trang bị chip A17 Pro mạnh mẽ nhất thế giới smartphone với camera tiềm vọng quang học 5x sắc nét đỉnh cao.",
                new BigDecimal("29990000"), 50, "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600", phoneCat);

        addProductIfNotExists(products, "Samsung Galaxy S24 Ultra 512GB",
                "Đỉnh cao công nghệ với bộ công cụ Galaxy AI thông minh, khung viền Titan sang trọng, bút S-Pen tích hợp và cảm biến camera độ phân giải 200MP bắt trọn mọi khoảnh khắc.",
                new BigDecimal("31490000"), 35, "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600", phoneCat);

        addProductIfNotExists(products, "Xiaomi 14 Ultra 512GB",
                "Hệ thống quang học chuyên nghiệp Leica 4 camera, cảm biến 1-inch sắc nét vượt trội, vi xử lý Snapdragon 8 Gen 3 cùng khả năng sạc siêu tốc 90W HyperCharge.",
                new BigDecimal("24990000"), 25, "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600", phoneCat);

        addProductIfNotExists(products, "Google Pixel 8 Pro 128GB",
                "Trải nghiệm Android thuần khiết với chip Google Tensor G3, thuật toán nhiếp ảnh AI số một thế giới và màn hình Super Actua sáng rực rỡ dưới nắng gắt.",
                new BigDecimal("18990000"), 30, "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600", phoneCat);

        addProductIfNotExists(products, "Asus ROG Phone 8 Pro 512GB",
                "Cỗ máy chiến game tối thượng với màn hình AMOLED 165Hz mượt mà, hệ thống tản nhiệt buồng hơi tân tiến và phím siêu âm AirTrigger hỗ trợ thao tác thần tốc.",
                new BigDecimal("26500000"), 20, "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600", phoneCat);

        // --- Danh mục: Laptop (5 sản phẩm) ---
        addProductIfNotExists(products, "MacBook Pro 14 inch M3 Pro",
                "Hiệu năng chuyên nghiệp vượt trội với chip Apple M3 Pro, màn hình Liquid Retina XDR 120Hz chuẩn màu điện ảnh, thời lượng pin ấn tượng lên tới 18 giờ liên tục.",
                new BigDecimal("49990000"), 15, "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600", laptopCat);

        addProductIfNotExists(products, "MacBook Air 13 inch M3",
                "Thiết kế siêu mỏng nhẹ chỉ 1.24kg, vỏ nhôm nguyên khối bền bỉ, chip Apple M3 xử lý đồ họa mượt mà và vận hành hoàn toàn không cần quạt tản nhiệt yên tĩnh tuyệt đối.",
                new BigDecimal("26990000"), 40, "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600", laptopCat);

        addProductIfNotExists(products, "Dell XPS 13 Plus 9320 Core i7",
                "Tuyệt tác thiết kế tối giản tương lai với bàn rê chuột tàng hình bằng kính, dải phím cảm ứng điện dung và màn hình cảm ứng OLED 3.5K viền siêu mỏng ấn tượng.",
                new BigDecimal("38500000"), 18, "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600", laptopCat);

        addProductIfNotExists(products, "Asus Zenbook 14 OLED Ultra 7",
                "Mẫu laptop đạt chuẩn Intel Evo với chip Core Ultra 7 tích hợp NPU AI thông minh, màn hình OLED 2.8K 120Hz sắc nét và thời lượng pin cả ngày dài làm việc.",
                new BigDecimal("28990000"), 22, "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600", laptopCat);

        addProductIfNotExists(products, "Lenovo Legion Pro 5 Gen 8 RTX 4070",
                "Chiến thần đồ họa và gaming trang bị card rời NVIDIA GeForce RTX 4070 8GB, chip Ryzen 7 mạnh mẽ cùng hệ thống làm mát Legion Coldfront 5.0 hàng đầu.",
                new BigDecimal("41990000"), 12, "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600", laptopCat);

        // --- Danh mục: Máy tính bảng (3 sản phẩm) ---
        addProductIfNotExists(products, "iPad Pro 11 inch M4 Ultra-Retina",
                "Độ mỏng kỷ lục 5.3mm kết hợp màn hình Ultra Retina XDR Tandem OLED đột phá, sức mạnh hủy diệt từ chip Apple M4 thế hệ mới nhất cho công việc sáng tạo.",
                new BigDecimal("28490000"), 25, "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600", tabletCat);

        addProductIfNotExists(products, "iPad Air 6 11 inch M2",
                "Lựa chọn lý tưởng cho học sinh, sinh viên và dân thiết kế với chip M2 cực mạnh, hỗ trợ bút Apple Pencil Pro mới và bàn phím Magic Keyboard cao cấp.",
                new BigDecimal("16290000"), 35, "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600", tabletCat);

        addProductIfNotExists(products, "Samsung Galaxy Tab S9 Ultra",
                "Màn hình Dynamic AMOLED 2X khổng lồ 14.6 inch, chuẩn kháng nước bụi IP68 bền bỉ, tích hợp sẵn bút S-Pen độ trễ siêu thấp và chế độ DeX đa nhiệm máy tính.",
                new BigDecimal("25990000"), 15, "https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=600", tabletCat);

        // --- Danh mục: Thiết bị âm thanh (4 sản phẩm) ---
        addProductIfNotExists(products, "Sony WH-1000XM5 Chống ồn",
                "Tai nghe chụp tai số một thị trường với bộ vi xử lý V1 và QN1 kép, khả năng triệt tiêu tiếng ồn môi trường tuyệt hảo cùng chất âm chi tiết Hi-Res Audio không dây.",
                new BigDecimal("7990000"), 45, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600", audioCat);

        addProductIfNotExists(products, "Apple AirPods Pro 2 USB-C",
                "Công nghệ Chống ồn chủ động (ANC) thế hệ mới gấp 2 lần, tính năng Âm thanh thích ứng thông minh và hộp sạc hỗ trợ cổng USB-C cùng loa tìm kiếm chính xác.",
                new BigDecimal("5490000"), 60, "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600", audioCat);

        addProductIfNotExists(products, "Loa Marshall Stanmore III",
                "Thiết kế vintage cổ điển đặc trưng đậm chất rock & roll, âm trường rộng mở chân thực với công nghệ Dynamic Loudness tối ưu âm thanh ở mọi mức âm lượng.",
                new BigDecimal("8990000"), 20, "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600", audioCat);

        addProductIfNotExists(products, "Loa Bluetooth JBL Charge 5",
                "Âm thanh JBL Original Pro Sound mạnh mẽ bùng nổ, chuẩn chống nước bụi IP67 bền bỉ cùng thời lượng pin 20 tiếng kiêm sạc dự phòng cho điện thoại tiện lợi.",
                new BigDecimal("3490000"), 50, "https://images.unsplash.com/photo-1589003077984-894e133dabab?w=600", audioCat);

        // --- Danh mục: Đồng hồ & Phụ kiện (3 sản phẩm) ---
        addProductIfNotExists(products, "Apple Watch Series 9 GPS 45mm",
                "Chip S9 SiP tiên tiến mang lại cử chỉ chạm hai lần (Double Tap) kỳ diệu, màn hình sáng gấp đôi 2000 nits và tính năng theo dõi sức khỏe chuyên sâu ECG, SpO2.",
                new BigDecimal("9890000"), 30, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", watchCat);

        addProductIfNotExists(products, "Samsung Galaxy Watch 6 Classic",
                "Vòng xoay bezel vật lý sang trọng biểu tượng, phân tích thành phần cơ thể BIA chi tiết, huấn luyện giấc ngủ khoa học và phát hiện té ngã khẩn cấp an tâm.",
                new BigDecimal("7990000"), 28, "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600", watchCat);

        addProductIfNotExists(products, "Garmin Fenix 7 Pro Sapphire Solar",
                "Đồng hồ GPS thể thao đa năng chuyên nghiệp, thấu kính sạc năng lượng mặt trời Power Sapphire, tích hợp đèn pin LED và bản đồ địa hình màu chi tiết toàn cầu.",
                new BigDecimal("19990000"), 15, "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600", watchCat);

        if (!products.isEmpty()) {
            productRepository.saveAll(products);
            log.info("Đã chèn thành công {} sản phẩm mẫu vào Database!", products.size());
        }
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

    private void addProductIfNotExists(List<Product> list, String name, String description,
                                      BigDecimal price, Integer stock, String imageUrl, Category category) {
        if (!productRepository.existsByNameIgnoreCase(name)) {
            list.add(Product.builder()
                    .name(name)
                    .description(description)
                    .price(price)
                    .stock(stock)
                    .imageUrl(imageUrl)
                    .status(true)
                    .category(category)
                    .build());
        }
    }
}
