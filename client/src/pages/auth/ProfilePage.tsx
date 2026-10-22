import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateProfile, changePassword, logout, isLoading } =
    useAuthStore();

  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  // Form State: Thông tin cá nhân
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || user?.phoneNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // Form State: Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || user.phoneNumber || '');
      setAddress(user.address || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!fullName.trim()) {
      setFeedback({ type: 'error', message: 'Họ và tên không được để trống' });
      return;
    }

    try {
      await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        phoneNumber: phone.trim(),
        address: address.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      setFeedback({ type: 'success', message: 'Cập nhật thông tin cá nhân thành công!' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi cập nhật thông tin';
      setFeedback({ type: 'error', message });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentPassword) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập mật khẩu hiện tại' });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', message: 'Đổi mật khẩu thành công!' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi đổi mật khẩu';
      setFeedback({ type: 'error', message });
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống NEXOR?')) {
      logout();
      navigate(ROUTES.LOGIN);
    }
  };

  if (!user) {
    return null;
  }

  const isAdmin = user.role === ROLES.ADMIN;

  return (
    <div className="min-h-screen bg-[#f5f6fa] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Card Header */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
          {/* Top banner: Dark Charcoal matching Header */}
          <div className="h-28 bg-[#181a20] relative border-b border-gray-800" />

          <div className="px-6 pb-6 relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-12">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="relative group">
                <img
                  src={
                    user.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                  }
                  alt={user.fullName}
                  className="w-22 h-22 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
                />
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className="absolute bottom-1 right-1 p-1.5 bg-[#181a20] text-white rounded-lg shadow-sm hover:bg-black transition cursor-pointer"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-xl font-bold text-gray-900">{user.fullName}</h1>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <ShieldCheck className="w-3 h-3 text-amber-600" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Khách hàng
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-center sm:justify-start gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {isAdmin && (
                <Button
                  type="button"
                  variant="dark"
                  size="sm"
                  onClick={() => navigate(ROUTES.ADMIN)}
                  leftIcon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
                >
                  Trang Quản Trị
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="w-3.5 h-3.5 text-red-500" />}
                className="hover:border-red-300 hover:text-red-600"
              >
                Đăng xuất
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-t border-gray-100 px-6 flex gap-6 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('info');
                setFeedback(null);
              }}
              className={`py-3 font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Thông tin cá nhân
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setFeedback(null);
              }}
              className={`py-3 font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'password'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Đổi mật khẩu
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-bold block mb-0.5">
                {feedback.type === 'success' ? 'Thành công!' : 'Thông báo lỗi'}
              </span>
              <span>{feedback.message}</span>
            </div>
          </div>
        )}

        {/* Tab 1: Profile Information */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 sm:p-8">
            <h2 className="text-base font-bold text-gray-900 mb-1">Cập nhật hồ sơ cá nhân</h2>
            <p className="text-xs text-gray-500 mb-6">
              Quản lý thông tin liên lạc và địa chỉ giao hàng của bạn
            </p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <Input
                  label="Họ và tên"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  leftIcon={<UserIcon className="w-4 h-4" />}
                  required
                />

                {/* Email (Read only) */}
                <Input
                  label="Email tài khoản (không thể đổi)"
                  type="email"
                  value={user.email}
                  leftIcon={<Mail className="w-4 h-4" />}
                  disabled
                  className="bg-gray-100 text-gray-500 cursor-not-allowed"
                />

                {/* Phone */}
                <Input
                  label="Số điện thoại"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  leftIcon={<Phone className="w-4 h-4" />}
                />

                {/* Avatar URL */}
                <Input
                  label="Ảnh đại diện (URL)"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  leftIcon={<Camera className="w-4 h-4" />}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Địa chỉ giao hàng mặc định
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 pt-3 pointer-events-none text-gray-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="dark"
                  size="md"
                  isLoading={isLoading}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 sm:p-8">
            <h2 className="text-base font-bold text-gray-900 mb-1">Đổi mật khẩu tài khoản</h2>
            <p className="text-xs text-gray-500 mb-6">
              Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu của bạn với bất kỳ ai
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <Input
                label="Mật khẩu hiện tại"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                label="Mật khẩu mới"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                label="Xác nhận mật khẩu mới"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="dark"
                  size="md"
                  isLoading={isLoading}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                >
                  Cập nhật mật khẩu
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
