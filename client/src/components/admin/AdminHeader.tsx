import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../constants/routes';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  [ROUTES.ADMIN]: 'Tổng quan hệ thống',
  [ROUTES.ADMIN_DASHBOARD]: 'Tổng quan hệ thống',
  [ROUTES.ADMIN_ORDERS]: 'Quản lý đơn hàng',
  [ROUTES.ADMIN_PRODUCTS]: 'Quản lý sản phẩm',
  [ROUTES.ADMIN_CATEGORIES]: 'Quản lý danh mục',
  [ROUTES.ADMIN_BRANDS]: 'Quản lý thương hiệu',
  [ROUTES.ADMIN_FLASH_SALES]: 'Chương trình Flash Sale',
  [ROUTES.ADMIN_ARTICLES]: 'Bài viết & Tin tức',
  '/admin/news': 'Bài viết & Tin tức',
  [ROUTES.ADMIN_POLICIES]: 'Chính sách cửa hàng',
  [ROUTES.ADMIN_CUSTOMERS]: 'Quản lý khách hàng',
  [ROUTES.ADMIN_PROMOTIONS]: 'Khuyến mãi & Mã giảm giá',
  [ROUTES.ADMIN_WHEEL]: 'Vòng quay may mắn',
  [ROUTES.ADMIN_BANNERS]: 'Banner trang chủ',
  [ROUTES.ADMIN_STORES]: 'Hệ thống Showroom',
  [ROUTES.ADMIN_SHIPPING]: 'Đơn vị vận chuyển',
  [ROUTES.ADMIN_INVENTORY]: 'Quản lý tồn kho',
  [ROUTES.ADMIN_SUPPLIERS]: 'Nhà cung cấp',
  [ROUTES.ADMIN_REPORTS]: 'Doanh thu & Báo cáo',
  [ROUTES.ADMIN_AI]: 'Quản lý AI & Tri thức',
  '/admin/knowledge': 'Quản lý AI & Tri thức',
  [ROUTES.ADMIN_SETTINGS]: 'Cài đặt hệ thống',
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const currentSection = ROUTE_TITLES[pathname] || 'Portal Quản Trị';

  return (
    <header className="h-14 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 font-sans">
      {/* Left: Mobile Menu + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 lg:hidden cursor-pointer shrink-0"
          title="Mở menu quản trị"
        >
          Menu
        </button>

        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="hidden sm:inline font-semibold text-slate-400">Admin</span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="font-bold text-slate-800 truncate">{currentSection}</span>
        </div>
      </div>

      {/* Right: Storefront link & User profile */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <Link
          to={ROUTES.HOME}
          className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          Xem cửa hàng
        </Link>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        <Link
          to={`${ROUTES.ADMIN_SETTINGS}?tab=profile`}
          className="flex items-center gap-2.5 py-1 px-2 hover:bg-slate-50 rounded-xl transition group"
        >
          <img
            src={
              user?.avatarUrl ||
              (user as { avatar?: string } | null)?.avatar ||
              'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
            }
            alt={user?.fullName || 'Admin'}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150';
            }}
          />
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition leading-tight">
              {user?.fullName || 'Quản trị viên'}
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Administrator
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default AdminHeader;
