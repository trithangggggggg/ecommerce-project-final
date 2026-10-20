import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Lấy đường dẫn trước đó nếu bị chặn bởi ProtectedRoute
  const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim()) {
      setFormError('Vui lòng nhập địa chỉ Email');
      return;
    }
    if (!password) {
      setFormError('Vui lòng nhập mật khẩu');
      return;
    }

    try {
      const user = await login({ email: email.trim(), password });

      // Chuyển hướng theo đúng phân quyền người dùng
      if (user.role === ROLES.ADMIN) {
        navigate(ROUTES.ADMIN, { replace: true });
      } else if (fromLocation) {
        navigate(fromLocation, { replace: true });
      } else {
        navigate(ROUTES.HOME, { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng nhập không thành công';
      setFormError(message);
    }
  };

  /**
   * Đăng nhập nhanh tài khoản mẫu (Phục vụ kiểm thử và chấm bài)
   */
  const handleQuickLogin = async (role: 'ADMIN' | 'CUSTOMER') => {
    clearError();
    setFormError(null);

    // Tài khoản khớp với seed data trong database/init.sql: admin@ecommerce.com / 123456
    const testEmail = role === 'ADMIN' ? 'admin@ecommerce.com' : 'customer@ecommerce.com';
    const testPassword = '123456';

    setEmail(testEmail);
    setPassword(testPassword);

    try {
      const user = await login({ email: testEmail, password: testPassword });
      if (user.role === ROLES.ADMIN) {
        navigate(ROUTES.ADMIN, { replace: true });
      } else if (fromLocation) {
        navigate(fromLocation, { replace: true });
      } else {
        navigate(ROUTES.HOME, { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi đăng nhập nhanh';
      setFormError(message);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Chào mừng trở lại!</h2>
        <p className="text-sm text-slate-500 mt-1">
          Nhập thông tin tài khoản để truy cập vào hệ thống
        </p>
      </div>

      {/* Quick Test Accounts Banner */}
      <div className="mb-6 p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
        <div className="text-xs font-semibold text-indigo-900 mb-2 flex items-center justify-between">
          <span>🚀 ĐĂNG NHẬP NHANH (MOCK ACCOUNTS):</span>
          <span className="text-[10px] text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full font-medium">
            Dành cho Dev & QA
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('ADMIN')}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-purple-700 bg-white hover:bg-purple-100/60 rounded-lg border border-purple-200 transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Admin Portal</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('CUSTOMER')}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-indigo-700 bg-white hover:bg-indigo-100/60 rounded-lg border border-indigo-200 transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Khách hàng</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {(formError || error) && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Đăng nhập thất bại</span>
            <span className="text-xs">{formError || error}</span>
          </div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Email tài khoản
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              required
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Mật khẩu
            </label>
            <a
              href="#forgot-password"
              onClick={(e) => {
                e.preventDefault();
                alert('Vui lòng liên hệ Admin qua email hỗ trợ để cấp lại mật khẩu!');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
            >
              Quên mật khẩu?
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 cursor-pointer">
            Ghi nhớ phiên đăng nhập trên thiết bị này
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg active:scale-99"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Đang xác thực...</span>
            </>
          ) : (
            <>
              <span>Đăng nhập ngay</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-600">
          Chưa có tài khoản E-Shop?{' '}
          <Link
            to={ROUTES.REGISTER}
            className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
          >
            Đăng ký tài khoản mới
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
