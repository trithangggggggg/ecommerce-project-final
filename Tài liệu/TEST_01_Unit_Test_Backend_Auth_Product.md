# Kế hoạch Kiểm thử & Bộ Test Case Chi Tiết [TEST_01]
## Unit Test Backend – Phần 1 (AuthServiceImpl, ProductServiceImpl)

Tài liệu này được xây dựng theo chuẩn kiểm thử phần mềm cho dự án E-Commerce, phục vụ nhiệm vụ **[TEST_01]** (thời hạn 21:00 30/10). Bao gồm:
1. Kế hoạch kiểm thử (Test Plan)
2. Mẫu Test Case chuẩn dùng chung cho cả dự án
3. Bảng 9 Test Case chi tiết cho `AuthServiceImpl`
4. Bảng 13 Test Case chi tiết cho `ProductServiceImpl`
5. Hướng dẫn đo độ bao phủ Coverage bằng JaCoCo (kèm kết quả thực đo)
6. Mẫu ghi Bug lên Trello

---

## 1. Kế hoạch Kiểm thử (Test Plan)

### 1.1. Mục tiêu & Phạm vi (Scope & Objectives)
* **Mục tiêu**: Đảm bảo tầng nghiệp vụ (Service Layer) của 2 module cốt lõi **Xác thực (`AuthServiceImpl`)** và **Sản phẩm (`ProductServiceImpl`)** hoạt động chính xác theo quy chuẩn nghiệp vụ, xử lý đúng các ngoại lệ và ngăn chặn hồi quy (regression bugs).
* **Phạm vi kiểm thử (In-Scope)**:
  * `AuthServiceImpl`: Đăng ký tài khoản (thành công, trùng username, trùng email), Đăng nhập (thành công bằng username/email, sai mật khẩu, tài khoản không tồn tại, tài khoản bị khóa, rỗng thông tin).
  * `ProductServiceImpl`: Phân trang (`Pagination`), Lọc kết hợp đa tiêu chí (`Combined Filter`), Tìm kiếm theo từ khóa (`Keyword Search`), Xác thực khoảng giá (`minPrice > maxPrice`), Truy xuất chi tiết sản phẩm không tồn tại (ném `ResourceNotFoundException` - 404).
* **Ngoài phạm vi (Out-of-Scope)**: Tầng Repository (DB thật), Tầng Controller (HTTP MockMvc), Tầng Filter Security (kiểm thử ở bài kiểm thử tích hợp riêng).

### 1.2. Môi trường & Công nghệ
* **Ngôn ngữ**: Java 21 (Eclipse Adoptium OpenJDK 21)
* **Framework**: Spring Boot 4.1.0, JUnit 5 (Jupiter), Mockito (`MockitoExtension`)
* **Công cụ đo độ bao phủ (Coverage)**: JaCoCo 0.8.12
* **Build Tool**: Gradle 9.5.1 Wrapper (`gradlew.bat`)

### 1.3. Quy ước đặt mã định danh (Test Case ID Convention)
| Tiền tố | Module | Ý nghĩa |
| :--- | :--- | :--- |
| `TC_AUTH_xx` | Authentication & Registration | Các ca kiểm thử cho đăng ký, đăng nhập, bảo mật tài khoản |
| `TC_PROD_xx` | Product Catalog & Management | Các ca kiểm thử cho danh mục sản phẩm, tìm kiếm, phân trang, biến thể |

---

## 2. Mẫu Test Case Chuẩn Dùng Chung Cho Cả Dự Án

```markdown
| Mã Test Case | TC_MODULE_XX |
| :--- | :--- |
| **Tên Test Case** | [Tóm tắt ngắn gọn mục đích kiểm thử] |
| **Phân loại** | Unit Test / Positive (Thành công) hoặc Negative (Thất bại/Biên) |
| **Mức độ ưu tiên** | Critical / High / Medium / Low |
| **Tiền điều kiện** | [Trạng thái của Mock/Database trước khi thực hiện bước kiểm thử] |
| **Các bước thực hiện** | 1. Chuẩn bị dữ liệu đầu vào<br>2. Thiết lập hành vi Mock (when - thenReturn)<br>3. Gọi phương thức cần test |
| **Dữ liệu đầu vào** | Request DTO / Tham số truyền vào |
| **Kết quả mong đợi** | Trạng thái trả về, dữ liệu trả về hoặc ngoại lệ được ném ra |
| **Kết quả thực tế** | Pass / Fail |
```

---

## 3. Bảng Test Case Chi Tiết: `AuthServiceImpl`

| Test ID | Tên Test Case | Loại | Điều kiện tiên quyết | Các bước thực hiện & Dữ liệu đầu vào | Kết quả mong đợi | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_AUTH_01** | Đăng ký tài khoản thành công | Positive | `existsByUsername=false`, `existsByEmail=false` | 1. Tạo `RegisterRequest("newuser", "new@gmail.com", "Pass123", ...)`<br>2. Gọi `authService.register(req)` | HTTP 201 CREATED, thông điệp "Đăng ký tài khoản thành công", trả về `UserProfileResponse` có ID và Role CUSTOMER | **PASS** |
| **TC_AUTH_02** | Đăng ký thất bại do trùng Username | Negative | `existsByUsername("newuser")=true` | 1. Tạo `RegisterRequest` có username đã tồn tại<br>2. Gọi `authService.register(req)` | Ném `ConflictException("Tên đăng nhập đã được sử dụng")`, không gọi `userRepository.save()` | **PASS** |
| **TC_AUTH_03** | Đăng ký thất bại do trùng Email | Negative | `existsByUsername=false`, `existsByEmail("new@gmail.com")=true` | 1. Tạo `RegisterRequest` có email đã tồn tại<br>2. Gọi `authService.register(req)` | Ném `ConflictException("Địa chỉ email đã được sử dụng")`, không gọi `userRepository.save()` | **PASS** |
| **TC_AUTH_04** | Đăng nhập thành công bằng Username | Positive | User tồn tại, `status=true`, mật khẩu khớp | 1. `LoginRequest("testuser", "Password123")`<br>2. Mock `passwordEncoder.matches=true`<br>3. Gọi `authService.login(req)` | HTTP 200 OK, trả về `AuthResponse` gồm `accessToken` (JWT), `tokenType="Bearer"`, thông tin user | **PASS** |
| **TC_AUTH_05** | Đăng nhập thành công bằng Email | Positive | User tồn tại tìm theo Email, `status=true`, mật khẩu khớp | 1. `LoginRequest("testuser@gmail.com", "Password123")`<br>2. Gọi `authService.login(req)` | Trả về `accessToken` JWT hợp lệ | **PASS** |
| **TC_AUTH_06** | Đăng nhập thất bại do sai mật khẩu | Negative | User tồn tại, mật khẩu không khớp | 1. `LoginRequest("testuser", "WrongPass")`<br>2. Mock `passwordEncoder.matches=false`<br>3. Gọi `authService.login(req)` | Ném `UnauthorizedException("Tên đăng nhập hoặc mật khẩu không chính xác")`, không sinh token | **PASS** |
| **TC_AUTH_07** | Đăng nhập thất bại do tài khoản không tồn tại | Negative | Không tìm thấy User theo Username lẫn Email | 1. `LoginRequest("nonexistent", "Pass123")`<br>2. Gọi `authService.login(req)` | Ném `UnauthorizedException("Tên đăng nhập hoặc mật khẩu không chính xác")` | **PASS** |
| **TC_AUTH_08** | Đăng nhập thất bại do tài khoản bị khóa | Negative | User tồn tại, nhưng `status=false` | 1. User có `status=false`<br>2. `LoginRequest("testuser", "Pass123")`<br>3. Gọi `authService.login(req)` | Ném `BadRequestException("Tài khoản của bạn đã bị khóa, vui lòng liên hệ quản trị viên")` | **PASS** |
| **TC_AUTH_09** | Đăng nhập thất bại do để trống thông tin | Negative | Không cần truy vấn DB | 1. `LoginRequest("   ", "")`<br>2. Gọi `authService.login(req)` | Ném `BadRequestException("Tên đăng nhập và mật khẩu không được để trống")` | **PASS** |

---

## 4. Bảng Test Case Chi Tiết: `ProductServiceImpl`

| Test ID | Tên Test Case | Loại | Điều kiện tiên quyết | Các bước thực hiện & Dữ liệu đầu vào | Kết quả mong đợi | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_PROD_01** | Lấy chi tiết sản phẩm không tồn tại (Detail 404) | Negative | `productRepository.findById(999L)` trả về `Optional.empty()` | 1. Gọi `productService.getProductById(999L)` | Ném `ResourceNotFoundException("Không tìm thấy sản phẩm với ID: 999")` (Tầng Controller tự ánh xạ về mã lỗi HTTP 404) | **PASS** |
| **TC_PROD_02** | Phân trang danh sách sản phẩm (Pagination) | Positive | Repository mock trả về 1 Page có 1 sản phẩm, tổng 1 phần tử | 1. `Pageable pageable = PageRequest.of(0, 10)`<br>2. Gọi `productService.getAllProducts(null, null, null, true, pageable)` | Trả về `PageResponse<ProductResponse>` có `pageNumber=0`, `pageSize=10`, `totalElements=1`, `content.size()=1` | **PASS** |
| **TC_PROD_03** | Tìm kiếm sản phẩm theo từ khóa (Keyword search) | Positive | Có sản phẩm khớp tên "iPad" | 1. `keyword = "iPad"`, `Pageable = PageRequest.of(0, 10)`<br>2. Gọi `productService.searchProducts(...)` | Trả về danh sách sản phẩm chứa "iPad", gọi đúng `productRepository.findAll(spec, pageable)` | **PASS** |
| **TC_PROD_04** | Lọc kết hợp đa tiêu chí (Combined Filter) | Positive | Mock trả về sản phẩm khớp điều kiện | 1. Truyền đồng thời: `keyword="iPad"`, `categoryId=1L`, `brand="Apple"`, `minPrice=20M`, `maxPrice=35M`, `status=true`<br>2. Gọi `searchProducts(...)` | Áp dụng đúng `ProductSpecification.filter(...)` và trả về danh sách kết quả phù hợp | **PASS** |
| **TC_PROD_05** | Lọc thất bại do khoảng giá không hợp lệ (`minPrice > maxPrice`) | Negative | `minPrice = 50.000.000`, `maxPrice = 20.000.000` | 1. Gọi `searchProducts(...)` với `minPrice > maxPrice` | Ném `BadRequestException("Giá tối thiểu (minPrice) không được lớn hơn giá tối đa (maxPrice)!")`, không gọi repository | **PASS** |
| **TC_PROD_06** | Lấy chi tiết sản phẩm đơn lẻ (Không có biến thể) | Positive | Sản phẩm chỉ có giá cơ bản | 1. Gọi `getProductById(10L)` | Trả về `ProductResponse` với `minPrice == maxPrice == price`, danh sách variants rỗng | **PASS** |
| **TC_PROD_07** | Lấy chi tiết sản phẩm có nhiều biến thể (Variants) | Positive | Sản phẩm có 2 biến thể: 256GB (28.49M) và 512GB (34.49M) | 1. Gọi `getProductById(10L)` | `minPrice = 28.490.000`, `maxPrice = 34.490.000`, tổng `stock = 25`, đủ thông tin cấu hình `ProductSpec` | **PASS** |
| **TC_PROD_08** | Thêm mới sản phẩm kèm biến thể và tùy chọn | Positive | Danh mục hợp lệ, tên chưa tồn tại | 1. `ProductRequest` với 2 biến thể `AIR-M2-128` và `AIR-M2-256`<br>2. Gọi `createProduct(req)` | Tạo thành công, lưu cả Options, OptionValues và Variants vào DB | **PASS** |
| **TC_PROD_09** | Thêm mới thất bại do trùng mã SKU trong request | Negative | Danh mục hợp lệ, request chứa 2 variant cùng SKU | 1. `ProductRequest` có 2 variant cùng mang SKU `IP16-BLACK`<br>2. Gọi `createProduct(req)` | Ném `BadRequestException` thông báo mã SKU bị trùng lặp | **PASS** |
| **TC_PROD_10** | Thêm mới thất bại do giá gốc nhỏ hơn giá bán | Negative | `originalPrice (25M) < price (30M)` | 1. `ProductRequest` có giá gốc nhỏ hơn giá bán | Ném `BadRequestException("Giá gốc phải lớn hơn hoặc bằng giá bán")` | **PASS** |
| **TC_PROD_11** | Thêm mới thất bại do trùng tổ hợp thuộc tính | Negative | 2 biến thể cùng chọn "Màu sắc: Đen" | 1. `ProductRequest` trùng tổ hợp options | Ném `BadRequestException` thông báo tổ hợp tùy chọn bị trùng lặp | **PASS** |
| **TC_PROD_12** | Thêm mới sản phẩm không truyền biến thể | Positive | `ProductRequest` không có mảng `variants` | 1. Gọi `createProduct(req)` với giá 500.000 và kho 50 | Tự động tạo 1 biến thể mặc định (Default Variant) để đồng nhất hệ thống | **PASS** |
| **TC_PROD_13** | Cập nhật sản phẩm, bảo toàn biến thể cũ đã có đơn hàng | Positive | Biến thể cũ `OLD-SKU` đã nằm trong `order_items` | 1. Cập nhật danh sách biến thể mới bỏ `OLD-SKU`<br>2. Gọi `updateProduct(10L, req)` | Biến thể cũ không bị xóa cứng (hard delete) mà chuyển sang `status=false` (soft delete) | **PASS** |

---

## 5. Kết quả Đo Độ Bao Phủ Mã Nguồn (JaCoCo Coverage Report)

Lệnh thực thi đo kiểm:
```powershell
cd server
.\gradlew.bat test jacocoTestReport
```

Báo cáo chi tiết dạng HTML được sinh tự động tại:
`server/build/reports/jacoco/html/index.html`

### Bảng tổng hợp độ bao phủ thực tế:
| Lớp dịch vụ (Service Class) | Số lượng Test Case | Instruction Coverage | Branch Coverage | Line Coverage | Kết luận |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`AuthServiceImpl`** | 9 | **98%** | **81%** | **100%** (38/38 dòng) | Đạt chuẩn xuất sắc (>80%) |
| **`ProductServiceImpl`** | 13 | **61%** | **45%** | **66%** (206/311 dòng) | Đạt chuẩn kiểm thử các luồng chính |
| **Tổng thể Service Layer** | 22 | **Đạt** | **Đạt** | **BUILD SUCCESSFUL** | Không có bài test nào bị lỗi |

---

## 6. Mẫu Báo Cáo Bug Chuẩn Trên Trello (Trello Bug Card Template)

Khi thực hiện kiểm thử nếu phát hiện sai khác giữa kết quả thực tế và kết quả mong đợi, thành viên thực hiện tạo thẻ Bug mới trên bảng Trello của nhóm theo cấu trúc chuẩn sau:

```markdown
### 🏷️ Tiêu đề Thẻ Trello:
[BUG][Backend/Auth] Không thể đăng nhập khi mật khẩu chứa ký tự đặc biệt (@, #, $)

---
### 📌 Nhãn (Labels): 
[Bug] [Backend] [Priority: High]

### 📝 Mô tả lỗi (Description):
Người dùng đã đăng ký thành công với mật khẩu có ký tự đặc biệt nhưng khi đăng nhập hệ thống báo lỗi 401 Unauthorized dù nhập đúng mật khẩu.

### 💻 Môi trường (Environment):
* Branch: `BE-TuanMinh` (hoặc `dev`)
* Commit SHA: `5b01584`
* Java: OpenJDK 21, Spring Boot 4.1.0
* Database: MySQL 8.0 Local

### 🔄 Các bước tái hiện (Steps to Reproduce):
1. Gửi request POST `/api/auth/register` với body:
   ```json
   {
     "username": "tester01",
     "email": "tester01@gmail.com",
     "password": "Password@123#"
   }
   ```
2. Nhận response thành công 201 Created.
3. Gửi request POST `/api/auth/login` với body:
   ```json
   {
     "usernameOrEmail": "tester01",
     "password": "Password@123#"
   }
   ```
4. Quan sát kết quả trả về.

### ❌ Kết quả thực tế (Actual Result):
Hệ thống ném ngoại lệ `UnauthorizedException: Tên đăng nhập hoặc mật khẩu không chính xác` (Mã HTTP 401).

###  Kết quả mong đợi (Expected Result):
Đăng nhập thành công, trả về mã HTTP 200 kèm Bearer Access Token.

### 📸 Log / Ảnh chụp màn hình:
```text
2026-10-30 07:30:15.123 [http-nio-8080-exec-1] WARN  r.p.s.s.i.AuthServiceImpl - Mật khẩu không khớp hash BCrypt
```
```

