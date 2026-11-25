USE nexor_ecommerce_db;

INSERT INTO users (username, email, password, full_name, phone_number, address, role, status, created_at, updated_at) VALUES
('admin', 'admin@nexor.vn', '$2a$10$HSNlapqk9gPaEcEWXfmqgucvvnr9oOOVRWMjZuX1.KAeiIpI.kT0q', 'Quản trị viên NEXOR', '0988888888', 'Tòa nhà NEXOR Flagship, Hà Nội', 'ADMIN', 1, NOW(), NOW()),
('customer', 'customer@nexor.vn', '$2a$10$S759JxB1SEeSuC/nM5jX7.yQi1x/VTlWp/km4r0GxLwhIKLJqk1Ae', 'Nguyễn Trí Thắng', '0912345678', 'HPC Landmark 105, Hà Đông, Hà Nội', 'CUSTOMER', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);
