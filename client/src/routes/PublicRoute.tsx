import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ROLES } from '../constants/roles';
import { ROUTES } from '../constants/routes';

export const PublicRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    if (user.role === ROLES.ADMIN) {
      return <Navigate to={ROUTES.ADMIN} replace />;
    }
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
