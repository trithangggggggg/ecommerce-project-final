import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { ROLES } from '../constants/roles';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ProfilePage from '../pages/auth/ProfilePage';
import DashboardPage from '../pages/admin/DashboardPage';
import AdminProductsPage from '../pages/admin/AdminProductsPage';
import HomePage from '../pages/guest/HomePage';
import UnauthorizedPage from '../pages/common/UnauthorizedPage';
import NotFoundPage from '../pages/common/NotFoundPage';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Trang Chủ (Khu vực của Hưng) */}
      <Route path={ROUTES.HOME} element={<HomePage />} />

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
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.ADMIN} element={<DashboardPage />} />
          <Route path={ROUTES.ADMIN_DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.ADMIN_PRODUCTS} element={<AdminProductsPage />} />
          <Route path={ROUTES.ADMIN_CATEGORIES} element={<AdminProductsPage />} />
          <Route path={ROUTES.ADMIN_ORDERS} element={<DashboardPage />} />
        </Route>
      </Route>

      {/* Trang lỗi & Phân quyền */}
      <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
