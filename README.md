# NEXOR - Nền Tảng Thương Mại Điện Tử Thiết Bị Công Nghệ Thông Minh

[![CI/CD](https://github.com/trithangggggggg/ecommerce-project-final/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/trithangggggggg/ecommerce-project-final/actions/workflows/ci-cd.yml)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.x-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Nexor** là hệ sinh thái thương mại điện tử chuyên cung cấp các sản phẩm công nghệ cao cấp, tích hợp trợ lý AI thông minh tư vấn mua sắm, quản lý chuỗi cửa hàng vật lý, hỗ trợ thanh toán trực tuyến và tự động hóa quy trình CI/CD toàn diện.

🌐 **Production Website**: [http://nexortech.io.vn](http://nexortech.io.vn)

---

## 📑 Mục Lục
- [1. Tính Năng Nổi Bật](#1-tính-năng-nổi-bật)
- [2. Kiến Trúc & Công Nghệ](#2-kiến-trúc--công-nghệ)
- [3. Thành Viên & Phân Chia Trách Nhiệm](#3-thành-viên--phân-chia-trách-nhiệm)
- [4. Quy Trình CI/CD GitHub Actions](#4-quy-trình-cicd-github-actions)
- [5. Hướng Dẫn Cài Đặt & Chạy Cục Bộ](#5-hướng-dẫn-cài-đặt--chạy-cục-bộ)

---

## 1. Tính Năng Nổi Bật

- 🤖 **Trợ Lý AI Nexor (Spring AI + Gemini / GPT)**: Tư vấn cấu hình, gợi ý sản phẩm phù hợp ngân sách và nhu cầu trực tiếp theo ngữ cảnh giỏ hàng.
- 🏪 **Hệ Thống Chuỗi Cửa Hàng (Store Locations)**: Tìm kiếm chi nhánh gần nhất, định vị bản đồ và chỉ đường cho khách mua hàng trực tiếp.
- 🛍️ **Danh Mục & Sản Phẩm Đa Dạng**: Phân trang, lọc theo thương hiệu, khoảng giá, đánh giá và tìm kiếm từ khóa tức thì.
- 💳 **Thanh Toán & Hóa Đơn Trực Tuyến**: Tích hợp cổng thanh toán bảo mật, xuất hóa đơn điện tử PDF tự động gửi qua email.
- 🔐 **Bảo Mật & Phân Quyền Đa Tầng**: Xác thực JWT token, Spring Security RBAC (Admin, Customer, Shipper).
- ⚡ **Hiệu Năng & Trải Nghiệm Mượt Mà**: Single Page Application với React 19, TailwindCSS v4, Zustand store và Nginx reverse proxy.

---

## 2. Kiến Trúc & Công Nghệ

### Backend
- **Ngôn ngữ & Runtime**: Java 21 (Temurin JDK)
- **Framework**: Spring Boot 3.4 / 4.x, Spring Data JPA, Spring Security
- **Trí tuệ nhân tạo**: Spring AI
- **Cơ sở dữ liệu**: MySQL 8.0 (Production), H2 Database (In-memory testing)
- **Build tool & Coverage**: Gradle 8.14, JaCoCo

### Frontend
- **Framework**: React 19 + TypeScript
- **Bundler & Styling**: Vite 6, TailwindCSS v4
- **State Management**: Zustand
- **Icons & UI components**: Lucide React

### DevOps & Hạ Tầng
- **Containerization**: Docker, Docker Compose đa dịch vụ (Database, Backend API, Frontend, Nginx Reverse Proxy)
- **CI/CD Pipeline**: GitHub Actions
- **Registry**: GitHub Container Registry (GHCR)
- **Web Server / Gateway**: Nginx (Port 80/443 mapping, Gzip, Caching)
- **Hạ Tầng Server**: Cloud Linux VPS (IP: `163.223.9.81`)
- **Tên miền & DNS**: `nexortech.io.vn` (Tenten DNS)

---

## 3. Thành Viên & Phân Chia Trách Nhiệm

| Thành Viên | Vai Trò | Trách Nhiệm Chính | Nhánh Làm Việc |
| :--- | :--- | :--- | :--- |
| **Trí Thắng** | **DevOps & Architecture** | Thiết lập CI/CD GitHub Actions, Docker hóa, Cấu hình Nginx & VPS, Domain DNS `nexortech.io.vn`, Chuẩn hóa Testing & Build | `Devops-Trithang` |
| **Tuấn Minh** | **Backend Lead** | Thiết kế CSDL, API Store Locations, Category/Product APIs, Tích hợp Spring AI, Unit & Integration Tests | `BE-TuanMinh` |
| **Quốc Lộc** | **Frontend Lead** | Xây dựng giao diện Khách hàng, Store Locator UI, Tích hợp Chatbot AI Widget, Tối ưu hóa UI/UX | `Frontend-QuocLoc` |
| **Quốc Hưng** | **Frontend Developer** | Giao diện Quản trị (Admin Dashboard), Quản lý Sản phẩm / Đơn hàng, Responsive & Styling | `Frontend-QuocHung` |

---

## 4. Quy Trình CI/CD GitHub Actions

Hệ thống CI/CD được cấu hình tự động tại `.github/workflows/ci-cd.yml` với các bước kiểm soát chất lượng nghiêm ngặt:

```
[Git Push / PR] ──► [dev]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[Job: Backend Test]              [Job: Frontend Build]
Gradle 8.14 + JDK 21             Node 20 + npm ci
./gradlew test --no-daemon       npm run build
        │                                 │
        └────────────────┬────────────────┘
                         ▼
        [Docker Compose & Smoke Tests]
        - Build containers
        - Smoke Test: Frontend, Category API, Product API
                         │
        ┌────────────────┴────────────────┐
        │ Thành công                      │ Lỗi: Gửi log chi tiết
        ▼                                 ▼
[Push Images lên GHCR]            [Build Failed]
(Chỉ chạy khi push/merge vào dev)
        │
        ▼
[Deploy SSH lên VPS 163.223.9.81]
- Kéo source code mới nhất nhánh dev
- Cập nhật biến môi trường an toàn
- Zero-downtime container rolling restart
```

- **Trigger Conditions**: Tự động kích hoạt khi có `push` hoặc `pull_request` vào nhánh `dev` (giai đoạn phát triển). Khi toàn bộ dự án hoàn thiện sẽ bổ sung nhánh `main`.
- **An Toàn Tuyệt Đối**: Bước Push GHCR và Deploy SSH chỉ thực thi khi code đã được kiểm thử 100% xanh và được merge/push chính thức vào nhánh `dev`. Các Pull Request vào nhánh `dev` chỉ chạy test và smoke test mà không deploy lên server.

---

## 5. Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### Yêu cầu tiên quyết
- Git
- JDK 21
- Node.js 20+ & npm
- Docker & Docker Compose

### Cách 1: Khởi chạy toàn bộ hệ thống bằng Docker Compose (Khuyên dùng)
```bash
# 1. Clone repository
git clone https://github.com/trithangggggggg/ecommerce-project-final.git
cd ecommerce-project-final

# 2. Khởi chạy toàn bộ bằng Docker Compose
docker compose --env-file student.env up -d --build

# 3. Truy cập ứng dụng:
# Frontend & Nginx: http://localhost:8081 (hoặc theo cấu hình APP_PORT)
```

### Cách 2: Khởi chạy thủ công từng phần

**Backend:**
```bash
cd server
./gradlew bootRun
# API phục vụ tại: http://localhost:8080
```

**Frontend:**
```bash
cd client
npm install
npm run dev
# Giao diện phục vụ tại: http://localhost:5173
```

