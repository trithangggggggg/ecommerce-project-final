import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { ROUTES } from '../constants/routes';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorative glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 text-center z-10">
        <Link
          to={ROUTES.HOME}
          className="inline-flex items-center gap-3 group transition-transform duration-300 hover:scale-105"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              E-SHOP <Sparkles className="w-4 h-4 text-amber-400 inline" />
            </span>
            <span className="text-xs text-indigo-300 tracking-wider uppercase block">
              Modern Ecommerce Platform
            </span>
          </div>
        </Link>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md z-10">
        <Outlet />
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-400 z-10">
        <p>© 2026 E-Shop Project. Nền tảng thương mại điện tử chuẩn Enterprise.</p>
      </div>
    </div>
  );
};

export default AuthLayout;
