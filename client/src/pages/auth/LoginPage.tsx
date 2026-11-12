import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
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
import nexorLogo from '../../assets/images/nexor_logo.png';

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
            src={nexorLogo}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/nexor_logo.png';
            }}
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
              className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white rounded-xl border transition-all outline-none ${touched.emailOrUsername && fieldErrors.emailOrUsername
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
              className={`w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white rounded-xl border transition-all outline-none ${touched.password && fieldErrors.password
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
        </div>

        {/* Nút bấm Đăng nhập */}
        <div className="pt-2">
          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading}
            className="bg-[#111827] hover:bg-black text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer w-full border-0"
          >
            Đăng nhập
          </Button>
        </div>
      </form>

      {/* Footer Link */}
      <div className="mt-5 pt-4 border-t border-gray-100 text-center">
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
