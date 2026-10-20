import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, User, ArrowRight, Sparkles } from 'lucide-react';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Trang Chủ Khách Hàng (Khu vực của Member 3 - Hưng)
 * File này được tạo sẵn khung để ứng dụng React Router chạy thông suốt.
 */
export const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-800 block leading-tight">
              E-SHOP
            </span>
            <span className="text-[10px] text-indigo-600 font-semibold tracking-wider uppercase">
              Modern Ecommerce
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to={ROUTES.PROFILE}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <User className="w-4 h-4 text-indigo-600" />
                <span>{user?.fullName || 'Tài khoản'}</span>
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  to={ROUTES.ADMIN}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition flex items-center gap-1.5 shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Portal
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to={ROUTES.LOGIN}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Đăng nhập
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Banner / Welcome Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16 text-center flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Card [06] - Đã Hoàn Thành Phân Hệ Auth, Profile & Layout Admin (Member Lộc)</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
          Nền Tảng Thương Mại Điện Tử <br />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            E-Shop Modern Enterprise
          </span>
        </h1>

        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
          Hệ thống xác thực người dùng (Login, Register, Profile) và Layout Quản trị Admin đã sẵn sàng hoạt động.
          Khu vực hiển thị danh sách sản phẩm & Catalog sẽ do Member 3 (Hưng) tiếp tục hoàn thiện.
        </p>

        {/* Action Buttons to test Lộc's modules */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={ROUTES.LOGIN}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/25 transition flex items-center gap-2"
          >
            <span>Trang Đăng Nhập (/login)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to={ROUTES.REGISTER}
            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-sm font-semibold transition"
          >
            Trang Đăng Ký (/register)
          </Link>

          <Link
            to={ROUTES.PROFILE}
            className="px-6 py-3 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
          >
            <User className="w-4 h-4" />
            Hồ Sơ Cá Nhân (/profile)
          </Link>

          <Link
            to={ROUTES.ADMIN}
            className="px-6 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            Layout Admin (/admin)
          </Link>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>© 2026 E-Shop Project. Phân hệ của Lộc (Auth + Profile + Admin Layout).</p>
      </footer>
    </div>
  );
};

export default HomePage;
