import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../constants/routes';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    clearError();

    // Client Validation
    if (!fullName.trim()) {
      setFormError('Vui lòng nhập họ và tên của bạn');
      return;
    }
    if (!email.trim()) {
      setFormError('Vui lòng nhập địa chỉ email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Địa chỉ email không đúng định dạng');
      return;
    }
    if (password.length < 6) {
      setFormError('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!agreeTerms) {
      setFormError('Bạn cần đồng ý với Điều khoản dịch vụ để tiếp tục');
      return;
    }

    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        confirmPassword,
      });

      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển hướng sang trang đăng nhập...');
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng ký không thành công';
      setFormError(message);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Tạo tài khoản mới</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gia nhập cộng đồng mua sắm thông minh E-Shop ngay hôm nay
        </p>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Thành công!</span>
            <span className="text-xs">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {(formError || error) && !successMessage && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Không thể đăng ký</span>
            <span className="text-xs">{formError || error}</span>
          </div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Họ và tên
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Địa chỉ Email
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

        {/* Phone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Số điện thoại <span className="text-slate-400 font-normal lowercase">(tùy chọn)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912 345 678"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Mật khẩu
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
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

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Xác nhận mật khẩu
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              required
            />
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start pt-1">
          <input
            id="terms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="terms" className="ml-2 block text-xs text-slate-600 leading-relaxed cursor-pointer">
            Tôi đồng ý với{' '}
            <span className="text-indigo-600 font-medium hover:underline">Điều khoản sử dụng</span>{' '}
            và <span className="text-indigo-600 font-medium hover:underline">Chính sách bảo mật</span> của E-Shop.
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !!successMessage}
          className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg active:scale-99"
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
              <span>Đang tạo tài khoản...</span>
            </>
          ) : (
            <>
              <span>Đăng ký tài khoản</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-600">
          Đã có tài khoản?{' '}
          <Link
            to={ROUTES.LOGIN}
            className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
