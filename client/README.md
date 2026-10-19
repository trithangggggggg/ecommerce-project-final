# 🛒 E-COMMERCE CLIENT (REACT + TYPESCRIPT + TAILWIND CSS)

Dự án Frontend Thương Mại Điện Tử được xây dựng theo kiến trúc module hoá chuẩn Enterprise, thân thiện cho người mới bắt đầu (Beginner-Friendly), dễ mở rộng và dễ bảo trì.

---

## 🚀 Tính năng & Công nghệ chính
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (Cực nhẹ, linh hoạt, responsive đa thiết bị)
- **Routing & Phân quyền:** React Router v7 + Role-Based Access Control (RBAC: Admin, Staff, Customer, Guest)
- **Quản lý State:** Zustand (Nhẹ hơn Redux, cú pháp rõ ràng, tự động lưu LocalStorage)
- **Gọi API & Xử lý lỗi:** Axios Instance + Interceptors (Tự động gắn Bearer Token, bắt lỗi 401/403/500 toàn cục)
- **Mock Data Engine:** Tích hợp sẵn Mock API để chạy thử nghiệm đầy đủ tính năng ngay cả khi chưa có Backend

---

## 📂 Sơ Đồ Cấu Trúc Thư Mục (Folder Architecture)

```
client/
├── .env.example              # Mẫu biến môi trường
├── .env                      # Biến môi trường chạy cục bộ
├── src/
│   ├── api/                  # 🌐 Tầng gọi API & giao tiếp với Backend
│   │   ├── axiosClient.ts    # Cấu hình Axios + Request/Response Interceptors
│   │   ├── endpoints.ts      # Danh sách tập trung các đường dẫn API
│   │   ├── services/         # Tách biệt hàm gọi API theo từng nghiệp vụ
│   │   │   ├── auth.service.ts
│   │   │   ├── product.service.ts
│   │   │   ├── order.service.ts
│   │   │   └── user.service.ts
│   │   └── index.ts
│   │
│   ├── config/               # ⚙️ Cấu hình hệ thống
│   │   └── env.ts            # Type-safe wrapper cho biến môi trường (ENV)
│   │
│   ├── constants/            # 📌 Hằng số dùng chung toàn app
│   │   ├── routes.ts         # Quản lý tập trung mọi URL Path (tránh gõ sai)
│   │   ├── roles.ts          # Định nghĩa vai trò (ADMIN, STAFF, CUSTOMER, GUEST)
│   │   └── storageKeys.ts    # Danh sách key lưu trữ trong LocalStorage
│   │
│   ├── models/               # 🧱 Domain Entities & Type Definitions (Quan trọng cho người mới)
│   │   ├── api.model.ts      # ApiResponse, PaginatedResponse, ApiError
│   │   ├── auth.model.ts     # User, LoginPayload, RegisterPayload, AuthResponse
│   │   ├── product.model.ts  # Product, Category, Brand, Review, FilterParams
│   │   ├── cart.model.ts     # CartItem, CartSummary, Coupon
│   │   ├── order.model.ts    # Order, OrderItem, OrderStatus, PaymentMethod
│   │   ├── user.model.ts     # UserProfile, UserAddress, CustomerSummary
│   │   └── index.ts          # Barrel export toàn bộ models
│   │
│   ├── store/                # 📦 Quản lý Global State (Zustand)
│   │   ├── useAuthStore.ts   # Lưu thông tin User, Token, hàm Login, Logout
│   │   ├── useCartStore.ts   # Quản lý giỏ hàng (thêm, xoá, sửa số lượng, tính tiền)
│   │   └── index.ts
│   │
│   ├── hooks/                # 🪝 Custom Hooks tiện ích
│   │   ├── useAuth.ts        # Hook truy cập nhanh auth state (isAdmin, isCustomer...)
│   │   ├── useCart.ts        # Hook giỏ hàng kèm giá tiền đã format
│   │   ├── useDebounce.ts    # Hook trì hoãn tìm kiếm (chống spam request khi gõ phím)
│   │   ├── useLocalStorage.ts# Hook đồng bộ state với LocalStorage
│   │   └── index.ts
│   │
│   ├── utils/                # 🛠️ Hàm bổ trợ (Helper Utilities)
│   │   ├── formatters.ts     # Format tiền tệ VND/USD, format ngày tháng, badge trạng thái
│   │   ├── storage.ts        # Thao tác localStorage an toàn có bọc try-catch
│   │   └── index.ts
│   │
│   ├── components/           # 🧩 Các UI Component tái sử dụng
│   │   ├── common/           # Dùng chung cho cả khách & admin
│   │   │   ├── Header/       # Header khách: Logo, Search, Cart Badge, Auth Menu
│   │   │   ├── Footer/       # Chân trang thương mại điện tử
│   │   │   ├── Button/       # Nút bấm đa năng (primary, secondary, danger, outline...)
│   │   │   ├── Input/        # Ô nhập form kèm nhãn và báo lỗi
│   │   │   ├── Card/         # Thẻ hiển thị sản phẩm (ProductCard)
│   │   │   └── Badge/        # Huy hiệu trạng thái đơn hàng (StatusBadge)
│   │   └── admin/            # Dành riêng cho trang Quản trị
│   │       ├── AdminHeader.tsx  # Topbar của Admin: avatar, chuông thông báo
│   │       └── AdminSidebar.tsx # Menu điều hướng bên trái
│   │
│   ├── layouts/              # 🖼️ Khung sườn bao bọc giao diện
│   │   ├── GuestLayout.tsx   # Header + Nội dung trang khách + Footer
│   │   ├── AdminLayout.tsx   # Sidebar + Header admin + Vùng làm việc
│   │   └── AuthLayout.tsx    # Giao diện đăng nhập / đăng ký
│   │
│   ├── pages/                # 📄 Các màn hình (Views)
│   │   ├── guest/            # Phân vùng Khách hàng mua sắm
│   │   │   ├── HomePage.tsx           # Trang chủ (Banner, Danh mục, Sản phẩm nổi bật)
│   │   │   ├── ProductDetailPage.tsx  # Trang chi tiết sản phẩm (Thư viện ảnh, Giá, Đặt mua)
│   │   │   ├── CartPage.tsx           # Trang giỏ hàng (Tăng/giảm số lượng, Xoá, Tạm tính)
│   │   │   └── CheckoutPage.tsx       # Trang đặt hàng thanh toán (COD, VNPay)
│   │   ├── auth/             # Phân vùng Xác thực
│   │   │   ├── LoginPage.tsx          # Đăng nhập (Kèm nút bấm nhanh Admin / Khách)
│   │   │   └── RegisterPage.tsx       # Đăng ký tài khoản mới
│   │   ├── admin/            # Phân vùng Quản trị (Admin Portal)
│   │   │   ├── DashboardPage.tsx      # Thống kê doanh thu, đơn hàng, khách hàng
│   │   │   ├── ProductsPage.tsx       # Quản lý danh sách sản phẩm, tồn kho
│   │   │   └── OrdersPage.tsx         # Quản lý đơn đặt, cập nhật trạng thái đơn
│   │   └── common/           # Trang lỗi
│   │       ├── NotFoundPage.tsx       # Lỗi 404
│   │       └── UnauthorizedPage.tsx   # Lỗi 403 (Không đủ quyền)
│   │
│   └── routes/               # 🚦 Định tuyến & Bảo vệ phân quyền
│       ├── ProtectedRoute.tsx# Chặn người chưa đăng nhập hoặc sai quyền
│       ├── PublicRoute.tsx   # Ngăn vào lại trang Login nếu đã đăng nhập rồi
│       ├── AppRoutes.tsx     # Bản đồ phân luồng tất cả Routes của website
│       └── index.ts
```

---

## 🔄 Luồng Dữ Liệu Trong Ứng Dụng (Data Flow)

Để phát triển một tính năng mới (ví dụ hiển thị Đánh giá sản phẩm):
1. **Model (`src/models/`):** Định nghĩa cấu trúc kiểu dữ liệu (`ProductReview`).
2. **Endpoint (`src/api/endpoints.ts`):** Thêm URL endpoint (`REVIEWS: '/reviews'`).
3. **Service (`src/api/services/`):** Viết hàm gọi API bằng `axiosClient` (ví dụ `getReviews(productId)`).
4. **Hook/Store (`src/hooks/` hoặc `src/store/`):** Tạo Hook quản lý logic hoặc kết nối state nếu cần lưu trữ toàn cục.
5. **Component/Page (`src/pages/`):** Gọi hook/service để lấy dữ liệu và hiển thị lên giao diện với Tailwind CSS.

---

## 🧪 Tài Khoản Test Nhanh (Dành Cho Lập Trình Viên)

Tại trang **Đăng nhập (`/login`)**, đã tích hợp sẵn 2 nút bấm tự động:
- **Nút "Đăng nhập Admin":** Tài khoản `admin@eshop.com` -> Tự động cấp quyền `ADMIN` và dẫn tới Dashboard Quản trị.
- **Nút "Đăng nhập Khách":** Tài khoản `customer@eshop.com` -> Tự động cấp quyền `CUSTOMER` và dẫn về Trang chủ mua sắm.

---

## 🛠️ Lệnh Chạy Dự Án

```bash
# Cài đặt thư viện
npm install

# Khởi chạy server phát triển (Development)
npm run dev

# Kiểm tra lỗi TypeScript & Đóng gói sản phẩm (Production Build)
npm run build
```
