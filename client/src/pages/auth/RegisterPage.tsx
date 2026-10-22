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
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
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
    const cleanUsername = username.trim() || email.split('@')[0];
    if (cleanUsername.length < 3) {
      setFormError('Tên đăng nhập phải có tối thiểu 3 ký tự');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
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
        username: cleanUsername,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
        password,
        confirmPassword,
      });

      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển hướng sang đăng nhập...');
      setTimeout(() => navigate(ROUTES.LOGIN), 1500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Đăng ký không thành công');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8 font-sans">
      {/* Title */}
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

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Thành công!</span>
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Alert */}
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
        {/* Full Name */}
        <Input
          label="Họ và tên"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nguyễn Văn A"
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

        {/* Phone */}
        <Input
          label="Số điện thoại"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0912 345 678 (tùy chọn)"
          leftIcon={<Phone className="w-4 h-4" />}
        />

        {/* Password */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Mật khẩu
          </label>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ít nhất 6 ký tự"
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

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Xác nhận mật khẩu
          </label>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />
        </div>

        {/* Terms Checkbox */}
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

        {/* Submit CTA Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="dark"
            size="md"
            fullWidth
            isLoading={isLoading || !!successMessage}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Đăng ký tài khoản
          </Button>
        </div>
      </form>

      {/* Switch to Login */}
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
