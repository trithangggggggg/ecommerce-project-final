import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants/routes';

// Layouts
import GuestLayout from '../layouts/GuestLayout';
import AuthLayout from '../layouts/AuthLayout';

// Pages - Client
import HomePage from '../pages/guest/HomePage';
import ProductsPage from '../pages/guest/ProductsPage';
import ProductDetailPage from '../pages/guest/ProductDetailPage';
import CartPage from '../pages/cart/CartPage';
import CheckoutPage from '../pages/checkout/CheckoutPage';
import MyOrdersPage from '../pages/order/MyOrdersPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ProfilePage from '../pages/auth/ProfilePage';
import UnauthorizedPage from '../pages/common/UnauthorizedPage';
import StoresPage from '../pages/guest/StoresPage';
import ArticlesPage from '../pages/guest/ArticlesPage';
import ArticleDetailPage from '../pages/guest/ArticleDetailPage';
import PoliciesPage from '../pages/guest/PoliciesPage';
import PaymentResultPage from '../pages/payment/PaymentResultPage';
import SepayQrPaymentPage from '../pages/payment/SepayQrPaymentPage';
import NotFoundPage from '../pages/common/NotFoundPage';

// Lazy-loaded Admin Layout & Pages (Code Splitting để giảm bundle size trang chủ)
const AdminLayout = React.lazy(() => import('../layouts/AdminLayout'));
const DashboardPage = React.lazy(() => import('../pages/admin/DashboardPage'));
const AdminProductsPage = React.lazy(() => import('../pages/admin/AdminProductsPage'));
const AdminArticlesPage = React.lazy(() => import('../pages/admin/AdminArticlesPage'));
const AdminCategoriesPage = React.lazy(() => import('../pages/admin/AdminCategoriesPage'));
const AdminBrandsPage = React.lazy(() => import('../pages/admin/AdminBrandsPage'));
const AdminOrdersPage = React.lazy(() => import('../pages/admin/AdminOrdersPage'));
const AdminCustomersPage = React.lazy(() => import('../pages/admin/AdminCustomersPage'));
const AdminPromotionsPage = React.lazy(() => import('../pages/admin/AdminPromotionsPage'));
const AdminFlashSalesPage = React.lazy(() => import('../pages/admin/AdminFlashSalesPage'));
const AdminWheelPage = React.lazy(() => import('../pages/admin/AdminWheelPage'));
const AdminBannersPage = React.lazy(() => import('../pages/admin/AdminBannersPage'));
const AdminPoliciesPage = React.lazy(() => import('../pages/admin/AdminPoliciesPage'));
const AdminStoresPage = React.lazy(() => import('../pages/admin/AdminStoresPage'));
const AdminShippingPage = React.lazy(() => import('../pages/admin/AdminShippingPage'));
const AdminInventoryPage = React.lazy(() => import('../pages/admin/AdminInventoryPage'));
const AdminSuppliersPage = React.lazy(() => import('../pages/admin/AdminSuppliersPage'));
const AdminReportsPage = React.lazy(() => import('../pages/admin/AdminReportsPage'));
const AdminSettingsPage = React.lazy(() => import('../pages/admin/AdminSettingsPage'));
const AdminAiPage = React.lazy(() => import('../pages/admin/AdminAiPage'));

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import PublicRoute from './PublicRoute';

const AdminLoadingFallback: React.FC = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      <p className="text-sm font-medium text-slate-500">Đang tải phân hệ Quản trị...</p>
    </div>
  </div>
);

/**
 * Tự động cuộn trang lên đầu khi chuyển route
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!pathname.startsWith('/admin')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname]);

  return null;
}

export const AppRoutes: React.FC = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Phân hệ Khách hàng: Dùng GuestLayout có Header, Footer & AI Assistant */}
        <Route path="/" element={<GuestLayout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="trang-chu" element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="news" element={<ArticlesPage />} />
          <Route path="news/:slug" element={<ArticleDetailPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="articles/:slug" element={<ArticleDetailPage />} />
          <Route path="tin-tuc" element={<ArticlesPage />} />
          <Route path="tin-tuc/:slug" element={<ArticleDetailPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="policies/:slug" element={<PoliciesPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="payment/result" element={<PaymentResultPage />} />
          <Route path="payment/vnpay-return" element={<PaymentResultPage />} />

          {/* Các route yêu cầu khách hàng đăng nhập */}
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="payment/qr/:orderId" element={<SepayQrPaymentPage />} />
            <Route path="my-orders" element={<MyOrdersPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Phân hệ Xác thực: Login & Register (Chỉ truy cập khi chưa đăng nhập) */}
        <Route element={<PublicRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          </Route>
        </Route>

        {/* Phân vùng Quản trị: Admin Portal (Yêu cầu quyền ADMIN, Lazy Loaded) */}
        <Route element={<AdminRoute />}>
          <Route
            path={ROUTES.ADMIN}
            element={
              <React.Suspense fallback={<AdminLoadingFallback />}>
                <AdminLayout />
              </React.Suspense>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="articles" element={<AdminArticlesPage />} />
            <Route path="news" element={<AdminArticlesPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="brands" element={<AdminBrandsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="promotions" element={<AdminPromotionsPage />} />
            <Route path="flash-sales" element={<AdminFlashSalesPage />} />
            <Route path="wheel" element={<AdminWheelPage />} />
            <Route path="banners" element={<AdminBannersPage />} />
            <Route path="policies" element={<AdminPoliciesPage />} />
            <Route path="stores" element={<AdminStoresPage />} />
            <Route path="shipping" element={<AdminShippingPage />} />
            <Route path="inventory" element={<AdminInventoryPage />} />
            <Route path="suppliers" element={<AdminSuppliersPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="ai" element={<AdminAiPage />} />
            <Route path="knowledge" element={<AdminAiPage />} />
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
