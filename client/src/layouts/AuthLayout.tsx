import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col justify-between relative bg-slate-950 text-gray-800 font-sans overflow-x-hidden">
      {/* Immersive Blurred Background Image */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">
        <img
          src="/images/tech-future-banner.jpg"
          alt="Auth Background"
          className="w-full h-full object-cover scale-105 filter blur-md brightness-[0.55] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[4px]" />
      </div>

      {/* Top Refined Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 py-2.5 px-4 sm:px-8 sticky top-0 z-40 transition-colors">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg bg-white/5 border border-white/10 p-1 group-hover:border-white/20 transition">
              <img
                src="/images/nexor_logo.png"
                alt="NEXOR Logo"
                className="w-full h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-tight text-white leading-none">
                NEXOR<span className="text-blue-500">.</span>
              </span>
              <span className="text-[10px] text-gray-400 tracking-wider font-normal mt-0.5">
                Tech for a better life
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về trang chủ</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-3 sm:py-5 relative">
        <div className="w-full max-w-2xl flex items-center justify-center">
          <Outlet />
        </div>
      </main>

      {/* Bottom Footer Note */}
      <footer className="border-t border-white/10 bg-slate-900/60 backdrop-blur-md py-2 px-4 text-center text-[11px] text-gray-400">
        <p>© {currentYear} NEXOR Flagship Store. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  );
};

export default AuthLayout;
