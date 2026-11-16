-- =============================================================================
--  data-seed.sql - Dữ liệu khởi tạo mẫu ban đầu (Categories, Suppliers, Articles)
--  Được nạp tự động qua ResourceDatabasePopulator khi bảng chưa có dữ liệu.
-- =============================================================================

-- 1. Danh mục sản phẩm (Categories)
INSERT INTO categories (name, description, status) VALUES
('Điện thoại', 'Các dòng điện thoại thông minh chính hãng mới nhất', true),
('Laptop', 'Máy tính xách tay văn phòng và gaming hiệu năng cao', true),
('Máy tính bảng', 'Thiết bị giải trí, học tập và làm việc đồ họa linh hoạt', true),
('Thiết bị âm thanh', 'Tai nghe True Wireless, tai nghe chụp tai và loa Bluetooth', true),
('Đồng hồ & Phụ kiện', 'Đồng hồ thông minh thể thao và phụ kiện chính hãng', true);

-- 2. Nhà cung cấp (Suppliers)
INSERT INTO suppliers (code, name, brand, contact, email, address, status) VALUES
('NCC-APPLE-VN', 'Apple Vietnam Authorized Distributor', 'Apple', '028 3822 1234', 'distribution@apple.vn', 'Tòa nhà Deutsches Haus, Lê Duẩn, Quận 1, TP.HCM', 'ACTIVE'),
('NCC-SAMSUNG', 'Samsung Electronics Vina Corporation', 'Samsung', '024 3755 8888', 'b2b.partner@samsung.com', 'Tòa nhà Bitexco Financial Tower, Quận 1, TP.HCM', 'ACTIVE'),
('NCC-FPT-SYNNEX', 'FPT Synnex Distribution Co., Ltd', 'Dell, HP, Asus, Lenovo', '024 7300 6666', 'synnex.tech@fpt.com', 'Tòa nhà FPT Cầu Giấy, Duy Tân, Cầu Giấy, Hà Nội', 'ACTIVE'),
('NCC-DIGIWORLD', 'DGW - Digiworld Corporation', 'Xiaomi, Sony, Acer', '028 3929 0059', 'partner@digiworld.com.vn', 'Số 195 Cô Bắc, Phường Cô Giang, Quận 1, TP.HCM', 'ACTIVE'),
('NCC-PETROSETCO', 'PSD - Petrosetco Distribution', 'Apple, Microsoft, Corsair', '028 3911 8888', 'contact@psd.com.vn', 'Số 1-5 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM', 'ACTIVE'),
('NCC-VINH-XUAN', 'Vĩnh Xuân Computer (SPC)', 'ASUS, Gigabyte, MSI', '024 3943 9121', 'sales@spc.com.vn', 'Số 39 Trần Quốc Toản, Hàng Bài, Hoàn Kiếm, Hà Nội', 'ACTIVE'),
('NCC-VIEN-SON', 'Viễn Sơn Distribution (Micro-Star)', 'MSI, Kingston, ViewSonic', '028 3832 6085', 'info@microstar.vn', 'Số 175 Bùi Thị Xuân, Phường Phạm Ngũ Lão, Quận 1, TP.HCM', 'ACTIVE'),
('NCC-ELITE-VN', 'Elite Technology JSC', 'Cisco, Fortinet, HP Enterprise', '028 3512 3959', 'sales@elite-jsc.com', 'Tòa nhà Rosana, 60 Nguyễn Đình Chiểu, Quận 1, TP.HCM', 'INACTIVE'),
('NCC-KTC-TECH', 'KTC Co., Ltd (Khải Thiên)', 'Logitech, SanDisk, WD', '028 3835 1515', 'distribution@ktc.com.vn', '384 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP.HCM', 'ACTIVE'),
('NCC-MEGATECH', 'Mega Technology Group', 'Anker, Baseus, Ugreen', '024 3783 4567', 'partner@megatech.vn', 'Số 12 Duy Tân, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội', 'ACTIVE'),
('NCC-LOGITECH-VN', 'Logitech Vietnam Representative Office', 'Logitech, Astro Gaming', '028 3910 7799', 'vietnam.b2b@logitech.com', 'Tòa nhà Saigon Tower, Lê Duẩn, Quận 1, TP.HCM', 'ACTIVE'),
('NCC-LG-VN', 'LG Electronics Vietnam Hải Phòng', 'LG Monitors, Gram Laptops', '0225 883 1000', 'b2b.lg@lge.com', 'KCN Tràng Duệ, An Dương, TP. Hải Phòng', 'ACTIVE'),
('NCC-AUDIO-TECH', 'Audio Technica & Marshall VN Distro', 'Marshall, JBL, Harman Kardon', '028 3930 9999', 'sound.partner@audio.vn', '180 Nam Kỳ Khởi Nghĩa, Phường 6, Quận 3, TP.HCM', 'ACTIVE'),
('NCC-INTEL-VN', 'Intel Products Vietnam Co., Ltd', 'Intel Core, Arc GPU', '028 3736 3000', 'partner.relations@intel.com', 'Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM', 'INACTIVE');

-- 3. Bài viết tin tức mẫu (Articles)
INSERT INTO articles (title, slug, summary, content, author, status, is_featured, views_count, thumbnail_url) VALUES
('Đánh giá MacBook Air M3: Đỉnh cao laptop mỏng nhẹ cho lập trình viên và sinh viên', 'danh-gia-macbook-air-m3-dinh-cao-laptop-mong-nhe-cho-lap-trinh-vien-va-sinh-vien', 'MacBook Air M3 mang lại hiệu năng ấn tượng, thời lượng pin cả ngày và khả năng xuất 2 màn hình ngoài. Cùng tìm hiểu xem đây có phải là chiếc máy đáng nâng cấp nhất năm 2026?', '<h2>1. Thiết kế sang trọng, tinh tế đến từng đường nét</h2><p>MacBook Air M3 vẫn duy trì ngôn ngữ thiết kế vuông vức hiện đại, siêu mỏng nhẹ chỉ 1.24 kg. Vỏ nhôm nguyên khối tái chế 100% thân thiện với môi trường.</p><h2>2. Sức mạnh đột phá từ con chip Apple M3</h2><p>Chip M3 được sản xuất trên tiến trình 3nm tiên tiến, đem đến bước nhảy vọt về hiệu suất đồ họa GPU Ray Tracing.</p>', 'Ban Biên Tập NEXOR', 'PUBLISHED', true, 1280, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'),
('So sánh iPhone 16 Pro Max và Galaxy S24 Ultra: Cuộc đối đầu đỉnh cao công nghệ 2026', 'so-sanh-iphone-16-pro-max-va-galaxy-s24-ultra-cuoc-doi-dau-dinh-cao-cong-nghe-2026', 'Phân tích chi tiết thiết kế khung titan, sức mạnh chip A18 Pro vs Snapdragon 8 Gen 3, khả năng zoom tiềm vọng và hệ sinh thái Galaxy AI đối đầu Apple Intelligence.', '<h2>1. Thiết kế khung Titan và cảm giác cầm nắm</h2><p>Cả iPhone 16 Pro Max và Galaxy S24 Ultra đều sử dụng khung viền Titan cao cấp mang lại vẻ đẹp bóng bẩy và độ bền bỉ vượt thời gian.</p><h2>2. Hiệu năng xử lý và trí tuệ nhân tạo AI</h2><p>Hai siêu phẩm đều trang bị những vi xử lý hàng đầu cùng hệ thống camera chụp đêm đột phá.</p>', 'Chuyên gia Công nghệ NEXOR', 'PUBLISHED', true, 2150, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800'),
('Top 5 tai nghe chống ồn chủ động (ANC) tốt nhất 2026 cho người yêu âm nhạc', 'top-5-tai-nghe-chong-on-chu-dong-anc-tot-nhat-2026-cho-nguoi-yeu-am-nhac', 'Khám phá những mẫu tai nghe True Wireless và Over-ear có công nghệ chống ồn đỉnh cao, chất âm trung thực từ Sony, Apple, Bose và Marshall.', '<h2>1. Sony WF-1000XM5: Vua chống ồn True Wireless</h2><p>Sở hữu bộ xử lý tích hợp V2 và chip chống ồn HD QN2e mang lại không gian tĩnh lặng tuyệt đối dù bạn đang ở sân bay hay quán cafe ồn ào.</p>', 'Reviewer Âm thanh NEXOR', 'PUBLISHED', false, 890, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800');

