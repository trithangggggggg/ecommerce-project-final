-- =============================================================================
-- Seed data for NEXOR E-Commerce (nexor_ecommerce_db)
-- Tech Catalog: Phones, Laptops, Tablets, Audio, Accessories
-- =============================================================================

USE nexor_ecommerce_db;

-- 1. Brands
INSERT INTO brands (name, slug, description, country, website_url, logo_url, display_order, status, created_at, updated_at) VALUES
('Apple', 'apple', 'Hãng công nghệ hàng đầu thế giới với hệ sinh thái iPhone, Mac, iPad', 'Mỹ', 'https://apple.com', 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200', 1, 1, NOW(), NOW()),
('Samsung', 'samsung', 'Tập đoàn công nghệ dẫn đầu về màn hình và thiết bị Galaxy AI', 'Hàn Quốc', 'https://samsung.com', 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200', 2, 1, NOW(), NOW()),
('ASUS', 'asus', 'Thương hiệu laptop và phần cứng gaming hàng đầu với dòng ROG đỉnh cao', 'Đài Loan', 'https://asus.com', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200', 3, 1, NOW(), NOW()),
('Sony', 'sony', 'Âm thanh đỉnh cao và công nghệ chống ồn danh tiếng thế giới', 'Nhật Bản', 'https://sony.com', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200', 4, 1, NOW(), NOW()),
('Logitech', 'logitech', 'Thiết bị ngoại vi, chuột và bàn phím làm việc đỉnh cao dòng MX', 'Thụy Sĩ', 'https://logitech.com', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200', 5, 1, NOW(), NOW()),
('Razer', 'razer', 'Thiết bị gaming gear chuyên nghiệp cho game thủ', 'Mỹ', 'https://razer.com', 'https://images.unsplash.com/photo-1612287232230-10174070a98f?w=200', 6, 1, NOW(), NOW()),
('NEXOR', 'nexor', 'Thương hiệu phụ kiện công nghệ chính hãng NEXOR Store', 'Việt Nam', 'https://nexor.vn', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200', 7, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Categories
INSERT INTO categories (id, name, slug, description, status, show_on_home, display_order, created_at, updated_at) VALUES
(1, 'Điện thoại', 'dien-thoai', 'Các dòng điện thoại thông minh chính hãng mới nhất', 1, 1, 1, NOW(), NOW()),
(2, 'Laptop', 'laptop', 'Máy tính xách tay văn phòng và gaming hiệu năng cao', 1, 1, 2, NOW(), NOW()),
(3, 'Máy tính bảng', 'may-tinh-bang', 'Thiết bị giải trí, học tập và làm việc đồ họa linh hoạt', 1, 1, 3, NOW(), NOW()),
(4, 'Thiết bị âm thanh', 'thiet-bi-am-thanh', 'Tai nghe True Wireless, tai nghe chụp tai và loa Bluetooth', 1, 1, 4, NOW(), NOW()),
(5, 'Đồng hồ & Phụ kiện', 'dong-ho-phu-kien', 'Đồng hồ thông minh thể thao và phụ kiện chính hãng', 1, 1, 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name), slug=VALUES(slug);

-- 3. Products
INSERT INTO products (id, name, brand, category_id, price, stock, image_url, description, status, is_deleted, created_at, updated_at) VALUES
(1, 'iPhone 16 Pro Max 256GB Titan Tự Nhiên', 'Apple', 1, 34990000.00, 50, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800', 'iPhone 16 Pro Max khung viền Titan Cấp 5, chip A18 Pro 3nm đỉnh cao, cụm camera 48MP zoom 5x quang học.', 'ACTIVE', 0, NOW(), NOW()),
(2, 'iPhone 15 Pro 128GB Titan Đen (Black Titanium)', 'Apple', 1, 25990000.00, 35, 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800', 'iPhone 15 Pro viền titan siêu nhẹ, Action Button đa năng, chip A17 Pro mạnh mẽ chiến game đồ họa.', 'ACTIVE', 0, NOW(), NOW()),
(3, 'Samsung Galaxy S24 Ultra 256GB Đen', 'Samsung', 1, 25990000.00, 40, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800', 'Samsung Galaxy S24 Ultra hỗ trợ Galaxy AI thông minh, bút S-Pen tiện ích, camera 200MP chụp đêm siêu sắc nét.', 'ACTIVE', 0, NOW(), NOW()),
(4, 'MacBook Pro 14 M3 Pro Space Gray', 'Apple', 2, 45000000.00, 25, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', 'MacBook Pro 14 inch trang bị chip Apple M3 Pro, màn hình Liquid Retina XDR 120Hz, pin 18 tiếng liên tục.', 'ACTIVE', 0, NOW(), NOW()),
(5, 'MacBook Air 13 M3 8GB 256GB Midnight', 'Apple', 2, 26990000.00, 30, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800', 'MacBook Air M3 mỏng nhẹ chỉ 1.24kg, hỗ trợ xuất 2 màn hình ngoài, thời lượng pin cả ngày.', 'ACTIVE', 0, NOW(), NOW()),
(6, 'Laptop Gaming ASUS ROG Strix G16 (2024)', 'ASUS', 2, 36990000.00, 20, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800', 'Laptop Gaming ASUS ROG Strix G16 vi xử lý Intel Core i7 thế hệ mới, GPU RTX 4060, tản nhiệt buồng hơi êm ái.', 'ACTIVE', 0, NOW(), NOW()),
(7, 'iPad Air M2 11 inch WiFi 128GB Xanh', 'Apple', 3, 16990000.00, 30, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800', 'iPad Air M2 màn hình Liquid Retina sắc nét, tương thích Apple Pencil Pro và Magic Keyboard chuyên nghiệp.', 'ACTIVE', 0, NOW(), NOW()),
(8, 'Sony WH-1000XM5 Đen Cao Cấp Chống Ồn', 'Sony', 4, 7990000.00, 45, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', 'Tai nghe chống ồn chủ động hàng đầu thế giới với bộ vi xử lý V1 và QN1, chất âm Hi-Res LDAC đỉnh cao.', 'ACTIVE', 0, NOW(), NOW()),
(9, 'Chuột không dây Logitech MX Master 3S', 'Logitech', 5, 2490000.00, 60, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800', 'Chuột công thái học cao cấp cho dân văn phòng và lập trình viên, bánh lăn MagSpeed cuộn 1.000 dòng/giây, cảm biến Darkfield 8K DPI.', 'ACTIVE', 0, NOW(), NOW()),
(10, 'Bàn phím cơ Logitech MX Mechanical', 'Logitech', 5, 3290000.00, 40, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', 'Bàn phím cơ low-profile chuyên nghiệp kết nối đa thiết bị Bluetooth, switch Tactile Quiet êm ái gõ văn phòng.', 'ACTIVE', 0, NOW(), NOW()),
(11, 'Chuột gaming Razer DeathAdder Essential', 'Razer', 5, 390000.00, 80, 'https://images.unsplash.com/photo-1612287232230-10174070a98f?w=800', 'Chuột gaming quốc dân Razer DeathAdder dáng cầm huyền thoại, cảm biến 6.400 DPI, switch độ bền 10 triệu lượt click.', 'ACTIVE', 0, NOW(), NOW()),
(12, 'Que chọc sim cao cấp', 'NEXOR', 5, 20000.00, 500, 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800', 'Que chọc sim bằng thép không gỉ nguyên khối cao cấp, vát cạnh mịn màng chống xước viền điện thoại.', 'ACTIVE', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), stock=VALUES(stock);

-- 4. Product Variants
INSERT INTO product_variants (product_id, sku, price, stock, status, created_at, updated_at) VALUES
(1, 'IP16PM-256-NAT', 34990000.00, 50, 1, NOW(), NOW()),
(2, 'IP15P-128-BLK', 25990000.00, 35, 1, NOW(), NOW()),
(3, 'SS-S24U-256', 25990000.00, 40, 1, NOW(), NOW()),
(4, 'MBP-M3-GRAY', 45000000.00, 25, 1, NOW(), NOW()),
(5, 'MBA-M3-MID', 26990000.00, 30, 1, NOW(), NOW()),
(6, 'ROG-G16-4060', 36990000.00, 20, 1, NOW(), NOW()),
(7, 'IPAD-AIR-M2', 16990000.00, 30, 1, NOW(), NOW()),
(8, 'SONY-WH1000XM5', 7990000.00, 45, 1, NOW(), NOW()),
(9, 'LOGI-MX-3S', 2490000.00, 60, 1, NOW(), NOW()),
(10, 'LOGI-MX-MECH', 3290000.00, 40, 1, NOW(), NOW()),
(11, 'RAZER-DA-ESS', 390000.00, 80, 1, NOW(), NOW()),
(12, 'NEXOR-SIM-PIN', 20000.00, 500, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE price=VALUES(price), stock=VALUES(stock);
