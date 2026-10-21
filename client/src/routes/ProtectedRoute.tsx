import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ROUTES } from '../constants/routes';
import type { UserRole } from '../constants/roles';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
    const userRole = (user.role || '').toUpperCase();
    const isAllowed = allowedRoles.some(
      (r) => r.toUpperCase() === userRole || `ROLE_${r}`.toUpperCase() === userRole || userRole === `ROLE_${r}`.toUpperCase()
    );
    if (!isAllowed) {
      return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
