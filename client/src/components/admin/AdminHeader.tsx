import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../constants/routes';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    if (window.confirm('Bạn có muốn đăng xuất khỏi trang Quản trị?')) {
      logout();
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
          title="Mở menu quản trị"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm nhanh đơn hàng, sản phẩm..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Right: Actions, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications */}
        <button
          type="button"
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl relative transition cursor-pointer"
          title="Thông báo mới"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* User Pill */}
        <Link
          to={ROUTES.PROFILE}
          className="flex items-center gap-2.5 p-1.5 pr-3 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition group"
        >
          <img
            src={
              user?.avatarUrl ||
              'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
            }
            alt={user?.fullName || 'Admin'}
            className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
          />
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1 group-hover:text-purple-600 transition">
              <span>{user?.fullName || 'Quản trị viên'}</span>
              <ShieldCheck className="w-3 h-3 text-purple-600" />
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">Administrator</span>
          </div>
        </Link>

        {/* Quick Profile Link for Mobile */}
        <Link
          to={ROUTES.PROFILE}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl sm:hidden"
          title="Hồ sơ cá nhân"
        >
          <UserIcon className="w-5 h-5" />
        </Link>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
