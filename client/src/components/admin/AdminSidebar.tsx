import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  FolderTree,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  User,
  X,
  ExternalLink,
} from 'lucide-react';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/useAuthStore';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();

  const menuItems = [
    {
      title: 'Tổng quan (Dashboard)',
      path: ROUTES.ADMIN,
      icon: LayoutDashboard,
      end: true,
    },
    {
      title: 'Quản lý Sản phẩm',
      path: ROUTES.ADMIN_PRODUCTS,
      icon: Package,
    },
    {
      title: 'Quản lý Danh mục',
      path: ROUTES.ADMIN_CATEGORIES,
      icon: FolderTree,
    },
    {
      title: 'Quản lý Đơn hàng',
      path: ROUTES.ADMIN_ORDERS,
      icon: ShoppingCart,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <Link to={ROUTES.ADMIN} className="flex items-center gap-3">
            <img
              src="/images/logo.png"
              alt="NEXOR Admin"
              className="w-9 h-9 rounded-full object-contain shadow-md shadow-indigo-500/20"
            />
            <div>
              <span className="text-base font-bold tracking-tight text-white block leading-tight">
                NEXOR ADMIN
              </span>
              <span className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">
                Portal Quản Trị
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu Links */}
        <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            Menu Quản Lý
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 px-3 mb-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            Hệ Thống & Khách Hàng
          </div>
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-all"
          >
            <ExternalLink className="w-4 h-4 shrink-0 text-slate-500" />
            <span>Xem Trang Chủ Mua Sắm</span>
          </Link>
          <NavLink
            to={ROUTES.PROFILE}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`
            }
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Hồ Sơ Admin</span>
          </NavLink>
        </div>

        {/* User Card at Sidebar Bottom */}
        <div className="p-3 border-t border-slate-800">
          <div className="p-2.5 bg-slate-800/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
                }
                alt={user?.fullName || 'Admin'}
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-purple-500/50 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-white block truncate leading-tight">
                  {user?.fullName || 'Quản trị viên'}
                </span>
                <span className="text-[10px] text-purple-400 truncate block">
                  {user?.email || 'admin@eshop.com'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
