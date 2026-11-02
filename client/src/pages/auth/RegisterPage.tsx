import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../constants/routes';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, verifyOtp, resendOtp, isLoading, error, clearError } = useAuthStore();

  // Step: 'form' (Nhập thông tin) | 'otp' (Xác thực OTP 6 số)
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // OTP Fields & State
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  // Status & Feedback Messages
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Xóa sạch lỗi cũ khi vào trang
  useEffect(() => {
    clearError();
    setFormError(null);
  }, [clearError]);

  // Bộ đếm ngược 60 giây cho nút Gửi lại OTP
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  // Xử lý gửi form đăng ký (Step 1)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading || isSubmitting || toastMessage) return;

    setFormError(null);
    setSuccessMessage(null);
    clearError();

    // Validate client
    if (!fullName.trim()) {
      setFormError('Vui lòng nhập họ và tên của bạn');
      return;
    }

    if (!username.trim()) {
      setFormError('Vui lòng nhập tên đăng nhập');
      return;
    }
    if (username.trim().length < 3) {
      setFormError('Tên đăng nhập phải có tối thiểu 3 ký tự');
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

    const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
    if (cleanPhone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
      setFormError('Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09)');
      return;
    }

    if (!password) {
      setFormError('Vui lòng nhập mật khẩu');
      return;
    }
    if (password.length < 6) {
      setFormError('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }

    if (!confirmPassword) {
      setFormError('Vui lòng xác nhận lại mật khẩu');
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

    setIsSubmitting(true);

    try {
      await register({
        username: username.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        phone: cleanPhone || undefined,
        phoneNumber: cleanPhone || undefined,
        address: address.trim() || undefined,
        password,
        confirmPassword,
      });

      // Thành công Step 1: Chuyển sang Step 2 (Nhập OTP)
      setStep('otp');
      setCountdown(60);
      setSuccessMessage(`Mã xác thực OTP gồm 6 chữ số đã được gửi tới email ${email.trim()}. Vui lòng kiểm tra hộp thư!`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Đăng ký không thành công. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý xác thực OTP (Step 2)
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading || isSubmitting) return;

    setFormError(null);
    clearError();

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setFormError('Vui lòng nhập mã OTP gồm 6 chữ số');
      return;
    }
    if (!/^[0-9]{6}$/.test(cleanOtp)) {
      setFormError('Mã OTP phải gồm đúng 6 chữ số');
      return;
    }

    setIsSubmitting(true);

    try {
      await verifyOtp({
        email: email.trim(),
        otp: cleanOtp,
      });

      setToastMessage('Xác thực thành công! Tài khoản của bạn đã được kích hoạt.');
      setSuccessMessage('Kích hoạt tài khoản thành công! Đang chuyển hướng vào hệ thống...');

      setTimeout(() => {
        navigate(ROUTES.HOME, { replace: true });
      }, 1500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Mã OTP không chính xác hoặc đã hết hạn!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý gửi lại mã OTP (Step 2)
  const handleResendOtp = async () => {
    if (countdown > 0 || isResending) return;

    setFormError(null);
    clearError();
    setIsResending(true);

    try {
      const msg = await resendOtp({ email: email.trim() });
      setCountdown(60);
      setSuccessMessage(msg || 'Mã OTP mới đã được gửi tới email của bạn!');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không thể gửi lại mã OTP. Vui lòng thử lại sau!');
    } finally {
      setIsResending(false);
    }
  };

  const isButtonBusy = isLoading || isSubmitting || !!toastMessage;

  return (
    <div className="w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 p-4 sm:p-5 font-sans relative my-auto">
      {/* Toast Notification khi thành công */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900/95 backdrop-blur-md text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500/40 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-300">{toastMessage}</p>
            <p className="text-xs text-gray-300">Đang tự động chuyển hướng...</p>
          </div>
        </div>
      )}

      {/* Header Form */}
      <div className="text-center mb-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-[11px] font-bold tracking-wide uppercase mb-1">
          {step === 'form' ? (
            <>
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Gia nhập NEXOR Flagship</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Bước 2: Xác thực Bảo Mật</span>
            </>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          {step === 'form' ? 'Tạo Tài Khoản Mới' : 'Xác Thực Mã OTP'}
        </h1>
        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
          {step === 'form'
            ? 'Khám phá hệ sinh thái thiết bị công nghệ & ưu đãi thành viên'
            : 'Hoàn tất kích hoạt tài khoản của bạn qua mã xác thực email'}
        </p>
      </div>

      {/* Inline Success Alert */}
      {successMessage && (
        <div className="mb-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-emerald-800 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Thông báo</span>
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Inline Error Alert */}
      {(formError || error) && (
        <div className="mb-2.5 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Lỗi thao tác</span>
            <span>{formError || error}</span>
          </div>
        </div>
      )}

      {/* STEP 1: FORM ĐĂNG KÝ THÔNG TIN */}
      {step === 'form' && (
        <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Cột 1: Họ tên */}
            <Input
              label="Họ và tên"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              leftIcon={<User className="w-3.5 h-3.5" />}
              required
            />

            {/* Cột 2: Username */}
            <Input
              label="Tên đăng nhập"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="VD: nguyenvana (≥3 ký tự)"
              leftIcon={<User className="w-3.5 h-3.5" />}
              required
            />

            {/* Cột 1: Email */}
            <Input
              label="Địa chỉ Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              leftIcon={<Mail className="w-3.5 h-3.5" />}
              required
            />

            {/* Cột 2: SĐT - TÙY CHỌN */}
            <Input
              label="Số điện thoại (tùy chọn)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912 345 678"
              leftIcon={<Phone className="w-3.5 h-3.5" />}
            />

            {/* Cột 1: Mật khẩu */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Mật khẩu
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                }
                required
              />
            </div>

            {/* Cột 2: Xác nhận mật khẩu */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Xác nhận mật khẩu
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                required
              />
            </div>

            {/* Ô Địa chỉ - TÙY CHỌN */}
            <div className="sm:col-span-2">
              <Input
                label="Địa chỉ giao hàng (tùy chọn)"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành"
                leftIcon={<MapPin className="w-3.5 h-3.5" />}
              />
            </div>
          </div>

          {/* Điều khoản Checkbox */}
          <div className="flex items-center pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[11px] text-gray-600 leading-tight">
                Tôi đồng ý với{' '}
                <span className="text-blue-600 font-semibold hover:underline">Điều khoản dịch vụ</span>{' '}
                và <span className="text-blue-600 font-semibold hover:underline">Chính sách bảo mật</span> của NEXOR.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-1">
            <Button
              type="submit"
              variant="dark"
              size="md"
              fullWidth
              isLoading={isButtonBusy}
              disabled={isButtonBusy}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="py-2 text-sm shadow-md cursor-pointer"
            >
              Tiếp tục: Nhận mã OTP kích hoạt
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2: FORM XÁC THỰC MÃ OTP */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 pt-1">
          {/* Thông tin email nhận mã */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-[11px] text-blue-600 block font-medium">Mã gửi tới email:</span>
                <span className="font-bold text-gray-900">{email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setFormError(null);
                setSuccessMessage(null);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Đổi email</span>
            </button>
          </div>

          {/* Ô nhập mã OTP 6 số */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 text-center">
              Nhập mã OTP gồm 6 chữ số
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(val);
              }}
              placeholder="••••••"
              className="w-full text-center text-2xl sm:text-3xl font-black tracking-[0.4em] sm:tracking-[0.5em] py-3 px-4 bg-gray-50 border-2 border-gray-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300 placeholder:tracking-widest"
              required
            />
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 font-medium mt-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Mã OTP có hiệu lực trong vòng 5 phút</span>
            </div>
          </div>

          {/* Action Buttons: Xác nhận & Gửi lại */}
          <div className="space-y-2 pt-1">
            <Button
              type="submit"
              variant="dark"
              size="md"
              fullWidth
              isLoading={isButtonBusy}
              disabled={isButtonBusy || otp.length !== 6}
              rightIcon={<ShieldCheck className="w-4 h-4" />}
              className="py-2.5 text-sm shadow-md cursor-pointer font-bold"
            >
              Xác thực & Kích hoạt tài khoản
            </Button>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep('form')}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                className="text-xs cursor-pointer"
              >
                Quay lại
              </Button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={countdown > 0 || isResending}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                  countdown > 0 || isResending
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {isResending
                    ? 'Đang gửi lại...'
                    : countdown > 0
                    ? `Gửi lại mã sau (${countdown}s)`
                    : 'Gửi lại mã OTP'}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Footer Link sang Đăng nhập */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-600">
          Đã có tài khoản?{' '}
          <Link
            to={ROUTES.LOGIN}
            className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
