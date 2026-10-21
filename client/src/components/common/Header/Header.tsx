import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Truck,
  ShieldCheck,
  Headphones,
  Menu,
  ChevronDown,
  X,
  LogOut,
} from 'lucide-react';
import { useCartStore } from '../../../store/useCartStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { ROUTES } from '../../../constants/routes';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { totalItems } = useCartStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [keyword, setKeyword] = useState('');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(keyword.trim())}`);
    } else {
      navigate('/products');
    }
  };

  const navCategories = [
    { name: 'Trang chủ', slug: '', isHome: true },
    { name: 'Laptop', slug: 'laptop' },
    { name: 'Điện thoại', slug: 'dien-thoai' },
    { name: 'Máy tính bảng', slug: 'may-tinh-bang' },
    { name: 'Phụ kiện', slug: 'phu-kien' },
    { name: 'Thiết bị điện tử', slug: 'thiet-bi-dien-tu' },
    { name: 'Gaming', slug: 'gaming' },
    { name: 'Khuyến mãi', slug: 'khuyen-mai' },
  ];

  return (
    <header className="bg-[#181a20] text-white sticky top-0 z-50 shadow-sm font-sans">
      {/* 1. Main Top Header */}
      <div className="max-w-[1360px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand Logo (NEXOR Emblem) */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <img
              src="/images/logo.png"
              alt="NEXOR Logo"
              className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white leading-none">
              NEXOR<span className="text-indigo-400">.</span>
            </span>
            <span className="text-[10px] text-gray-400 tracking-wider font-normal mt-0.5">
              Tech for a better life
            </span>
          </div>
        </Link>

        {/* Center: Search Bar (Pill shape) */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-xl mx-2 sm:mx-6 relative"
        >
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm sản phẩm, thương hiệu..."
              className="w-full bg-[#232731] hover:bg-[#282d38] focus:bg-[#282d38] text-white text-xs pl-10 pr-4 py-2 rounded-full border border-gray-700/50 focus:border-blue-500 focus:outline-none transition placeholder-gray-400"
            />
          </div>
        </form>

        {/* Right 1: Utility Perks */}
        <div className="hidden lg:flex items-center gap-6 text-gray-300 text-xs">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-300 stroke-[1.75]" />
            <div className="leading-tight text-[11px]">
              <span className="text-gray-400 block">Giao hàng</span>
              <span className="font-semibold text-gray-200">toàn quốc</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-300 stroke-[1.75]" />
            <div className="leading-tight text-[11px]">
              <span className="text-gray-400 block">Bảo hành</span>
              <span className="font-semibold text-gray-200">chính hãng</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-gray-300 stroke-[1.75]" />
            <div className="leading-tight text-[11px]">
              <span className="text-gray-400 block">Hỗ trợ</span>
              <span className="font-semibold text-gray-200">24/7</span>
            </div>
          </div>
        </div>

        {/* Right 2: User Action Icons */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Account Menu */}
          <div className="relative">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 p-1 text-gray-200 hover:text-white transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white border border-gray-600">
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
            ) : (
              <Link
                to={ROUTES.LOGIN}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-800 transition cursor-pointer"
                title="Đăng nhập / Tài khoản"
              >
                <User className="w-4.5 h-4.5" />
              </Link>
            )}

            {/* Dropdown Menu when logged in */}
            {isAuthenticated && userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-[#1e222a] border border-gray-700 rounded-xl shadow-xl py-2 z-50 text-xs"
                onMouseLeave={() => setUserDropdownOpen(false)}
              >
                <div className="px-4 py-2 border-b border-gray-700/60">
                  <p className="font-semibold text-white truncate">{user?.fullName}</p>
                  <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                </div>
                <Link
                  to={ROUTES.PROFILE}
                  onClick={() => setUserDropdownOpen(false)}
                  className="block px-4 py-2 text-gray-200 hover:bg-gray-700/50 hover:text-white"
                >
                  Hồ sơ cá nhân
                </Link>
                <Link
                  to={ROUTES.MY_ORDERS}
                  onClick={() => setUserDropdownOpen(false)}
                  className="block px-4 py-2 text-gray-200 hover:bg-gray-700/50 hover:text-white"
                >
                  Đơn hàng của tôi
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    to={ROUTES.ADMIN}
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-4 py-2 text-amber-400 hover:bg-gray-700/50 font-semibold"
                  >
                    Quản trị hệ thống (Admin)
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700/50 flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>

          {/* Wishlist */}
          <Link
            to="/products"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-800 transition cursor-pointer"
            title="Sản phẩm yêu thích"
          >
            <Heart className="w-4.5 h-4.5" />
          </Link>

          {/* Shopping Cart */}
          <Link
            to={ROUTES.CART}
            className="relative w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-800 transition cursor-pointer"
            title="Giỏ hàng"
          >
            <ShoppingCart className="w-4.5 h-4.5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#181a20]">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white p-1"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 2. Sub-Navbar Bar */}
      <div className="bg-[#1f222b] border-t border-gray-800/80">
        <div className="max-w-[1360px] mx-auto px-4 flex items-center gap-6 text-xs font-medium">
          {/* Left: Category Dropdown button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}
              className="flex items-center gap-2 py-2 px-3.5 bg-[#262b36] hover:bg-[#2c323f] text-white rounded-md transition font-semibold text-xs cursor-pointer"
            >
              <Menu className="w-3.5 h-3.5" />
              <span>Danh mục sản phẩm</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
          </div>

          {/* Center: Category Nav Links (Clean text with active underline) */}
          <nav className="hidden md:flex items-center gap-6 overflow-x-auto py-2">
            {navCategories.map((item) => (
              <Link
                key={item.name}
                to={item.isHome ? '/' : `/products?category=${item.slug}`}
                className={`text-xs font-semibold transition-colors pb-0.5 relative ${
                  item.isHome
                    ? 'text-white border-b-2 border-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1e222a] border-t border-gray-800 px-4 py-4 space-y-3">
          {navCategories.map((item) => (
            <Link
              key={item.name}
              to={item.isHome ? '/' : `/products?category=${item.slug}`}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-xs text-gray-300 hover:text-white font-medium"
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;
