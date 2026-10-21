import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f5f6fa] text-gray-800 font-sans">
      {/* Top Simple Header */}
      <header className="bg-[#181a20] border-b border-gray-800 py-3.5 px-4 sm:px-8">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 40 40" className="w-8 h-8 drop-shadow-md">
                <polygon points="20,4 34,12 20,20 6,12" fill="#e2e8f0" />
                <polygon points="6,12 20,20 20,36 6,28" fill="#94a3b8" />
                <polygon points="20,20 34,12 34,28 20,36" fill="#64748b" />
                <polygon points="20,10 27,14 20,18 13,14" fill="#0f172a" opacity="0.15" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white leading-none">
                E-Shop<span className="text-gray-200">TECH</span>
              </span>
              <span className="text-[10px] text-gray-400 tracking-wider font-normal mt-0.5">
                Tech for a better life
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="text-xs font-semibold text-gray-300 hover:text-white transition"
          >
            ← Về trang chủ
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Bottom Footer Note */}
      <footer className="border-t border-gray-200 bg-white py-4 px-4 text-center text-xs text-gray-500">
        <p>© {currentYear} E-ShopTECH. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  );
};

export default AuthLayout;
