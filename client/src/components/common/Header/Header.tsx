import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
  ChevronRight,
  X,
  LogOut,
  Laptop,
  Smartphone,
  Tablet,
  Watch,
  Monitor,
  Gamepad2,
  Flame,
  Grid,
  Package,
} from 'lucide-react';
import { useCartStore } from '../../../store/useCartStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { ROUTES } from '../../../constants/routes';
import { PetMascot } from '../Mascot/PetMascot';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { totalItems } = useCartStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [keyword, setKeyword] = useState('');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentCategory = (searchParams.get('category') || '').toLowerCase().trim();

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

  const dropdownCategories = [
    {
      name: 'Laptop & Máy tính xách tay',
      slug: 'laptop',
      icon: Laptop,
      desc: 'Gaming, Văn phòng, Đồ họa',
      badge: 'Hot',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      name: 'Điện thoại di động',
      slug: 'dien-thoai',
      icon: Smartphone,
      desc: 'iPhone, Samsung, Xiaomi...',
      badge: 'Bán chạy',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      name: 'Máy tính bảng (Tablet)',
      slug: 'may-tinh-bang',
      icon: Tablet,
      desc: 'iPad, Galaxy Tab, màn hình lớn',
    },
    {
      name: 'Tai nghe & Âm thanh',
      slug: 'tai-nghe',
      icon: Headphones,
      desc: 'True Wireless, loa Bluetooth',
    },
    {
      name: 'Đồng hồ thông minh',
      slug: 'dong-ho-thong-minh',
      icon: Watch,
      desc: 'Theo dõi sức khỏe, thể thao',
    },
    {
      name: 'Phụ kiện công nghệ',
      slug: 'phu-kien',
      icon: Package,
      desc: 'Củ sạc, cáp, sạc dự phòng, chuột',
    },
    {
      name: 'Thiết bị điện tử & Màn hình',
      slug: 'thiet-bi-dien-tu',
      icon: Monitor,
      desc: 'Màn hình máy tính, Smart Home',
    },
    {
      name: 'Gaming & Phụ kiện chơi game',
      slug: 'gaming',
      icon: Gamepad2,
      desc: 'Bàn phím cơ, tay cầm, chuột gaming',
    },
    {
      name: 'Khuyến mãi & Flash Sale',
      slug: 'khuyen-mai',
      icon: Flame,
      desc: 'Ưu đãi sốc, Flash Sale',
      badge: 'Giảm đến 50%',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
  ];

  const isCategoryActive = (item: { name: string; slug: string; isHome?: boolean }) => {
    if (item.isHome) {
      return location.pathname === '/' && !currentCategory;
    }
    if (location.pathname.startsWith('/products')) {
      if (!currentCategory) return false;
      const targetSlug = item.slug.toLowerCase().trim();
      return (
        currentCategory === targetSlug ||
        currentCategory.replace(/-/g, '') === targetSlug.replace(/-/g, '') ||
        currentCategory.includes(targetSlug) ||
        targetSlug.includes(currentCategory)
      );
    }
    return false;
  };

  return (
    <header className="bg-[#181a20] text-white sticky top-0 z-50 shadow-sm font-sans">
      {/* 1. Main Top Header */}
      <div className="max-w-[1360px] mx-auto px-4 py-3 flex items-center justify-between gap-4 relative z-20">
        {/* Left: Brand Logo (NEXOR Emblem) */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <img
              src="/images/nexor_logo.png"
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

        {/* Right 2: User Action Icons & Interactive Mascot */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Pet Fox Mascot Companion */}
          <div className="flex items-center justify-center">
            <PetMascot size={40} className="hidden sm:inline-flex" />
          </div>

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
      <div className="bg-[#1f222b] border-t border-gray-800/80 relative z-30">
        <div className="max-w-[1360px] mx-auto px-4 flex items-center gap-6 text-xs font-medium">
          {/* Left: Category Dropdown button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-md transition font-semibold text-xs cursor-pointer ${
                categoryMenuOpen
                  ? 'bg-[#313745] text-white shadow-sm ring-1 ring-blue-500/40'
                  : 'bg-[#262b36] hover:bg-[#2c323f] text-white'
              }`}
            >
              <Menu className="w-3.5 h-3.5 text-blue-400" />
              <span>Danh mục sản phẩm</span>
              <ChevronDown
                className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                  categoryMenuOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* Functional Category Dropdown Menu */}
            {categoryMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setCategoryMenuOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1.5 w-72 bg-[#1a1d24] border border-gray-700/80 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2 border-b border-gray-800 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                    <span>Tất cả ngành hàng</span>
                    <span className="text-[10px] font-normal text-blue-400 lowercase">khám phá ngay</span>
                  </div>

                  <div className="py-1 max-h-[420px] overflow-y-auto no-scrollbar">
                    {dropdownCategories.map((cat) => {
                      const IconComponent = cat.icon;
                      const isCatActive =
                        currentCategory === cat.slug ||
                        currentCategory.includes(cat.slug);

                      return (
                        <Link
                          key={cat.slug}
                          to={`/products?category=${cat.slug}`}
                          onClick={() => setCategoryMenuOpen(false)}
                          className={`flex items-center justify-between px-3.5 py-2 hover:bg-[#242933] transition group ${
                            isCatActive
                              ? 'bg-blue-600/15 text-white font-semibold border-l-2 border-blue-500'
                              : 'text-gray-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
                                isCatActive
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-[#232731] text-gray-400 group-hover:bg-[#2c323e] group-hover:text-blue-400'
                              }`}
                            >
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs truncate font-medium group-hover:text-white">
                                {cat.name}
                              </p>
                              {cat.desc && (
                                <p className="text-[10px] text-gray-400 truncate">
                                  {cat.desc}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {cat.badge && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${
                                  cat.badgeColor || 'bg-gray-700 text-gray-300'
                                }`}
                              >
                                {cat.badge}
                              </span>
                            )}
                            <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-gray-300 group-hover:translate-x-0.5 transition" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 border-t border-gray-800 px-2 mt-1">
                    <Link
                      to="/products"
                      onClick={() => setCategoryMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#232731] hover:bg-blue-600 text-gray-200 hover:text-white font-semibold rounded-lg text-xs transition"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Xem tất cả sản phẩm</span>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Center: Category Nav Links (Dynamic active underline) */}
          <nav className="hidden md:flex items-center gap-6 overflow-x-auto py-2">
            {navCategories.map((item) => {
              const active = isCategoryActive(item);
              return (
                <Link
                  key={item.name}
                  to={item.isHome ? '/' : `/products?category=${item.slug}`}
                  className={`text-xs font-semibold py-1 transition-all relative border-b-2 ${
                    active
                      ? 'text-white font-bold border-white'
                      : 'text-gray-300 hover:text-white border-transparent'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1e222a] border-t border-gray-800 px-4 py-4 space-y-2">
          <p className="text-[11px] font-bold uppercase text-gray-400 pb-1 border-b border-gray-800">
            Danh mục & Trang
          </p>
          {navCategories.map((item) => {
            const active = isCategoryActive(item);
            return (
              <Link
                key={item.name}
                to={item.isHome ? '/' : `/products?category=${item.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-1.5 px-2.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? 'text-white bg-blue-600/20 font-bold border-l-2 border-white pl-3'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/40'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default Header;
