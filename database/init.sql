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
    (6, 'Phụ kiện công nghệ', 'Củ sạc nhanh, chuột máy tính, thẻ nhớ và phụ kiện chính hãng', TRUE)
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    description = VALUES(description),
    status = VALUES(status);
