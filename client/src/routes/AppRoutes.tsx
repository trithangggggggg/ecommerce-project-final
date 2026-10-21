import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { ROLES } from '../constants/roles';

// Layouts
import GuestLayout from '../layouts/GuestLayout';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';

// Pages
import HomePage from '../pages/guest/HomePage';
import ProductsPage from '../pages/guest/ProductsPage';
import ProductDetailPage from '../pages/guest/ProductDetailPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ProfilePage from '../pages/auth/ProfilePage';
import DashboardPage from '../pages/admin/DashboardPage';
import AdminProductsPage from '../pages/admin/AdminProductsPage';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import UnauthorizedPage from '../pages/common/UnauthorizedPage';
import NotFoundPage from '../pages/common/NotFoundPage';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

/**
 * Tự động cuộn trang lên đầu khi chuyển route
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export const AppRoutes: React.FC = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Phân hệ Khách hàng: Vào thẳng trang chủ khi truy cập root hoặc /home */}
        <Route path="/" element={<GuestLayout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="trang-chu" element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
        </Route>

        {/* Phân hệ Xác thực: Login & Register (Chỉ truy cập khi chưa đăng nhập) */}
        <Route element={<PublicRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          </Route>
        </Route>

        {/* Hồ sơ cá nhân (Yêu cầu đăng nhập) */}
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        </Route>

        {/* Phân vùng Quản trị: Admin Portal (Yêu cầu quyền ADMIN) */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path={ROUTES.ADMIN} element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
          </Route>
        </Route>

        {/* Trang thông báo không có quyền */}
        <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        {/* Bất kỳ đường dẫn không xác định nào cũng chuyển hướng ngay về Trang Chủ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
