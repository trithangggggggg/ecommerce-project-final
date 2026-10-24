-- =============================================================================
--  scripts/seed_customers_and_orders.sql
--  Khởi tạo dữ liệu khách hàng thật và đơn hàng thật 100% trong MySQL
-- =============================================================================
USE ecommerce_db;

-- 1. Thêm khách hàng vào bảng users
INSERT INTO users (username, email, password, full_name, phone_number, address, avatar_url, role, status, created_at)
VALUES
    ('minh.nguyen', 'minh.nguyen@gmail.com', '$2a$10$ZOC2.LE7Ps9x.7g6FIQIS.FPOjAmkFwjUxnFeZrVZxE9Gjeaq/YTi', 'Nguyễn Văn Minh', '0912 345 678', 'Tòa Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', 'CUSTOMER', TRUE, '2025-01-15 10:00:00'),
    ('mai.tran', 'mai.tran@outlook.com', '$2a$10$ZOC2.LE7Ps9x.7g6FIQIS.FPOjAmkFwjUxnFeZrVZxE9Gjeaq/YTi', 'Trần Thị Mai', '0987 654 321', '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', 'CUSTOMER', TRUE, '2025-02-02 11:30:00'),
    ('nam.lehoang', 'nam.lehoang@company.vn', '$2a$10$ZOC2.LE7Ps9x.7g6FIQIS.FPOjAmkFwjUxnFeZrVZxE9Gjeaq/YTi', 'Lê Hoàng Nam', '0905 123 456', '88 Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100', 'CUSTOMER', TRUE, '2025-02-20 14:15:00'),
    ('huong.do', 'huong.do@fpt.edu.vn', '$2a$10$ZOC2.LE7Ps9x.7g6FIQIS.FPOjAmkFwjUxnFeZrVZxE9Gjeaq/YTi', 'Đỗ Thu Hương', '0933 221 100', '12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100', 'CUSTOMER', TRUE, '2025-03-01 09:20:00'),
    ('tuan.pham', 'tuan.pham@techcorp.vn', '$2a$10$ZOC2.LE7Ps9x.7g6FIQIS.FPOjAmkFwjUxnFeZrVZxE9Gjeaq/YTi', 'Phạm Quốc Tuấn', '0944 556 677', '250 Hoàng Diệu 2, Linh Chiểu, TP. Thủ Đức, TP.HCM', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', 'CUSTOMER', TRUE, '2025-03-10 16:45:00'),
    ('khanh.vu', 'khanh.vu@gmail.com', '$2a$10$ZOC2.LE7Ps9x.7g6FIQIS.FPOjAmkFwjUxnFeZrVZxE9Gjeaq/YTi', 'Vũ Duy Khánh', '0977 889 900', '15 Lê Lợi, Phường Phú Nhuận, TP. Huế', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', 'CUSTOMER', FALSE, '2025-03-15 13:10:00')
ON DUPLICATE KEY UPDATE 
    full_name = VALUES(full_name),
    phone_number = VALUES(phone_number),
    address = VALUES(address),
    avatar_url = VALUES(avatar_url),
    status = VALUES(status);

-- 2. Thêm đơn hàng thực tế vào bảng orders
-- Lấy id của các user vừa thêm
SET @user_minh = (SELECT id FROM users WHERE username = 'minh.nguyen' LIMIT 1);
SET @user_mai  = (SELECT id FROM users WHERE username = 'mai.tran' LIMIT 1);
SET @user_nam  = (SELECT id FROM users WHERE username = 'nam.lehoang' LIMIT 1);
SET @user_huong = (SELECT id FROM users WHERE username = 'huong.do' LIMIT 1);
SET @user_tuan = (SELECT id FROM users WHERE username = 'tuan.pham' LIMIT 1);
SET @user_khanh = (SELECT id FROM users WHERE username = 'khanh.vu' LIMIT 1);

-- Xóa dữ liệu đơn hàng cũ nếu có trước khi chèn chuẩn
DELETE FROM order_items;
DELETE FROM orders;

-- Đơn 1: PENDING
INSERT INTO orders (id, user_id, receiver_name, phone_number, shipping_address, total_amount, status, payment_method, note, created_at)
VALUES (1001, @user_minh, 'Nguyễn Văn Minh', '0912 345 678', 'Tòa Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM', 30990000.00, 'PENDING', 'COD', 'Giao trong giờ hành chính, gọi trước 15 phút', '2026-10-21 16:30:00');

INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
VALUES (1001, 1, 1, 30990000.00, 30990000.00);

-- Đơn 2: PROCESSING
INSERT INTO orders (id, user_id, receiver_name, phone_number, shipping_address, total_amount, status, payment_method, note, created_at)
VALUES (1002, @user_mai, 'Trần Thị Mai', '0987 654 321', '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 23990000.00, 'PROCESSING', 'BANK_TRANSFER', 'Kiểm tra kỹ seal hộp giúp mình nhé', '2026-10-21 17:15:00');

INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
VALUES (1002, 9, 1, 23990000.00, 23990000.00);

-- Đơn 3: SHIPPING
INSERT INTO orders (id, user_id, receiver_name, phone_number, shipping_address, total_amount, status, payment_method, note, created_at)
VALUES (1003, @user_nam, 'Lê Hoàng Nam', '0905 123 456', '88 Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng', 27490000.00, 'SHIPPING', 'VNPAY', 'Giao hỏa tốc, gọi trước khi đến', '2026-10-21 18:00:00');

INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
VALUES (1003, 2, 1, 27490000.00, 27490000.00);

-- Đơn 4: COMPLETED
INSERT INTO orders (id, user_id, receiver_name, phone_number, shipping_address, total_amount, status, payment_method, note, created_at)
VALUES (1004, @user_huong, 'Đỗ Thu Hương', '0933 221 100', '12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội', 36680000.00, 'COMPLETED', 'COD', 'Đã nhận đủ quà tặng kèm theo', '2026-10-20 14:00:00');

INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
VALUES 
    (1004, 3, 1, 18990000.00, 18990000.00),
    (1004, 5, 1, 17690000.00, 17690000.00);

-- Đơn 5: COMPLETED
INSERT INTO orders (id, user_id, receiver_name, phone_number, shipping_address, total_amount, status, payment_method, note, created_at)
VALUES (1005, @user_tuan, 'Phạm Quốc Tuấn', '0944 556 677', '250 Hoàng Diệu 2, Linh Chiểu, TP. Thủ Đức, TP.HCM', 14990000.00, 'COMPLETED', 'BANK_TRANSFER', 'Đơn hàng mua cho nhân viên công ty', '2026-10-19 10:30:00');

INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
VALUES (1005, 6, 1, 14990000.00, 14990000.00);

-- Đơn 6: CANCELLED
INSERT INTO orders (id, user_id, receiver_name, phone_number, shipping_address, total_amount, status, payment_method, note, created_at)
VALUES (1006, @user_khanh, 'Vũ Duy Khánh', '0977 889 900', '15 Lê Lợi, Phường Phú Nhuận, TP. Huế', 18990000.00, 'CANCELLED', 'COD', 'Khách hàng đổi ý muốn đổi sang dòng sản phẩm khác', '2026-10-18 09:00:00');

INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
VALUES (1006, 4, 1, 18990000.00, 18990000.00);

-- Tự động cập nhật thông tin snapshot cho order_items
UPDATE order_items oi
JOIN products p ON p.id = oi.product_id
LEFT JOIN (
    SELECT product_id, MIN(id) as id, MIN(sku) as sku
    FROM product_variants
    GROUP BY product_id
) pv ON pv.product_id = p.id
SET 
    oi.variant_id = pv.id,
    oi.product_name = p.name,
    oi.variant_name = 'Tiêu chuẩn',
    oi.sku = COALESCE(pv.sku, CONCAT('SKU-P', p.id, '-STD'))
WHERE oi.product_name IS NULL;

