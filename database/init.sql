-- =============================================================================
--  database/init.sql - Khởi tạo Database và Dữ liệu mẫu cho Dự án E-Commerce
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
--  DỮ LIỆU KHỞI TẠO BAN ĐẦU (SEED DATA)
-- =============================================================================

-- Mật khẩu mặc định: 123456 (đã mã hóa BCrypt)
-- $2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG
INSERT INTO users (username, email, password, full_name, phone_number, role, status) VALUES
    ('admin', 'admin@ecommerce.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'Quản trị viên Hệ thống', '0988888888', 'ADMIN', TRUE),
    ('customer', 'customer@ecommerce.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'Nguyễn Văn Khách Hàng', '0912345678', 'CUSTOMER', TRUE)
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO categories (id, name, description, status) VALUES
    (1, 'Điện thoại', 'Các dòng điện thoại thông minh chính hãng mới nhất', TRUE),
    (2, 'Laptop', 'Máy tính xách tay văn phòng và gaming hiệu năng cao', TRUE),
    (3, 'Phụ kiện', 'Tai nghe, cáp sạc, ốp lưng và phụ kiện thông minh', TRUE),
    (4, 'Đồng hồ', 'Đồng hồ thông minh và thể thao chính hãng', TRUE)
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO products (id, name, description, price, stock, image_url, status, category_id) VALUES
    (1, 'iPhone 15 Pro Max 256GB', 'Thiết kế Titan chuẩn hàng không vũ trụ, chip A17 Pro mạnh mẽ hàng đầu thế giới.', 29990000.00, 50, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600', TRUE, 1),
    (2, 'Samsung Galaxy S24 Ultra', 'Trải nghiệm đỉnh cao với trợ lý thông minh Galaxy AI và camera 200MP xuất sắc.', 27490000.00, 35, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600', TRUE, 1),
    (3, 'MacBook Air M3 15 inch', 'Thiết kế siêu mỏng nhẹ, pin 18 tiếng, hiệu năng vượt bậc với chip Apple M3.', 32990000.00, 20, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', TRUE, 2),
    (4, 'Dell XPS 13 Plus 9320', 'Tuyệt tác thiết kế viền vô cực, màn hình OLED 3.5K sắc nét và bàn phím cảm ứng.', 35990000.00, 15, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600', TRUE, 2),
    (5, 'Tai nghe Sony WH-1000XM5', 'Công nghệ chống ồn chủ động đỉnh cao, thời lượng pin 30 giờ liên tục.', 7990000.00, 40, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', TRUE, 3),
    (6, 'Apple Watch Series 9 GPS', 'Màn hình sáng gấp đôi, tính năng chạm hai lần tiện lợi, theo dõi sức khỏe toàn diện.', 9890000.00, 30, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', TRUE, 4)
ON DUPLICATE KEY UPDATE id=id;
