-- =============================================================================
--  database/init.sql - Khởi tạo cấu trúc Database và Tài khoản mặc định hệ thống
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
    brand VARCHAR(100) NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    status BOOLEAN NOT NULL DEFAULT TRUE,
    category_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_products_brand (brand),
    CONSTRAINT fk_products_categories FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: product_options
CREATE TABLE IF NOT EXISTS product_options (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_product_options_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: product_option_values
CREATE TABLE IF NOT EXISTS product_option_values (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    option_id BIGINT NOT NULL,
    value VARCHAR(100) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_option_values_option FOREIGN KEY (option_id) REFERENCES product_options (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table: product_variants
CREATE TABLE IF NOT EXISTS product_variants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2) NULL,
    stock INT NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table: variant_option_values
CREATE TABLE IF NOT EXISTS variant_option_values (
    variant_id BIGINT NOT NULL,
    option_value_id BIGINT NOT NULL,
    PRIMARY KEY (variant_id, option_value_id),
    CONSTRAINT fk_vov_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
    CONSTRAINT fk_vov_option_value FOREIGN KEY (option_value_id) REFERENCES product_option_values (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table: product_specs
CREATE TABLE IF NOT EXISTS product_specs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    group_name VARCHAR(100),
    spec_key VARCHAR(150) NOT NULL,
    spec_value TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_specs_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table: product_images
CREATE TABLE IF NOT EXISTS product_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    variant_id BIGINT NULL,
    url VARCHAR(500) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table: orders
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

-- 11. Table: order_items
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NULL,
    variant_id BIGINT NULL,
    product_name VARCHAR(255) NULL,
    variant_name VARCHAR(255) NULL,
    sku VARCHAR(100) NULL,
    quantity INT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_order_items_orders FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_products FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
    CONSTRAINT fk_order_items_variants FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
--  DỮ LIỆU KHỞI TẠO BAN ĐẦU (SEED DATA MẶC ĐỊNH HỆ THỐNG)
-- =============================================================================

-- Dữ liệu tài khoản khởi tạo ban đầu:
-- 1. Tài khoản Quản trị viên (ADMIN): admin@nexor.vn / 123123123 (mật khẩu mã hóa BCrypt)
-- 2. Tài khoản Khách hàng (CUSTOMER): customer@nexor.vn / 123123123 (mật khẩu mã hóa BCrypt)
INSERT INTO users (id, username, email, password, full_name, phone_number, address, avatar_url, role, status, created_at) VALUES
    (1, 'admin', 'admin@nexor.vn', '$2a$10$cTcGCWb2IxeKrcP8xIFUBuEYSHQTBqqQs36ewXVkSyOC9jf9nWwR2', 'Quản trị viên Hệ thống', '0988888888', 'Tòa nhà NEXOR Flagship, Hà Nội', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'ADMIN', TRUE, '2025-01-01 00:00:00'),
    (2, 'customer', 'customer@nexor.vn', '$2a$10$cTcGCWb2IxeKrcP8xIFUBuEYSHQTBqqQs36ewXVkSyOC9jf9nWwR2', 'Khách hàng Mẫu', '0912345678', 'Tòa nhà NEXOR Flagship, Hà Nội', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'CUSTOMER', TRUE, '2025-01-01 00:00:00')
ON DUPLICATE KEY UPDATE 
    username = VALUES(username),
    email = VALUES(email),
    password = VALUES(password),
    role = VALUES(role),
    status = VALUES(status);

-- Danh mục sản phẩm chuẩn:
INSERT INTO categories (id, name, description, status) VALUES
    (1, 'Điện thoại', 'Các dòng điện thoại thông minh chính hãng mới nhất', TRUE),
    (2, 'Laptop', 'Máy tính xách tay văn phòng và gaming hiệu năng cao', TRUE),
    (3, 'Máy tính bảng', 'Thiết bị giải trí, học tập và làm việc đồ họa linh hoạt', TRUE),
    (4, 'Tai nghe', 'Tai nghe True Wireless, tai nghe chống ồn và thiết bị âm thanh', TRUE),
    (5, 'Đồng hồ thông minh', 'Smartwatch thể thao, chăm sóc sức khỏe và thời trang', TRUE),
    (6, 'Phụ kiện công nghệ', 'Củ sạc nhanh, chuột máy tính, thẻ nhớ và phụ kiện chính hãng', TRUE),
    (7, 'Thiết bị âm thanh', 'Tai nghe True Wireless, tai nghe chụp tai và loa Bluetooth', TRUE),
    (8, 'Đồng hồ & Phụ kiện', 'Đồng hồ thông minh thể thao và phụ kiện chính hãng', TRUE)
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    description = VALUES(description),
    status = VALUES(status);

-- 5 sản phẩm chính thức của hệ thống (theo giao diện thực tế):
INSERT INTO products (id, name, brand, description, price, stock, image_url, status, category_id) VALUES
    (1, 'Chuột không dây Razer DeathAdder V3 Pro', 'Razer', 'Chuột gaming không dây Razer DeathAdder V3 Pro siêu nhẹ chỉ 63g, thiết kế công thái học hoàn hảo cho game thủ eSports. Trang bị cảm biến quang học Razer Focus Pro 30K DPI chính xác từng milimet, switch chuột quang học Gen-3 bền bỉ 90 triệu lần nhấn và thời lượng pin vượt trội lên tới 90 giờ hoạt động liên tục.', 2050000.00, 50, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763665/chu%E1%BB%99t_gaming_razer_deathadder_essential_m5s1he.jpg', TRUE, 8),
    (2, 'Bảng vẽ màn hình XP-Pen Artist 24 Pro QHD hiển thị 2K', 'XP-Pen', 'Bảng vẽ màn hình đồ họa chuyên nghiệp XP-Pen Artist 24 Pro kích thước 23.8 inch độ phân giải 2K QHD (2560 x 1440), hiển thị màu sắc rực rỡ với độ phủ 90% Adobe RGB. Trang bị bút cảm ứng không pin 8192 mức lực nhấn, hỗ trợ góc nghiêng 60 độ cùng 20 phím tắt và 2 nút xoay điều khiển linh hoạt.', 25290000.00, 20, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_bang_ve_dien_tru_r1iezy.jpg', TRUE, 3),
    (3, 'Tai nghe HyperX Cloud III Red', 'HyperX', 'Tai nghe gaming chụp tai HyperX Cloud III Red huyền thoại kế thừa chất âm đỉnh cao với củ loa góc nghiêng 53mm được tinh chỉnh bởi các kỹ sư âm thanh HyperX. Đệm tai bằng mút hoạt tính êm ái bọc da cao cấp, khung kim loại bền bỉ, micro 10mm khử ồn trong trẻo và công nghệ âm thanh không gian DTS Headphone:X Spatial Audio.', 1989000.00, 35, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_tai_nghe_hyper_cloud_3_bwvebf.jpg', TRUE, 7),
    (4, 'Laptop ASUS ROG Strix G16', 'ASUS', 'Chiến hạm gaming đỉnh cao ASUS ROG Strix G16 trang bị vi xử lý Intel Core i9 thế hệ 14 siêu mạnh mẽ kết hợp cùng card đồ họa rời NVIDIA GeForce RTX 40 series. Màn hình ROG Nebula Display 16 inch 2.5K tần số quét 240Hz siêu mượt, công nghệ tản nhiệt 3 quạt Tri-Fan và keo tản nhiệt kim loại lỏng Conductonaut Extreme.', 52990000.00, 15, '/images/asus-rog-strix.jpg', TRUE, 2),
    (5, 'Laptop ASUS TUF Gaming F15', 'ASUS', 'Laptop gaming bền bỉ đạt chuẩn quân sự Mỹ MIL-STD-810H ASUS TUF Gaming F15. Trang bị vi xử lý Intel Core i5-11400H, card đồ họa rời NVIDIA GeForce RTX 2050 4GB, bộ nhớ RAM 16GB DDR4 và ổ cứng SSD 512GB NVMe. Màn hình 15.6 inch Full HD 144Hz cho trải nghiệm gaming mượt mà, sống động.', 16990000.00, 25, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/asus_tuf_f15_fxuvax.jpg', TRUE, 2)
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    brand = VALUES(brand),
    description = VALUES(description),
    price = VALUES(price),
    stock = VALUES(stock),
    image_url = VALUES(image_url),
    status = VALUES(status),
    category_id = VALUES(category_id);

-- Biến thể của các sản phẩm:
INSERT INTO product_variants (id, product_id, sku, price, original_price, stock, image_url, status) VALUES
    (1, 1, 'RAZER-DA-V3-PRO-BLK', 2050000.00, NULL, 50, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763665/chu%E1%BB%99t_gaming_razer_deathadder_essential_m5s1he.jpg', TRUE),
    (2, 2, 'XPPEN-ARTIST-24-PRO-2K', 25290000.00, NULL, 20, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_bang_ve_dien_tru_r1iezy.jpg', TRUE),
    (3, 3, 'HYPERX-CLOUD-3-RED', 1989000.00, 2799000.00, 35, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_tai_nghe_hyper_cloud_3_bwvebf.jpg', TRUE),
    (4, 4, 'ASUS-ROG-STRIX-G16-RTX40', 52990000.00, 57990000.00, 15, '/images/asus-rog-strix.jpg', TRUE),
    (5, 5, 'ASUS-TUF-GAMING-F15-144HZ', 16990000.00, 21990000.00, 25, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/asus_tuf_f15_fxuvax.jpg', TRUE)
ON DUPLICATE KEY UPDATE price=VALUES(price), stock=VALUES(stock);

-- Ảnh sản phẩm:
INSERT INTO product_images (id, product_id, url, position) VALUES
    (1, 1, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763665/chu%E1%BB%99t_gaming_razer_deathadder_essential_m5s1he.jpg', 0),
    (2, 2, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_bang_ve_dien_tru_r1iezy.jpg', 0),
    (3, 3, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_tai_nghe_hyper_cloud_3_bwvebf.jpg', 0),
    (4, 4, '/images/asus-rog-strix.jpg', 0),
    (5, 5, 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/asus_tuf_f15_fxuvax.jpg', 0)
ON DUPLICATE KEY UPDATE url=VALUES(url);
