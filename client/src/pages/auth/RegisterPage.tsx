import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
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
  SquarePen,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../constants/routes';
import Button from '../../components/common/Button/Button';
import nexorLogoBlack from '../../assets/images/nexor-logo-black.png';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Field-level Error & Touched states
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // OTP Fields & 6-Box State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  // Status & Feedback Messages
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Hỗ trợ truy cập trực tiếp từ URL: /register?step=otp&email=user@example.com
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialStep = params.get('step');
    const initialEmail = params.get('email');
    if (initialStep === 'otp' && initialEmail) {
      setEmail(initialEmail);
      setStep('otp');
      setSuccessMessage(`Vui lòng nhập mã OTP 6 chữ số đã gửi tới email ${initialEmail}`);
    }
  }, [location.search]);

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

  // Tự động focus vào ô OTP đầu tiên khi chuyển sang step otp
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Tính toán độ mạnh mật khẩu (Password Strength Score: 0..3)
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-gray-200', text: '' };
    if (password.length < 6) {
      return { score: 1, label: 'Yếu', color: 'bg-red-500', text: 'text-red-500' };
    }
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    if (password.length >= 8 && hasLetters && hasNumbers && hasSpecial) {
      return { score: 3, label: 'Rất mạnh', color: 'bg-emerald-500', text: 'text-emerald-600' };
    }
    if ((hasLetters && hasNumbers) || password.length >= 8) {
      return { score: 2, label: 'Trung bình', color: 'bg-amber-500', text: 'text-amber-600' };
    }
    return { score: 1, label: 'Yếu', color: 'bg-red-500', text: 'text-red-500' };
  }, [password]);

  // Validate từng field trực tiếp
  const validateField = (field: string, val: string) => {
    const errs = { ...fieldErrors };

    switch (field) {
      case 'fullName':
        if (!val.trim()) {
          errs.fullName = 'Vui lòng nhập họ và tên';
        } else if (val.trim().length < 2) {
          errs.fullName = 'Tối thiểu 2 ký tự';
        } else {
          delete errs.fullName;
        }
        break;

      case 'username':
        if (!val.trim()) {
          errs.username = 'Vui lòng nhập tên đăng nhập';
        } else if (val.trim().length < 3) {
          errs.username = 'Tối thiểu 3 ký tự';
        } else if (!/^[a-zA-Z0-9_]+$/.test(val.trim())) {
          errs.username = 'Chỉ gồm chữ cái, số và dấu _';
        } else {
          delete errs.username;
        }
        break;

      case 'email':
        if (!val.trim()) {
          errs.email = 'Vui lòng nhập email';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
          errs.email = 'Email không đúng định dạng';
        } else {
          delete errs.email;
        }
        break;

      case 'phone':
        if (val.trim()) {
          const cleanPhone = val.trim().replace(/[\s.-]/g, '');
          if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
            errs.phone = 'SĐT 10 số (đầu 03, 05, 07, 08, 09)';
          } else {
            delete errs.phone;
          }
        } else {
          delete errs.phone;
        }
        break;

      case 'password':
        if (!val) {
          errs.password = 'Vui lòng nhập mật khẩu';
        } else if (val.length < 6) {
          errs.password = 'Tối thiểu 6 ký tự';
        } else {
          delete errs.password;
        }
        break;

      case 'confirmPassword':
        if (!val) {
          errs.confirmPassword = 'Vui lòng xác nhận mật khẩu';
        } else if (val !== password) {
          errs.confirmPassword = 'Mật khẩu xác nhận không khớp';
        } else {
          delete errs.confirmPassword;
        }
        break;

      default:
        break;
    }

    setFieldErrors(errs);
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let val = '';
    if (field === 'fullName') val = fullName;
    if (field === 'username') val = username;
    if (field === 'email') val = email;
    if (field === 'phone') val = phone;
    if (field === 'password') val = password;
    if (field === 'confirmPassword') val = confirmPassword;
    validateField(field, val);
  };

  // Xử lý OTP input
  const handleDigitChange = (index: number, val: string) => {
    const cleanChar = val.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleanChar) {
      newDigits[index] = cleanChar.slice(-1);
      setOtpDigits(newDigits);
      if (index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    } else {
      newDigits[index] = '';
      setOtpDigits(newDigits);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (!pasted) return;

    const chars = pasted.slice(0, 6).split('');
    const newDigits = ['', '', '', '', '', ''];
    chars.forEach((c, idx) => {
      newDigits[idx] = c;
    });
    setOtpDigits(newDigits);

    const focusIdx = Math.min(chars.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
  };

  // Submit đăng ký
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      fullName: true,
      username: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Vui lòng nhập họ và tên';
    if (!username.trim()) errs.username = 'Vui lòng nhập tên đăng nhập';
    else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errs.username = 'Chỉ gồm chữ cái, số và dấu _';
    }
    if (!email.trim()) errs.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Email không đúng định dạng';
    }
    if (!password) errs.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) errs.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (!confirmPassword) errs.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    else if (confirmPassword !== password) errs.confirmPassword = 'Mật khẩu xác nhận không khớp';

    if (phone.trim()) {
      const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
      if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
        errs.phone = 'SĐT 10 số (đầu 03, 05, 07, 08, 09)';
      }
    }

    if (!agreeTerms) {
      errs.terms = 'Bạn cần đồng ý với điều khoản sử dụng';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFormError('Vui lòng kiểm tra lại các trường thông tin bên dưới');
      return;
    }

    if (isLoading || isSubmitting) return;

    setFormError(null);
    clearError();
    setIsSubmitting(true);

    try {
      const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
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

      setStep('otp');
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage(
        `Mã OTP 6 số đã được gửi tới email ${email.trim()}. Vui lòng kiểm tra hộp thư!`
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Đăng ký không thành công. Vui lòng thử lại!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit xác thực OTP
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading || isSubmitting) return;

    setFormError(null);
    clearError();

    const fullOtp = otpDigits.join('').trim();
    if (fullOtp.length !== 6) {
      setFormError('Vui lòng nhập đủ 6 chữ số OTP');
      return;
    }

    setIsSubmitting(true);

    try {
      await verifyOtp({
        email: email.trim(),
        otp: fullOtp,
      });

      setToastMessage('Xác thực thành công! Tài khoản đã được kích hoạt.');
      setSuccessMessage('Kích hoạt thành công! Đang chuyển hướng...');

      setTimeout(() => {
        navigate(ROUTES.HOME, { replace: true });
      }, 1500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Mã OTP không chính xác hoặc đã hết hạn!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || isResending) return;

    setFormError(null);
    clearError();
    setIsResending(true);

    try {
      const msg = await resendOtp({ email: email.trim() });
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      setSuccessMessage(msg || 'Mã OTP mới đã được gửi tới email!');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Không thể gửi lại mã OTP. Vui lòng thử lại sau!'
      );
    } finally {
      setIsResending(false);
    }
  };

  const isButtonBusy = isLoading || isSubmitting || !!toastMessage;
  const isOtpComplete = otpDigits.every((d) => d !== '');

  return (
    <div className="w-full max-w-[460px] sm:max-w-[480px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.22)] border border-gray-100 p-6 sm:p-7 font-sans my-auto">
      {/* Toast Notification khi thành công */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900/95 backdrop-blur-md text-white text-xs px-3.5 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-500/40 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-emerald-300">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header: Logo & Title (Căn chỉnh pixel hoàn toàn đồng bộ với trang Đăng nhập) */}
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
          {step === 'form' ? 'Tạo Tài Khoản NEXOR' : 'Xác Thực Mã OTP'}
        </h1>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto min-h-[36px] flex items-center justify-center">
          {step === 'form'
            ? 'Đăng ký thành viên để khám phá thế giới công nghệ đỉnh cao'
            : 'Nhập mã 6 chữ số gửi tới email để hoàn tất kích hoạt'}
        </p>
      </div>

      {/* 2. Navigation Tabs (Đăng nhập | Đăng ký [Active]) */}
      {step === 'form' && (
        <div className="flex border-b border-gray-200 mb-4">
          <Link
            to={ROUTES.LOGIN}
            className="flex-1 pb-2.5 text-xs sm:text-sm font-medium text-gray-400 hover:text-gray-700 flex items-center justify-center gap-1.5 transition-colors border-b-2 border-transparent"
          >
            <User className="w-4 h-4" />
            <span>Đăng nhập</span>
          </Link>
          <button
            type="button"
            className="flex-1 pb-2.5 text-xs sm:text-sm font-bold text-gray-950 border-b-2 border-gray-950 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <SquarePen className="w-4 h-4" />
            <span>Đăng ký</span>
          </button>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-emerald-800 text-[11px] animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
          <span className="flex-1 leading-tight">{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {(formError || error) && (
        <div className="mb-2.5 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-[11px] animate-shake">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
          <span className="flex-1 leading-tight font-medium">{formError || error}</span>
        </div>
      )}

      {/* STEP 1: FORM ĐĂNG KÝ (2 Cột tinh gọn không cuộn) */}
      {step === 'form' && (
        <form onSubmit={handleRegisterSubmit} className="space-y-2.5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            {/* Họ và tên */}
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                Họ và tên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (touched.fullName) validateField('fullName', e.target.value);
                  }}
                  onBlur={() => handleBlur('fullName')}
                  placeholder="Nguyễn Văn A"
                  className={`w-full pl-8 pr-2.5 py-1.5 text-xs bg-white rounded-lg border transition-all outline-none ${
                    touched.fullName && fieldErrors.fullName
                      ? 'border-red-400 focus:ring-1 focus:ring-red-100'
                      : 'border-gray-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/5'
                  }`}
                />
              </div>
              {touched.fullName && fieldErrors.fullName && (
                <p className="text-[10px] text-red-600 font-medium mt-0.5">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Tên đăng nhập */}
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (touched.username) validateField('username', e.target.value);
                  }}
                  onBlur={() => handleBlur('username')}
                  placeholder="nguyenvana"
                  className={`w-full pl-8 pr-2.5 py-1.5 text-xs bg-white rounded-lg border transition-all outline-none ${
                    touched.username && fieldErrors.username
                      ? 'border-red-400 focus:ring-1 focus:ring-red-100'
                      : 'border-gray-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/5'
                  }`}
                />
              </div>
              {touched.username && fieldErrors.username && (
                <p className="text-[10px] text-red-600 font-medium mt-0.5">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) validateField('email', e.target.value);
                  }}
                  onBlur={() => handleBlur('email')}
                  placeholder="name@example.com"
                  className={`w-full pl-8 pr-2.5 py-1.5 text-xs bg-white rounded-lg border transition-all outline-none ${
                    touched.email && fieldErrors.email
                      ? 'border-red-400 focus:ring-1 focus:ring-red-100'
                      : 'border-gray-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/5'
                  }`}
                />
              </div>
              {touched.email && fieldErrors.email && (
                <p className="text-[10px] text-red-600 font-medium mt-0.5">{fieldErrors.email}</p>
              )}
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                Số điện thoại <span className="font-normal text-gray-400">(tùy chọn)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (touched.phone) validateField('phone', e.target.value);
                  }}
                  onBlur={() => handleBlur('phone')}
                  placeholder="0912 345 678"
                  className={`w-full pl-8 pr-2.5 py-1.5 text-xs bg-white rounded-lg border transition-all outline-none ${
                    touched.phone && fieldErrors.phone
                      ? 'border-red-400 focus:ring-1 focus:ring-red-100'
                      : 'border-gray-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/5'
                  }`}
                />
              </div>
              {touched.phone && fieldErrors.phone && (
                <p className="text-[10px] text-red-600 font-medium mt-0.5">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) validateField('password', e.target.value);
                  }}
                  onBlur={() => handleBlur('password')}
                  placeholder="≥6 ký tự"
                  className={`w-full pl-8 pr-8 py-1.5 text-xs bg-white rounded-lg border transition-all outline-none ${
                    touched.password && fieldErrors.password
                      ? 'border-red-400 focus:ring-1 focus:ring-red-100'
                      : 'border-gray-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/5'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Password Strength Meter siêu mỏng */}
              {password && (
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                    <div
                      className={`h-full flex-1 rounded-full ${
                        passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'
                      }`}
                    />
                    <div
                      className={`h-full flex-1 rounded-full ${
                        passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'
                      }`}
                    />
                    <div
                      className={`h-full flex-1 rounded-full ${
                        passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'
                      }`}
                    />
                  </div>
                  <span className={`text-[9px] font-bold ${passwordStrength.text}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
              {touched.password && fieldErrors.password && (
                <p className="text-[10px] text-red-600 font-medium mt-0.5">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (touched.confirmPassword) validateField('confirmPassword', e.target.value);
                  }}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder="Nhập lại mật khẩu"
                  className={`w-full pl-8 pr-7 py-1.5 text-xs bg-white rounded-lg border transition-all outline-none ${
                    touched.confirmPassword && fieldErrors.confirmPassword
                      ? 'border-red-400 focus:ring-1 focus:ring-red-100'
                      : 'border-gray-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/5'
                  }`}
                />
                {confirmPassword && confirmPassword === password && (
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                )}
              </div>
              {touched.confirmPassword && fieldErrors.confirmPassword && (
                <p className="text-[10px] text-red-600 font-medium mt-0.5">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Địa chỉ (tùy chọn) - 2 cột gom chung */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                Địa chỉ nhận hàng <span className="font-normal text-gray-400">(tùy chọn)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, tên đường, tỉnh/thành"
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white rounded-lg border border-gray-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/5 outline-none transition-all"
                />
              </div>
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
                className="w-3.5 h-3.5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 cursor-pointer"
              />
              <span className="text-[11px] text-gray-600 leading-none">
                Tôi đồng ý với{' '}
                <span className="text-gray-950 font-bold hover:underline">Điều khoản dịch vụ</span> &{' '}
                <span className="text-gray-950 font-bold hover:underline">Chính sách bảo mật</span>.
              </span>
            </label>
          </div>
          {fieldErrors.terms && (
            <p className="text-[10px] text-red-600 font-medium">{fieldErrors.terms}</p>
          )}

          {/* Submit Button (Nút đen chuẩn mockup) */}
          <div className="pt-0.5">
            <Button
              type="submit"
              fullWidth
              isLoading={isButtonBusy}
              disabled={isButtonBusy}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="bg-[#111827] hover:bg-black text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer w-full border-0"
            >
              Tiếp tục: Nhận mã OTP kích hoạt
            </Button>
          </div>

          {/* Separator */}
          <div className="relative my-2.5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-center">
              <span className="bg-white px-2.5 text-[11px] text-gray-400 font-medium">
                Hoặc đăng ký bằng
              </span>
            </div>
          </div>

          {/* 3 Nút Đăng ký Mạng xã hội: Google | Facebook | Apple */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => alert('Đăng ký với Google đang phát triển!')}
              className="border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 rounded-xl py-1.5 px-2 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
              onClick={() => alert('Đăng ký với Facebook đang phát triển!')}
              className="border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 rounded-xl py-1.5 px-2 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#1877F2] fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="text-[11px] truncate">Facebook</span>
            </button>

            <button
              type="button"
              onClick={() => alert('Đăng ký với Apple đang phát triển!')}
              className="border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 rounded-xl py-1.5 px-2 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-current text-gray-900 shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.63 1.34-.56.64-1.05 1.69-.92 2.71 1 .08 2.02-.45 2.63-1.2" />
              </svg>
              <span className="text-[11px] truncate">Apple</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: FORM XÁC THỰC MÃ OTP */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 pt-1">
          {/* Thông tin email nhận mã */}
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs text-gray-900">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-700 shrink-0" />
              <div>
                <span className="text-[10px] text-gray-500 block">Mã gửi tới:</span>
                <span className="font-bold text-gray-900 text-xs">{email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setFormError(null);
                setSuccessMessage(null);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-900 hover:underline cursor-pointer bg-white px-2 py-1 rounded-md border border-gray-200"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Đổi thông tin</span>
            </button>
          </div>

          {/* 6 Ô NHẬP MÃ OTP THÔNG MINH */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">
              Nhập mã OTP gồm 6 chữ số
            </label>
            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  className={`w-9 h-12 sm:w-11 sm:h-14 text-center text-lg sm:text-xl font-black rounded-xl border-2 outline-none transition-all shadow-xs ${
                    digit
                      ? 'border-gray-900 bg-gray-50 text-gray-900 ring-2 ring-gray-900/10'
                      : 'border-gray-200 bg-white text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-center gap-1 text-[11px] text-amber-600 font-medium mt-2">
              <Clock className="w-3 h-3" />
              <span>Mã OTP có hiệu lực trong vòng 5 phút</span>
            </div>
          </div>

          {/* Action Buttons: Xác nhận & Gửi lại */}
          <div className="space-y-2 pt-1">
            <Button
              type="submit"
              fullWidth
              isLoading={isButtonBusy}
              disabled={isButtonBusy || !isOtpComplete}
              rightIcon={<ShieldCheck className="w-4 h-4" />}
              className="bg-[#111827] hover:bg-black text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer w-full border-0"
            >
              Xác thực & Kích hoạt tài khoản
            </Button>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep('form')}
                leftIcon={<ArrowLeft className="w-3 h-3" />}
                className="text-[11px] py-1 px-2.5 cursor-pointer"
              >
                Quay lại
              </Button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={countdown > 0 || isResending}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                  countdown > 0 || isResending
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {isResending
                    ? 'Đang gửi lại...'
                    : countdown > 0
                    ? `Gửi lại sau (${countdown}s)`
                    : 'Gửi lại mã OTP'}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 4. Footer Link sang Đăng nhập */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          Đã có tài khoản?{' '}
          <Link
            to={ROUTES.LOGIN}
            className="font-bold text-gray-950 hover:underline inline-block"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
