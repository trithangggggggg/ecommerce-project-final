import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  SquarePen,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import Button from '../../components/common/Button/Button';
import nexorLogoBlack from '../../assets/images/nexor-logo-black.png';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field-level Validation & Touched state
  const [touched, setTouched] = useState<{ emailOrUsername?: boolean; password?: boolean }>({});
  const [fieldErrors, setFieldErrors] = useState<{ emailOrUsername?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get('expired') === 'true';
  const redirectParam = searchParams.get('redirect');

  const locationState = location.state as {
    from?: string | { pathname: string };
    successMessage?: string;
  } | null;
  const fromState = locationState?.from;
  const fromLocation =
    redirectParam || (typeof fromState === 'string' ? fromState : fromState?.pathname);
  const successStateMessage = locationState?.successMessage;

  useEffect(() => {
    clearError();
    setFormError(null);
  }, [clearError]);

  useEffect(() => {
    if (isExpired) {
      setFormError('Phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục!');
    }
  }, [isExpired]);

  const validateField = (field: 'emailOrUsername' | 'password', value: string) => {
    const errs = { ...fieldErrors };
    if (field === 'emailOrUsername') {
      if (!value.trim()) {
        errs.emailOrUsername = 'Vui lòng nhập Email hoặc Tên đăng nhập';
      } else {
        delete errs.emailOrUsername;
      }
    }

    if (field === 'password') {
      if (!value) {
        errs.password = 'Vui lòng nhập mật khẩu';
      } else if (value.length < 6) {
        errs.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      } else {
        delete errs.password;
      }
    }
    setFieldErrors(errs);
  };

  const handleBlur = (field: 'emailOrUsername' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, field === 'emailOrUsername' ? emailOrUsername : password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    setTouched({ emailOrUsername: true, password: true });

    const errs: { emailOrUsername?: string; password?: string } = {};
    if (!emailOrUsername.trim()) {
      errs.emailOrUsername = 'Vui lòng nhập Email hoặc Tên đăng nhập';
    }
    if (!password) {
      errs.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      errs.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    if (isLoading) return;

    try {
      const user = await login({ email: emailOrUsername.trim(), password });

      const userRole = (user.role || '').toUpperCase();
      const isAdmin = userRole === ROLES.ADMIN || userRole === 'ROLE_ADMIN';

      if (isAdmin) {
        navigate(
          fromLocation && fromLocation.includes('/admin') ? fromLocation : ROUTES.ADMIN,
          { replace: true }
        );
      } else {
        navigate(
          fromLocation && !fromLocation.includes('/admin') ? fromLocation : ROUTES.HOME,
          { replace: true }
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng nhập không thành công';
      setFormError(message);
    }
  };

  return (
    <div className="w-full max-w-[460px] sm:max-w-[480px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.22)] border border-gray-100 p-6 sm:p-7 font-sans my-auto">
      {/* 1. Header: Logo & Title (Căn chỉnh pixel hoàn toàn đồng bộ với trang Đăng ký) */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img
            src={nexorLogoBlack}
            alt="Nexor"
            className="h-8 w-auto object-contain"
          />
          <span className="text-2xl font-black text-gray-900 tracking-tight">Nexor</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          Chào mừng trở lại!
        </h1>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto min-h-[36px] flex items-center justify-center">
          Đăng nhập để tiếp tục mua sắm và khám phá thêm nhiều ưu đãi hấp dẫn
        </p>
      </div>

      {/* 2. Navigation Tabs (Đăng nhập [Active] | Đăng ký) */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          type="button"
          className="flex-1 pb-2.5 text-xs sm:text-sm font-bold text-gray-950 border-b-2 border-gray-950 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span>Đăng nhập</span>
        </button>
        <Link
          to={ROUTES.REGISTER}
          className="flex-1 pb-2.5 text-xs sm:text-sm font-medium text-gray-400 hover:text-gray-700 flex items-center justify-center gap-1.5 transition-colors border-b-2 border-transparent"
        >
          <SquarePen className="w-4 h-4" />
          <span>Đăng ký</span>
        </Link>
      </div>

      {/* Thông báo điều hướng thành công */}
      {successStateMessage && (
        <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span className="flex-1 leading-snug">{successStateMessage}</span>
        </div>
      )}

      {/* Thông báo lỗi */}
      {(formError || error) && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-snug">
            <span className="font-medium">{formError || error}</span>
            {(formError?.toLowerCase().includes('kích hoạt') ||
              error?.toLowerCase().includes('kích hoạt')) && (
              <div className="mt-1.5 pt-1.5 border-t border-red-200/80">
                <Link
                  to={`${ROUTES.REGISTER}?step=otp&email=${encodeURIComponent(
                    emailOrUsername.includes('@') ? emailOrUsername.trim() : ''
                  )}`}
                  className="font-bold underline text-red-800 hover:text-red-950 inline-flex items-center gap-1"
                >
                  Nhấp vào đây để xác thực mã OTP ngay →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Form Đăng nhập */}
      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        {/* Email hoặc số điện thoại */}
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5">
            Email hoặc số điện thoại
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={emailOrUsername}
              onChange={(e) => {
                setEmailOrUsername(e.target.value);
                if (touched.emailOrUsername) validateField('emailOrUsername', e.target.value);
              }}
              onBlur={() => handleBlur('emailOrUsername')}
              placeholder="Nhập email hoặc số điện thoại"
              className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white rounded-xl border transition-all outline-none ${
                touched.emailOrUsername && fieldErrors.emailOrUsername
                  ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'border-gray-200 hover:border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5'
              }`}
            />
          </div>
          {touched.emailOrUsername && fieldErrors.emailOrUsername && (
            <p className="text-[11px] text-red-600 font-medium mt-1">
              {fieldErrors.emailOrUsername}
            </p>
          )}
        </div>

        {/* Mật khẩu */}
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5">
            Mật khẩu
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (touched.password) validateField('password', e.target.value);
              }}
              onBlur={() => handleBlur('password')}
              placeholder="Nhập mật khẩu"
              className={`w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white rounded-xl border transition-all outline-none ${
                touched.password && fieldErrors.password
                  ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'border-gray-200 hover:border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {touched.password && fieldErrors.password && (
            <p className="text-[11px] text-red-600 font-medium mt-1">{fieldErrors.password}</p>
          )}

          {/* Quên mật khẩu? căn lề phải */}
          <div className="text-right mt-1.5">
            <Link
              to="/forgot-password"
              className="text-[11px] text-gray-500 hover:text-gray-950 font-medium hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        {/* Nút bấm Đăng nhập */}
        <div className="pt-1">
          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="bg-[#111827] hover:bg-black text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer w-full border-0"
          >
            Đăng nhập
          </Button>
        </div>
      </form>

      {/* 4. Separator "Hoặc đăng nhập bằng" */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-center">
          <span className="bg-white px-3 text-[11px] text-gray-400 font-medium">
            Hoặc đăng nhập bằng
          </span>
        </div>
      </div>

      {/* 5. 3 Nút Đăng nhập Mạng xã hội */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => alert('Đăng nhập với Google đang phát triển!')}
          className="border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 rounded-xl py-2 px-2 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.37 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.13z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.63 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
            />
          </svg>
          <span className="text-[11px] truncate">Google</span>
        </button>

        <button
          type="button"
          onClick={() => alert('Đăng nhập với Facebook đang phát triển!')}
          className="border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 rounded-xl py-2 px-2 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-[#1877F2] fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="text-[11px] truncate">Facebook</span>
        </button>

        <button
          type="button"
          onClick={() => alert('Đăng nhập với Apple đang phát triển!')}
          className="border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 rounded-xl py-2 px-2 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 fill-current text-gray-900 shrink-0" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.63 1.34-.56.64-1.05 1.69-.92 2.71 1 .08 2.02-.45 2.63-1.2" />
          </svg>
          <span className="text-[11px] truncate">Apple</span>
        </button>
      </div>

      {/* 6. Footer Link */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          Chưa có tài khoản?{' '}
          <Link
            to={ROUTES.REGISTER}
            className="font-bold text-gray-950 hover:underline inline-block"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
