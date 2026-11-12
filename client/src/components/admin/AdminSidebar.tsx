import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/useAuthStore';
import LogoutConfirmModal from '../common/LogoutConfirmModal/LogoutConfirmModal';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  title: string;
  path: string;
  badge?: string | number;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] transition-all border-l-2 ${
    isActive
      ? 'bg-blue-50/90 text-blue-700 font-semibold border-blue-600'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium border-transparent'
  }`;

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const salesMenu: MenuItem[] = [
    { title: 'Đơn hàng', path: ROUTES.ADMIN_ORDERS },
    { title: 'Sản phẩm', path: ROUTES.ADMIN_PRODUCTS },
    { title: 'Danh mục', path: ROUTES.ADMIN_CATEGORIES },
    { title: 'Thương hiệu', path: ROUTES.ADMIN_BRANDS },
    { title: 'Flash Sale', path: ROUTES.ADMIN_FLASH_SALES },
    { title: 'Bài viết & Tin tức', path: ROUTES.ADMIN_ARTICLES },
    { title: 'Chính sách cửa hàng', path: ROUTES.ADMIN_POLICIES },
    { title: 'Khách hàng', path: ROUTES.ADMIN_CUSTOMERS },
    { title: 'Khuyến mãi', path: ROUTES.ADMIN_PROMOTIONS },
    { title: 'Vòng quay may mắn', path: ROUTES.ADMIN_WHEEL },
    { title: 'Banner trang chủ', path: ROUTES.ADMIN_BANNERS },
    { title: 'Hệ thống Showroom', path: ROUTES.ADMIN_STORES },
    { title: 'Vận chuyển', path: ROUTES.ADMIN_SHIPPING },
  ];

  const inventoryMenu: MenuItem[] = [
    { title: 'Tồn kho', path: ROUTES.ADMIN_INVENTORY },
    { title: 'Nhà cung cấp', path: ROUTES.ADMIN_SUPPLIERS },
  ];

  const reportMenu: MenuItem[] = [
    { title: 'Doanh thu & Báo cáo', path: ROUTES.ADMIN_REPORTS },
  ];

  const renderSection = (label: string, items: MenuItem[], hasDivider = true) => (
    <div className={hasDivider ? 'pt-3 border-t border-slate-100' : ''}>
      <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
        {label}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.path}
            onClick={onClose}
            className={navLinkClass}
          >
            <span className="truncate">{item.title}</span>
            {item.badge !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 h-screen w-60 bg-white text-slate-700 flex flex-col border-r border-slate-200/80 font-sans select-none overflow-hidden transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2.5 hover:opacity-85 transition min-w-0"
            title="Về trang chủ cửa hàng"
          >
            <img
              src="/images/nexor_logo.png"
              alt="NEXOR Admin"
              className="w-7 h-7 object-contain shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">
                NEXOR ADMIN
              </span>
              <span className="text-[10px] text-blue-600 font-semibold tracking-wide">
                Portal Quản Trị
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 lg:hidden cursor-pointer"
          >
            Đóng
          </button>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto no-scrollbar space-y-3">
          <div>
            <NavLink
              to={ROUTES.ADMIN}
              end
              onClick={onClose}
              className={navLinkClass}
            >
              <span>Tổng quan</span>
            </NavLink>
          </div>

          {renderSection('Quản lý bán hàng', salesMenu)}
          {renderSection('Quản lý kho', inventoryMenu)}
          {renderSection('Báo cáo', reportMenu)}

          <div className="pt-3 border-t border-slate-100">
            <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              Hệ thống
            </div>
            <div className="space-y-0.5">
              <NavLink
                to={ROUTES.ADMIN_AI}
                onClick={onClose}
                className={navLinkClass}
              >
                <span className="truncate">Quản lý AI & Tri thức</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-700 shrink-0">
                  RAG
                </span>
              </NavLink>

              <NavLink
                to={ROUTES.ADMIN_SETTINGS}
                onClick={onClose}
                className={navLinkClass}
              >
                <span>Cài đặt</span>
              </NavLink>
            </div>
          </div>
        </nav>

        {/* User Card at Sidebar Bottom */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0 space-y-2.5">
          <Link
            to={`${ROUTES.ADMIN_SETTINGS}?tab=profile`}
            onClick={onClose}
            className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition cursor-pointer"
            title="Xem hồ sơ cá nhân"
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
            <div className="min-w-0 flex-1">
              <span className="text-[12px] font-bold text-slate-800 block truncate leading-tight">
                {user?.fullName || 'Quản trị viên'}
              </span>
              <span className="text-[10px] text-slate-400 block font-medium truncate mt-0.5">
                Administrator
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-1.5 px-3 text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200/80 rounded-lg transition cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          logout();
          navigate(ROUTES.LOGIN);
        }}
        hideIcons
      />
    </>
  );
};

export default AdminSidebar;
