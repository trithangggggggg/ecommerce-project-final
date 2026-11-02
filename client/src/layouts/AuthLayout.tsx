import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Headphones, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import authBgImage from '../assets/images/auth-bg.jpg';
import nexorLogoWhite from '../assets/images/nexor-logo-white.png';

export const AuthLayout: React.FC = () => {
  return (
    <div
      className="min-h-screen relative font-sans text-gray-900 overflow-x-hidden flex flex-col justify-between bg-slate-950 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${authBgImage})` }}
    >
      {/* 1. Fullscreen Background Image Layer */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
        <img
          src={authBgImage}
          alt="Nexor Background"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* 2. Top-Right Quick Info Bar */}
      <header className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-8 pt-3 sm:pt-4 flex items-center justify-between">
        {/* Mobile-only logo */}
        <Link to="/" className="flex lg:hidden items-center gap-2.5 group">
          <img
            src={nexorLogoWhite}
            alt="Nexor"
            className="h-9 w-auto object-contain drop-shadow-md"
          />
          <span className="text-2xl font-black text-white tracking-tight">Nexor</span>
        </Link>

        {/* Desktop Top Right Service Bar */}
        <div className="ml-auto hidden sm:flex items-center gap-3 sm:gap-4 text-xs font-semibold text-gray-800 bg-white/70 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none px-3 py-1 rounded-full sm:rounded-none">
          <div className="flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5 text-gray-700" />
            <span>Hỗ trợ 24/7</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-700" />
            <span>Thanh toán an toàn</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-gray-700" />
            <span>Giao hàng toàn quốc</span>
          </div>
        </div>
      </header>

      {/* 3. Main Stage: 2-Column Split matching Mockup (Ảnh 1) */}
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-2 sm:py-4 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start lg:items-center">
          {/* CỘT TRÁI (Hero Text & Badges - ĐƯỢC ĐẨY LÊN CAO, KHÔNG CHE THIẾT BỊ NỀN) */}
          <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 flex-col justify-start self-start pt-1 xl:pt-3 pr-4">
            {/* Top Left Brand Logo - Đưa lên cao, đều màu trắng sáng, sắc nét */}
            <div>
              <Link to="/" className="inline-flex items-center gap-3 group">
                <img
                  src={nexorLogoWhite}
                  alt="Nexor Logo"
                  className="h-10 sm:h-11 w-auto object-contain drop-shadow group-hover:scale-105 transition-transform"
                />
                <div className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none group-hover:text-blue-100 transition-colors">
                    Nexor
                  </span>
                  <span className="text-xs text-gray-300 tracking-normal mt-1 font-medium">
                    Tech for a Better Tomorrow
                  </span>
                </div>
              </Link>
            </div>

            {/* Toàn bộ khối tiêu đề, mô tả và 3 Badges được đẩy lên cao ngay dưới Logo */}
            <div className="mt-7 space-y-3.5 max-w-xl">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white leading-[1.18] tracking-tight drop-shadow-sm">
                Khám phá thế giới
                <br />
                công nghệ <span className="text-white font-black">đỉnh cao</span>
              </h1>
              <p className="text-gray-200 text-sm sm:text-base leading-relaxed max-w-md font-normal">
                Laptop, PC, Gaming Gear, Smartphone
                <br />
                và nhiều sản phẩm công nghệ chính hãng.
              </p>

              {/* 3 Badges chính hãng / giao hàng / hỗ trợ */}
              <div className="flex items-center gap-4 sm:gap-6 pt-2">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-white shrink-0" />
                  <div className="text-xs">
                    <div className="text-gray-300 font-medium leading-tight">Hàng chính hãng</div>
                    <div className="text-white font-bold leading-tight mt-0.5">100%</div>
                  </div>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-white shrink-0" />
                  <div className="text-xs">
                    <div className="text-gray-300 font-medium leading-tight">Giao hàng</div>
                    <div className="text-white font-bold leading-tight mt-0.5">nhanh chóng</div>
                  </div>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-4 h-4 text-white shrink-0" />
                  <div className="text-xs">
                    <div className="text-gray-300 font-medium leading-tight">Hỗ trợ tận tâm</div>
                    <div className="text-white font-bold leading-tight mt-0.5">24/7</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Khoảng trống thoáng đãng phía dưới để lộ hoàn toàn dàn Laptop ROG, iPhone, Tai nghe, Bàn phím từ ảnh nền */}
            <div className="min-h-[200px] xl:min-h-[250px] pointer-events-none" />
          </div>

          {/* CỘT PHẢI: Khung thẻ Card màu trắng nổi (Outlet cho Login / Register) */}
          <div className="col-span-1 lg:col-span-5 xl:col-span-5 flex items-center justify-center lg:justify-end py-1 sm:py-2">
            <Outlet />
          </div>
        </div>
      </main>

      {/* 4. Bottom Footer Note */}
      <footer className="relative z-10 w-full text-center py-2 text-[10px] sm:text-xs text-gray-500/80 pointer-events-none select-none">
        © {new Date().getFullYear()} Nexor Store. All rights reserved.
      </footer>
    </div>
  );
};

export default AuthLayout;
