import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import LogoutConfirmModal from '../../components/common/LogoutConfirmModal';

// Regex chuẩn số điện thoại di động Việt Nam (10 số, đầu số 03, 05, 07, 08, 09 hoặc +84)
const VN_PHONE_REGEX = /^(0|\+84)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    fetchProfile,
    updateProfile,
    changePassword,
    logout,
    isLoading,
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Form State: Thông tin cá nhân
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || user?.phoneNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [profileErrors, setProfileErrors] = useState<{
    fullName?: string;
    phone?: string;
    address?: string;
    avatarUrl?: string;
  }>({});

  // Form State: Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Notification State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [avatarPreviewError, setAvatarPreviewError] = useState(false);

  // Kiểm tra đăng nhập
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Tải dữ liệu hồ sơ mới nhất từ backend khi vào trang
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile().catch(() => {
        // Nếu fetch thất bại thì dùng dữ liệu sẵn có trong store
      });
    }
  }, [isAuthenticated, fetchProfile]);

  // Đồng bộ state form khi user trong store cập nhật
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || user.phoneNumber || '');
      setAddress(user.address || '');
      setAvatarUrl(user.avatarUrl || '');
      setAvatarPreviewError(false);
    }
  }, [user]);

  // Validate form Thông tin cá nhân
  const validateProfileForm = (): boolean => {
    const errors: { fullName?: string; phone?: string; address?: string; avatarUrl?: string } = {};

    if (!fullName.trim()) {
      errors.fullName = 'Họ và tên không được để trống';
    } else if (fullName.trim().length > 100) {
      errors.fullName = 'Họ và tên không được vượt quá 100 ký tự';
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (cleanPhone) {
      if (!VN_PHONE_REGEX.test(cleanPhone)) {
        errors.phone = 'Số điện thoại không đúng định dạng Việt Nam (VD: 0912345678 hoặc +84912345678)';
      }
    }

    if (address.trim().length > 255) {
      errors.address = 'Địa chỉ giao hàng không được vượt quá 255 ký tự';
    }

    if (avatarUrl.trim().length > 500) {
      errors.avatarUrl = 'Đường dẫn ảnh đại diện không được vượt quá 500 ký tự';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Xử lý Cập nhật thông tin cá nhân
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!validateProfileForm()) {
      return;
    }

    try {
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      const updatedUser = await updateProfile({
        fullName: fullName.trim(),
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        address: address.trim(),
        avatarUrl: avatarUrl.trim(),
      });

      if (updatedUser?.avatarUrl) {
        setAvatarUrl(updatedUser.avatarUrl);
      }
      setProfileErrors({});
      setFeedback({
        type: 'success',
        message: 'Cập nhật thông tin cá nhân thành công! Dữ liệu đã được đồng bộ toàn hệ thống.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi cập nhật thông tin cá nhân';
      setFeedback({ type: 'error', message });
    }
  };

  // Validate form Đổi mật khẩu
  const validatePasswordForm = (): boolean => {
    const errors: { currentPassword?: string; newPassword?: string; confirmPassword?: string } = {};

    if (!currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Mật khẩu mới phải có tối thiểu 6 ký tự';
    } else if (currentPassword && newPassword === currentPassword) {
      errors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Xử lý Đổi mật khẩu (Nghiệm thu: Đổi mật khẩu thành công phải tự động đăng xuất và chuyển về trang đăng nhập)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!validatePasswordForm()) {
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      // Sau khi đổi mật khẩu thành công:
      // 1. Tự động đăng xuất theo cơ chế hệ thống (xóa token, user)
      logout();

      // 2. Chuyển người dùng về trang đăng nhập kèm thông báo yêu cầu đăng nhập lại
      navigate(ROUTES.LOGIN, {
        replace: true,
        state: {
          successMessage: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại bằng mật khẩu mới của bạn.',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi đổi mật khẩu tài khoản';
      setFeedback({ type: 'error', message });
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  if (!user) {
    return null;
  }

  const isAdmin = user.role === ROLES.ADMIN || (user.role as any) === 'ROLE_ADMIN';
  const defaultFallbackAvatar = isAdmin
    ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
    : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

  const isPinterestLink =
    avatarUrl.trim().includes('pinterest.com/pin/') || avatarUrl.trim().includes('pin.it/');

  // Ảnh hiển thị preview: ưu tiên avatarUrl nhập vào, rồi đến user.avatarUrl, cuối cùng là default
  const activeDisplayAvatar =
    (avatarUrl.trim() && !avatarPreviewError ? avatarUrl.trim() : null) ||
    user.avatarUrl ||
    (user as any).avatar ||
    defaultFallbackAvatar;

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
                  src={activeDisplayAvatar}
                  alt={user.fullName}
                  className="w-22 h-22 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
                  onError={() => {
                    setAvatarPreviewError(true);
                  }}
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
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                    @{user.username || user.email.split('@')[0]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {user.email}
                  </span>
                  {(user.phone || user.phoneNumber) && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {user.phone || user.phoneNumber}
                    </span>
                  )}
                </div>
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-900">Cập nhật hồ sơ cá nhân</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Quản lý thông tin liên lạc và địa chỉ giao hàng của bạn
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <Input
                  label="Họ và tên"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (profileErrors.fullName) {
                      setProfileErrors((prev) => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  error={profileErrors.fullName}
                  placeholder="Nhập họ và tên đầy đủ"
                  leftIcon={<UserIcon className="w-4 h-4" />}
                  required
                />

                {/* Username (Read-only) */}
                <Input
                  label="Tên đăng nhập (Username)"
                  type="text"
                  value={user.username || user.email.split('@')[0]}
                  leftIcon={<UserIcon className="w-4 h-4" />}
                  disabled
                  className="bg-gray-100 text-gray-500 cursor-not-allowed"
                />

                {/* Email (Read-only) */}
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
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (profileErrors.phone) {
                      setProfileErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  error={profileErrors.phone}
                  placeholder="VD: 0912345678"
                  leftIcon={<Phone className="w-4 h-4" />}
                />

                {/* Avatar URL */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Input
                    label="Ảnh đại diện (URL)"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarPreviewError(false);
                      if (profileErrors.avatarUrl) {
                        setProfileErrors((prev) => ({ ...prev, avatarUrl: undefined }));
                      }
                    }}
                    error={profileErrors.avatarUrl}
                    placeholder="https://example.com/avatar.jpg"
                    leftIcon={<Camera className="w-4 h-4" />}
                  />

                  {/* Pinterest Pin URL Detection Banner */}
                  {isPinterestLink && (
                    <div className="p-2.5 bg-blue-50/90 border border-blue-200/90 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 animate-fade-in">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold text-blue-800 block">
                          Đã phát hiện liên kết bài viết Pinterest
                        </span>
                        <p className="text-blue-700 text-[11px] mt-0.5 leading-relaxed">
                          Hệ thống sẽ <strong>tự động chuyển đổi</strong> liên kết bài viết này sang ảnh trực tiếp chất lượng cao (<code className="bg-blue-100 px-1 py-0.5 rounded text-blue-950 font-mono">i.pinimg.com/...jpg</code>) khi bạn bấm <strong>"Lưu thay đổi"</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {!isPinterestLink && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-0.5">
                      <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        Hỗ trợ link ảnh trực tiếp (.jpg, .png, i.pinimg.com, unsplash.com) hoặc link Pinterest pin.
                      </span>
                    </p>
                  )}
                </div>
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
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (profileErrors.address) {
                        setProfileErrors((prev) => ({ ...prev, address: undefined }));
                      }
                    }}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                    className={`w-full pl-10 pr-4 py-2.5 bg-white border ${
                      profileErrors.address
                        ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                        : 'border-gray-200 hover:border-gray-300 focus:border-blue-600 focus:ring-blue-500/15'
                    } rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 transition resize-none`}
                  />
                </div>
                {profileErrors.address && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{profileErrors.address}</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  * Thông tin hồ sơ mới sẽ được đồng bộ ngay lập tức lên Header và toàn bộ hệ thống
                </span>
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
              Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu của bạn với bất kỳ ai. Sau khi đổi mật khẩu thành công, hệ thống sẽ tự động đăng xuất để bạn đăng nhập lại.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              {/* Mật khẩu hiện tại */}
              <Input
                label="Mật khẩu hiện tại"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors((prev) => ({ ...prev, currentPassword: undefined }));
                  }
                }}
                error={passwordErrors.currentPassword}
                placeholder="Nhập mật khẩu hiện tại"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 focus:outline-none"
                    title={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              {/* Mật khẩu mới */}
              <Input
                label="Mật khẩu mới"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordErrors.newPassword) {
                    setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }
                }}
                error={passwordErrors.newPassword}
                placeholder="Tối thiểu 6 ký tự"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 focus:outline-none"
                    title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              {/* Xác nhận mật khẩu mới */}
              <Input
                label="Xác nhận mật khẩu mới"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                error={passwordErrors.confirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 focus:outline-none"
                    title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Lưu ý bảo mật:</strong> Sau khi đổi mật khẩu thành công, tài khoản sẽ được tự động đăng xuất và bạn cần đăng nhập lại với mật khẩu mới.
                </span>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="dark"
                  size="md"
                  isLoading={isLoading}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                  className="w-full"
                >
                  Xác nhận đổi mật khẩu
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Modal xác nhận đăng xuất */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          logout();
          navigate(ROUTES.HOME, { replace: true });
        }}
      />
    </div>
  );
};

export default ProfilePage;
