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
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../constants/routes';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Xóa sạch lỗi cũ khi vào trang đăng ký
  React.useEffect(() => {
    clearError();
    setFormError(null);
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Chống bấm đúp nhiều lần khi đang xử lý
    if (isLoading || isSubmitting || toastMessage) return;

    setFormError(null);
    setSuccessMessage(null);
    clearError();

    // Validate client: các trường bắt buộc
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

    // Validate email hợp lệ
    if (!email.trim()) {
      setFormError('Vui lòng nhập địa chỉ email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Địa chỉ email không đúng định dạng');
      return;
    }

    // Validate số điện thoại bắt buộc & định dạng hợp lệ
    const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
    if (!cleanPhone) {
      setFormError('Vui lòng nhập số điện thoại');
      return;
    }
    if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
      setFormError('Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09)');
      return;
    }

    // Validate địa chỉ bắt buộc
    if (!address.trim()) {
      setFormError('Vui lòng nhập địa chỉ nhận hàng của bạn');
      return;
    }

    // Validate mật khẩu ≥ 6 ký tự
    if (!password) {
      setFormError('Vui lòng nhập mật khẩu');
      return;
    }
    if (password.length < 6) {
      setFormError('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }

    // Validate 2 mật khẩu khớp
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
      // Gọi POST /api/auth/register qua authStore & authService
      await register({
        username: username.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        address: address.trim(),
        password,
        confirmPassword,
      });

      // Thành công: hiện Toast + chuyển sang /login
      setToastMessage('Đăng ký tài khoản thành công!');
      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển hướng sang đăng nhập...');

      setTimeout(() => {
        navigate(ROUTES.LOGIN, {
          state: { successMessage: 'Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.' },
          replace: true,
        });
      }, 1500);
    } catch (err) {
      // Hiển thị lỗi từ server (trùng email/username, lỗi xác thực...)
      setFormError(err instanceof Error ? err.message : 'Đăng ký không thành công. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonBusy = isLoading || isSubmitting || !!toastMessage;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8 font-sans relative">
      {/* Toast Notification khi thành công */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900/95 backdrop-blur-md text-white text-sm px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500/40 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-300">{toastMessage}</p>
            <p className="text-xs text-gray-300">Đang tự động chuyển sang trang đăng nhập...</p>
          </div>
        </div>
      )}

      {/* Header Form */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center">
          <img
            src="/images/nexor_logo.png"
            alt="NEXOR Logo"
            className="w-14 h-14 object-contain drop-shadow-md"
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tạo Tài Khoản Mới</h1>
        <p className="text-xs text-gray-500 mt-1.5">
          Gia nhập cộng đồng mua sắm công nghệ flagship NEXOR
        </p>
      </div>

      {/* Inline Success Alert */}
      {successMessage && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Thành công!</span>
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Inline Error Alert (Lỗi Client hoặc Server như trùng email/username) */}
      {(formError || error) && !successMessage && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Không thể đăng ký</span>
            <span>{formError || error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Họ tên */}
        <Input
          label="Họ và tên"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="VD: Nguyễn Văn A"
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        {/* Username */}
        <Input
          label="Tên đăng nhập"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="VD: nguyenvana (ít nhất 3 ký tự)"
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        {/* Email */}
        <Input
          label="Địa chỉ Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          leftIcon={<Mail className="w-4 h-4" />}
          required
        />

        {/* SĐT */}
        <Input
          label="Số điện thoại"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="VD: 0912345678"
          leftIcon={<Phone className="w-4 h-4" />}
          required
        />

        {/* Địa chỉ */}
        <Input
          label="Địa chỉ"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="VD: Số 123 Đường Cầu Giấy, Hà Nội"
          leftIcon={<MapPin className="w-4 h-4" />}
          required
        />

        {/* Mật khẩu */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Mật khẩu
          </label>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
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

        {/* Xác nhận mật khẩu */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Xác nhận mật khẩu
          </label>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu để xác nhận"
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />
        </div>

        {/* Điều khoản Checkbox */}
        <div className="flex items-start pt-1">
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              id="terms"
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              Tôi đồng ý với{' '}
              <span className="text-blue-600 font-semibold hover:underline">Điều khoản dịch vụ</span>{' '}
              và <span className="text-blue-600 font-semibold hover:underline">Chính sách bảo mật</span> của NEXOR.
            </span>
          </label>
        </div>

        {/* Submit Button với trạng thái loading & chống bấm đúp */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="dark"
            size="md"
            fullWidth
            isLoading={isButtonBusy}
            disabled={isButtonBusy}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Đăng ký tài khoản
          </Button>
        </div>
      </form>

      {/* Chuyển sang Đăng nhập */}
      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
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
