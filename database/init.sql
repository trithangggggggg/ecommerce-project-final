-- =============================================================================
--  database/init.sql - Khởi tạo Database và Dữ liệu mẫu (20 sản phẩm chuẩn SEO)
--  MySQL tự động chạy file này ở lần khởi động đầu tiên khi container được tạo
-- =============================================================================
SET NAMES utf8mb4;

-- 1. Table: users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone_number VARCHAR(20),
    address VARCHAR(255),
    avatar_url VARCHAR(500),
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: products
CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    status BOOLEAN NOT NULL DEFAULT TRUE,
    category_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_categories FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: orders
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    receiver_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    shipping_address VARCHAR(255) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(30) NOT NULL DEFAULT 'COD',
    note VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: order_items
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_order_items_orders FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_products FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
--  DỮ LIỆU KHỞI TẠO BAN ĐẦU (SEED DATA - 20 SẢN PHẨM MẪU)
-- =============================================================================

-- Mật khẩu mặc định: 123456 (BCrypt encoded)
INSERT INTO users (username, email, password, full_name, phone_number, role, status) VALUES
    ('admin', 'admin@ecommerce.com', '$2a$10$ZOC2.LE7Ps9x.7g6FIQIS.FPOjAmkFwjUxnFeZrVZxE9Gjeaq/YTi', 'Quản trị viên Hệ thống', '0988888888', 'ADMIN', TRUE),
    ('customer', 'customer@ecommerce.com', '$2a$10$ZOC2.LE7Ps9x.7g6FIQIS.FPOjAmkFwjUxnFeZrVZxE9Gjeaq/YTi', 'Nguyễn Văn Khách Hàng', '0912345678', 'CUSTOMER', TRUE)
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO categories (id, name, description, status) VALUES
    (1, 'Điện thoại', 'Các dòng điện thoại thông minh chính hãng mới nhất', TRUE),
    (2, 'Laptop', 'Máy tính xách tay văn phòng và gaming hiệu năng cao', TRUE),
    (3, 'Máy tính bảng', 'Thiết bị giải trí, học tập và làm việc đồ họa linh hoạt', TRUE),
    (4, 'Thiết bị âm thanh', 'Tai nghe True Wireless, tai nghe chụp tai và loa Bluetooth', TRUE),
    (5, 'Đồng hồ & Phụ kiện', 'Đồng hồ thông minh thể thao và phụ kiện chính hãng', TRUE)
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO products (id, name, description, price, stock, image_url, status, category_id) VALUES
    (1, 'iPhone 15 Pro Max 256GB', 'Thiết kế Titan chuẩn hàng không vũ trụ siêu bền, trang bị chip A17 Pro mạnh mẽ nhất thế giới smartphone với camera tiềm vọng quang học 5x sắc nét đỉnh cao.', 29990000.00, 50, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600', TRUE, 1),
    (2, 'Samsung Galaxy S24 Ultra 512GB', 'Đỉnh cao công nghệ với bộ công cụ Galaxy AI thông minh, khung viền Titan sang trọng, bút S-Pen tích hợp và cảm biến camera độ phân giải 200MP bắt trọn mọi khoảnh khắc.', 31490000.00, 35, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600', TRUE, 1),
    (3, 'Xiaomi 14 Ultra 512GB', 'Hệ thống quang học chuyên nghiệp Leica 4 camera, cảm biến 1-inch sắc nét vượt trội, vi xử lý Snapdragon 8 Gen 3 cùng khả năng sạc siêu tốc 90W HyperCharge.', 24990000.00, 25, 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600', TRUE, 1),
    (4, 'Google Pixel 8 Pro 128GB', 'Trải nghiệm Android thuần khiết với chip Google Tensor G3, thuật toán nhiếp ảnh AI số một thế giới và màn hình Super Actua sáng rực rỡ dưới nắng gắt.', 18990000.00, 30, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600', TRUE, 1),
    (5, 'Asus ROG Phone 8 Pro 512GB', 'Cỗ máy chiến game tối thượng với màn hình AMOLED 165Hz mượt mà, hệ thống tản nhiệt buồng hơi tân tiến và phím siêu âm AirTrigger hỗ trợ thao tác thần tốc.', 26500000.00, 20, 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600', TRUE, 1),
    (6, 'MacBook Pro 14 inch M3 Pro', 'Hiệu năng chuyên nghiệp vượt trội với chip Apple M3 Pro, màn hình Liquid Retina XDR 120Hz chuẩn màu điện ảnh, thời lượng pin ấn tượng lên tới 18 giờ liên tục.', 49990000.00, 15, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', TRUE, 2),
    (7, 'MacBook Air 13 inch M3', 'Thiết kế siêu mỏng nhẹ chỉ 1.24kg, vỏ nhôm nguyên khối bền bỉ, chip Apple M3 xử lý đồ họa mượt mà và vận hành hoàn toàn không cần quạt tản nhiệt yên tĩnh tuyệt đối.', 26990000.00, 40, 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600', TRUE, 2),
    (8, 'Dell XPS 13 Plus 9320 Core i7', 'Tuyệt tác thiết kế tối giản tương lai với bàn rê chuột tàng hình bằng kính, dải phím cảm ứng điện dung và màn hình cảm ứng OLED 3.5K viền siêu mỏng ấn tượng.', 38500000.00, 18, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600', TRUE, 2),
    (9, 'Asus Zenbook 14 OLED Ultra 7', 'Mẫu laptop đạt chuẩn Intel Evo với chip Core Ultra 7 tích hợp NPU AI thông minh, màn hình OLED 2.8K 120Hz sắc nét và thời lượng pin cả ngày dài làm việc.', 28990000.00, 22, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600', TRUE, 2),
    (10, 'Lenovo Legion Pro 5 Gen 8 RTX 4070', 'Chiến thần đồ họa và gaming trang bị card rời NVIDIA GeForce RTX 4070 8GB, chip Ryzen 7 mạnh mẽ cùng hệ thống làm mát Legion Coldfront 5.0 hàng đầu.', 41990000.00, 12, 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600', TRUE, 2),
    (11, 'iPad Pro 11 inch M4 Ultra-Retina', 'Độ mỏng kỷ lục 5.3mm kết hợp màn hình Ultra Retina XDR Tandem OLED đột phá, sức mạnh hủy diệt từ chip Apple M4 thế hệ mới nhất cho công việc sáng tạo.', 28490000.00, 25, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600', TRUE, 3),
    (12, 'iPad Air 6 11 inch M2', 'Lựa chọn lý tưởng cho học sinh, sinh viên và dân thiết kế với chip M2 cực mạnh, hỗ trợ bút Apple Pencil Pro mới và bàn phím Magic Keyboard cao cấp.', 16290000.00, 35, 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600', TRUE, 3),
    (13, 'Samsung Galaxy Tab S9 Ultra', 'Màn hình Dynamic AMOLED 2X khổng lồ 14.6 inch, chuẩn kháng nước bụi IP68 bền bỉ, tích hợp sẵn bút S-Pen độ trễ siêu thấp và chế độ DeX đa nhiệm máy tính.', 25990000.00, 15, 'https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=600', TRUE, 3),
    (14, 'Sony WH-1000XM5 Chống ồn', 'Tai nghe chụp tai số một thị trường với bộ vi xử lý V1 và QN1 kép, khả năng triệt tiêu tiếng ồn môi trường tuyệt hảo cùng chất âm chi tiết Hi-Res Audio không dây.', 7990000.00, 45, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', TRUE, 4),
    (15, 'Apple AirPods Pro 2 USB-C', 'Công nghệ Chống ồn chủ động (ANC) thế hệ mới gấp 2 lần, tính năng Âm thanh thích ứng thông minh và hộp sạc hỗ trợ cổng USB-C cùng loa tìm kiếm chính xác.', 5490000.00, 60, 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600', TRUE, 4),
    (16, 'Loa Marshall Stanmore III', 'Thiết kế vintage cổ điển đặc trưng đậm chất rock & roll, âm trường rộng mở chân thực với công nghệ Dynamic Loudness tối ưu âm thanh ở mọi mức âm lượng.', 8990000.00, 20, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600', TRUE, 4),
    (17, 'Loa Bluetooth JBL Charge 5', 'Âm thanh JBL Original Pro Sound mạnh mẽ bùng nổ, chuẩn chống nước bụi IP67 bền bỉ cùng thời lượng pin 20 tiếng kiêm sạc dự phòng cho điện thoại tiện lợi.', 3490000.00, 50, 'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=600', TRUE, 4),
    (18, 'Apple Watch Series 9 GPS 45mm', 'Chip S9 SiP tiên tiến mang lại cử chỉ chạm hai lần (Double Tap) kỳ diệu, màn hình sáng gấp đôi 2000 nits và tính năng theo dõi sức khỏe chuyên sâu ECG, SpO2.', 9890000.00, 30, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', TRUE, 5),
    (19, 'Samsung Galaxy Watch 6 Classic', 'Vòng xoay bezel vật lý sang trọng biểu tượng, phân tích thành phần cơ thể BIA chi tiết, huấn luyện giấc ngủ khoa học và phát hiện té ngã khẩn cấp an tâm.', 7990000.00, 28, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600', TRUE, 5),
    (20, 'Garmin Fenix 7 Pro Sapphire Solar', 'Đồng hồ GPS thể thao đa năng chuyên nghiệp, thấu kính sạc năng lượng mặt trời Power Sapphire, tích hợp đèn pin LED và bản đồ địa hình màu chi tiết toàn cầu.', 19990000.00, 15, 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600', TRUE, 5)
ON DUPLICATE KEY UPDATE id=id;
