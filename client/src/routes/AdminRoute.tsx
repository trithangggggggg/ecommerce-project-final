import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ROLES } from '../constants/roles';
import { ROUTES } from '../constants/routes';

/**
 * Route Guard dành riêng cho Phân hệ Quản trị viên (Admin Portal)
 * Chỉ cho phép người dùng đã xác thực và có quyền ADMIN truy cập.
 */
export const AdminRoute: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  // Chưa đăng nhập -> Chuyển về trang /login và lưu lại trang đang muốn vào
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Đã đăng nhập nhưng không phải ADMIN -> Chuyển sang /unauthorized
  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === ROLES.ADMIN || userRole === 'ROLE_ADMIN';

  if (!isAdmin) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
