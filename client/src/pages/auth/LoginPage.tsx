import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get('expired') === 'true';
  const redirectParam = searchParams.get('redirect');

  const locationState = location.state as { from?: string | { pathname: string }; successMessage?: string } | null;
  const fromState = locationState?.from;
  const fromLocation = redirectParam || (typeof fromState === 'string' ? fromState : fromState?.pathname);
  const successStateMessage = locationState?.successMessage;

  // Xóa sạch lỗi cũ khi mở modal
  useEffect(() => {
    clearError();
    setFormError(null);
  }, [clearError]);

  // Hiển thị thông báo khi phiên làm việc hết hạn
  useEffect(() => {
    if (isExpired) {
      setFormError('Phiên làm việc của bạn đã hết hạn hoặc không đủ quyền truy cập. Vui lòng đăng nhập lại!');
    }
  }, [isExpired]);

  const handleClose = useCallback(() => {
    // Kiểm tra xem trang trước đó có phải là trang công khai an toàn không
    const isProtected =
      !fromLocation ||
      fromLocation.startsWith('/admin') ||
      fromLocation.startsWith('/profile') ||
      fromLocation.startsWith('/checkout') ||
      fromLocation.startsWith('/my-orders') ||
      fromLocation.startsWith('/login') ||
      fromLocation.startsWith('/register') ||
      fromLocation.startsWith('/unauthorized');

    if (!isProtected) {
      navigate(fromLocation, { replace: true });
    } else {
      // Sau khi đăng xuất hoặc khi trang trước là trang bảo vệ, đóng modal chuyển ngay về Trang Chủ
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [fromLocation, navigate]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Hỗ trợ phím Escape để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim()) {
      setFormError('Vui lòng nhập địa chỉ Email hoặc Tên đăng nhập');
      return;
    }
    if (!password) {
      setFormError('Vui lòng nhập mật khẩu');
      return;
    }

    if (isLoading) return;

    try {
      const user = await login({ email: email.trim(), password });

      // Chuyển hướng theo đúng phân quyền: CUSTOMER → /, ADMIN → /admin
      const userRole = (user.role || '').toUpperCase();
      const isAdmin = userRole === ROLES.ADMIN || userRole === 'ROLE_ADMIN';

      if (isAdmin) {
        navigate(fromLocation && fromLocation.includes('/admin') ? fromLocation : ROUTES.ADMIN, { replace: true });
      } else {
        navigate(fromLocation && !fromLocation.includes('/admin') ? fromLocation : ROUTES.HOME, { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng nhập không thành công';
      setFormError(message);
    }
  };

  const handleQuickLogin = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setFormError(null);
    clearError();

    if (isLoading) return;

    try {
      const user = await login({ email: userEmail, password: userPass });
      const userRole = (user.role || '').toUpperCase();
      const isAdmin = userRole === ROLES.ADMIN || userRole === 'ROLE_ADMIN';

      if (isAdmin) {
        navigate(fromLocation && fromLocation.includes('/admin') ? fromLocation : ROUTES.ADMIN, { replace: true });
      } else {
        navigate(fromLocation && !fromLocation.includes('/admin') ? fromLocation : ROUTES.HOME, { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng nhập không thành công';
      setFormError(message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      {/* Modal White Card */}
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 sm:p-8 w-full max-w-md relative z-10 transition-all transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer z-30"
          title="Đóng (Esc)"
          aria-label="Đóng modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand Logo & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center">
            <img
              src="/images/nexor_logo.png"
              alt="NEXOR Logo"
              className="w-14 h-14 object-contain drop-shadow-md"
            />
          </div>
          <h1 id="login-modal-title" className="text-xl font-bold text-gray-900 tracking-tight">
            Đăng Nhập Tài Khoản
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Chào mừng bạn quay lại với NEXOR Flagship Tech Store
          </p>
        </div>

        {/* Success Alert (Khi đăng ký thành công chuyển sang) */}
        {successStateMessage && !formError && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Thành công!</span>
              <span>{successStateMessage}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {(formError || error) && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Đăng nhập thất bại</span>
              <span>{formError || error}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email or Username Input */}
          <Input
            label="Email hoặc Tên đăng nhập"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com hoặc username"
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoFocus
          />

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Mật khẩu
              </label>
              <a
                href="#forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  alert(
                    'Vui lòng liên hệ quản trị viên qua email cskh@nexor.vn để được hỗ trợ cấp lại mật khẩu!'
                  );
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                Quên mật khẩu?
              </a>
            </div>

            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />
          </div>

          {/* Remember me Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-gray-600">Ghi nhớ đăng nhập</span>
            </label>
          </div>

          {/* Submit CTA Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="dark"
              size="md"
              fullWidth
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Đăng nhập ngay
            </Button>
          </div>

          {/* Quick 1-Click Login Buttons */}
          <div className="pt-3 border-t border-gray-100 flex gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickLogin('admin@nexor.vn', '123123123')}
              className="flex-1 py-2 px-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
              title="1-Click Đăng nhập trực tiếp tài khoản Quản trị viên"
            >
              <span>🔑 1-Click Admin</span>
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickLogin('customer@nexor.vn', '123123123')}
              className="flex-1 py-2 px-2 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 transition flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
              title="1-Click Đăng nhập trực tiếp tài khoản Khách hàng"
            >
              <span>👤 1-Click Khách hàng</span>
            </button>
          </div>
        </form>

        {/* Switch to Register */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-600">
            Chưa có tài khoản NEXOR?{' '}
            <Link
              to={ROUTES.REGISTER}
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Đăng ký tài khoản mới
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
