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
    { name: 'Laptop', slug: 'laptop' },
    { name: 'Điện thoại', slug: 'dien-thoai' },
    { name: 'Máy tính bảng', slug: 'may-tinh-bang' },
    { name: 'Phụ kiện', slug: 'phu-kien' },
    { name: 'Thiết bị điện tử', slug: 'thiet-bi-dien-tu' },
    { name: 'Gaming', slug: 'gaming' },
    { name: 'Khuyến mãi', slug: 'khuyen-mai' },
  ];

  return (
    <header className="bg-[#16191f] text-white sticky top-0 z-50 shadow-md">
      {/* 1. Main Top Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          {/* Geometric 3D Hexagon Logo Icon matching reference */}
          <div className="w-9 h-9 bg-gradient-to-br from-slate-200 to-gray-400 rounded-lg flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16191f"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-full h-full"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white leading-none">
              E-Shop<span className="text-gray-300 font-black">TECH</span>
            </span>
            <span className="text-[10px] text-gray-400 tracking-wider font-medium mt-0.5">
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
            <Search className="w-4 h-4 text-gray-400 absolute left-4.5 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm sản phẩm, thương hiệu..."
              className="w-full bg-[#232731] hover:bg-[#282d38] focus:bg-[#282d38] text-white text-xs sm:text-sm pl-11 pr-4 py-2.5 rounded-full border border-gray-700/60 focus:border-blue-500 focus:outline-none transition placeholder-gray-400"
            />
          </div>
        </form>

        {/* Right 1: Utility Perks (Hidden on small mobile) */}
        <div className="hidden lg:flex items-center gap-6 text-gray-300 text-xs">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-300 stroke-[1.5]" />
            <div className="leading-tight">
              <span className="text-[11px] text-gray-400 block">Giao hàng</span>
              <span className="font-semibold text-gray-200">toàn quốc</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gray-300 stroke-[1.5]" />
            <div className="leading-tight">
              <span className="text-[11px] text-gray-400 block">Bảo hành</span>
              <span className="font-semibold text-gray-200">chính hãng</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-gray-300 stroke-[1.5]" />
            <div className="leading-tight">
              <span className="text-[11px] text-gray-400 block">Hỗ trợ</span>
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
                className="flex items-center gap-1.5 p-1.5 text-gray-200 hover:text-white transition"
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white border border-gray-600">
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
            ) : (
              <Link
                to={ROUTES.LOGIN}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-800 transition"
                title="Đăng nhập / Tài khoản"
              >
                <User className="w-5 h-5" />
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
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700/50 flex items-center gap-1.5"
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
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-800 transition"
            title="Sản phẩm yêu thích"
          >
            <Heart className="w-5 h-5" />
          </Link>

          {/* Shopping Cart */}
          <Link
            to="/cart"
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-800 transition"
            title="Giỏ hàng"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-[#16191f]">
              {totalItems > 0 ? totalItems : 2}
            </span>
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white p-1"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* 2. Sub-Navbar Bar */}
      <div className="bg-[#1e222b] border-t border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs font-medium">
          {/* Left: Category Dropdown button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}
              className="flex items-center gap-2.5 py-2.5 px-4 bg-[#262b36] hover:bg-[#2e3442] text-white rounded-t-lg transition font-semibold"
            >
              <Menu className="w-4 h-4" />
              <span>Danh mục sản phẩm</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Center/Right: Category Nav Links */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
            <Link
              to="/"
              className="px-3.5 py-1.5 rounded-full bg-white text-gray-900 font-bold transition shadow-xs"
            >
              Trang chủ
            </Link>

            {navCategories.map((item) => (
              <Link
                key={item.slug}
                to={`/products?category=${item.slug}`}
                className="px-3 py-1.5 rounded-full text-gray-300 hover:text-white hover:bg-gray-800/70 transition"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1e222b] border-t border-gray-800 px-4 py-4 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-bold text-white border-b border-gray-800"
          >
            Trang chủ
          </Link>
          {navCategories.map((item) => (
            <Link
              key={item.slug}
              to={`/products?category=${item.slug}`}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-xs text-gray-300 hover:text-white"
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
