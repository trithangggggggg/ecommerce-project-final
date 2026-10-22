import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Percent,
  Truck,
  Layers,
  Archive,
  Building2,
  TrendingUp,
  PieChart,
  UserCheck,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/useAuthStore';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const salesMenu = [
    { title: 'Đơn hàng', path: ROUTES.ADMIN_ORDERS, icon: ShoppingCart, badge: '12' },
    { title: 'Sản phẩm', path: ROUTES.ADMIN_PRODUCTS, icon: Package },
    { title: 'Danh mục', path: ROUTES.ADMIN_CATEGORIES, icon: Layers },
    { title: 'Khách hàng', path: ROUTES.ADMIN_CUSTOMERS, icon: Users },
    { title: 'Khuyến mãi', path: ROUTES.ADMIN_PROMOTIONS, icon: Percent },
    { title: 'Vận chuyển', path: ROUTES.ADMIN_SHIPPING, icon: Truck },
  ];

  const inventoryMenu = [
    { title: 'Tồn kho', path: ROUTES.ADMIN_INVENTORY, icon: Archive },
    { title: 'Nhà cung cấp', path: ROUTES.ADMIN_SUPPLIERS, icon: Building2 },
  ];

  const reportMenu = [
    { title: 'Doanh thu & Báo cáo', path: ROUTES.ADMIN_REPORTS, icon: TrendingUp },
    { title: 'Thống kê sản phẩm', path: ROUTES.ADMIN_REPORTS, icon: PieChart },
    { title: 'Hành vi khách hàng', path: ROUTES.ADMIN_CUSTOMERS, icon: UserCheck },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white text-slate-700 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static shrink-0 border-r border-slate-200/80 font-sans ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <Link to={ROUTES.ADMIN} className="flex items-center gap-3">
            <img
              src="/images/nexor_logo.png"
              alt="NEXOR Admin"
              className="w-9 h-9 object-contain drop-shadow-sm"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                NEXOR ADMIN
              </span>
              <span className="text-[10px] text-indigo-500 font-medium">
                Portal Quản Trị
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu Links */}
        <div className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {/* Main: Tổng quan */}
          <div className="space-y-1">
            <NavLink
              to={ROUTES.ADMIN}
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Tổng quan</span>
            </NavLink>
          </div>

          {/* Group 1: QUẢN LÝ BÁN HÀNG */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Quản lý bán hàng
            </div>
            <div className="space-y-0.5">
              {salesMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.title}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Group 2: QUẢN LÝ KHO */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Quản lý kho
            </div>
            <div className="space-y-0.5">
              {inventoryMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.title}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Group 3: BÁO CÁO */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Báo cáo
            </div>
            <div className="space-y-0.5">
              {reportMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.title}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Group 4: HỆ THỐNG */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Hệ thống
            </div>
            <div className="space-y-0.5">
              <NavLink
                to={ROUTES.ADMIN_SETTINGS}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Cài đặt</span>
              </NavLink>
            </div>
          </div>
        </div>

        {/* User Card at Sidebar Bottom */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="p-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
                }
                alt={user?.fullName || 'Admin'}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-800 block truncate leading-tight">
                  {user?.fullName || 'Quản trị viên'}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium truncate">
                  Administrator
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate(ROUTES.LOGIN);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
