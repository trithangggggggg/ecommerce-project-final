import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save,
  Store,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Lock,
  Camera,
} from 'lucide-react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import { useAuthStore } from '../../store/useAuthStore';

export const AdminSettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as 'profile' | 'security' | 'system') || 'profile';

  const { user, updateProfile, changePassword } = useAuthStore();

  // Tab switcher
  const handleTabChange = (tab: 'profile' | 'security' | 'system') => {
    setSearchParams({ tab });
  };

  // State: Cài đặt hệ thống (Store configuration)
  const [storeName, setStoreName] = useState(() => localStorage.getItem('nexor_store_name') || 'NEXOR Official Store');
  const [hotline, setHotline] = useState(() => localStorage.getItem('nexor_store_hotline') || '1900 6868');
  const [systemEmail, setSystemEmail] = useState(() => localStorage.getItem('nexor_store_email') || 'support@nexor.vn');
  const [storeAddress, setStoreAddress] = useState(
    () => localStorage.getItem('nexor_store_address') || 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội'
  );
  const [systemSaved, setSystemSaved] = useState(false);

  // State: Hồ sơ cá nhân (Personal Profile)
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || user?.phoneNumber || '');
  const [personalAddress, setPersonalAddress] = useState(user?.address || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State: Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || user.phoneNumber || '');
      setPersonalAddress(user.address || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  // Handler: Lưu cấu hình hệ thống
  const handleSaveSystemSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('nexor_store_name', storeName);
    localStorage.setItem('nexor_store_hotline', hotline);
    localStorage.setItem('nexor_store_email', systemEmail);
    localStorage.setItem('nexor_store_address', storeAddress);
    setSystemSaved(true);
    setTimeout(() => setSystemSaved(false), 3000);
  };

  // Handler: Cập nhật thông tin cá nhân
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    if (!fullName.trim()) {
      setProfileFeedback({ type: 'error', message: 'Họ và tên không được để trống' });
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const updatedUser = await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        phoneNumber: phone.trim(),
        address: personalAddress.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      if (updatedUser?.avatarUrl) {
        setAvatarUrl(updatedUser.avatarUrl);
      }
      setProfileFeedback({ type: 'success', message: 'Cập nhật thông tin cá nhân thành công!' });
      setTimeout(() => setProfileFeedback(null), 4000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi cập nhật thông tin cá nhân';
      setProfileFeedback({ type: 'error', message });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handler: Đổi mật khẩu
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Vui lòng nhập mật khẩu hiện tại' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ type: 'success', message: 'Đổi mật khẩu tài khoản thành công!' });
      setTimeout(() => setPasswordFeedback(null), 4000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi đổi mật khẩu';
      setPasswordFeedback({ type: 'error', message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const defaultAvatar =
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150';

  return (
    <div className="space-y-4 font-sans select-none pb-8">
      {/* Page Header */}
      <div className="shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Cài đặt</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Quản lý thông tin tài khoản cá nhân, bảo mật đăng nhập và cấu hình vận hành hệ thống
        </p>
      </div>

      {/* Main Settings Grid: Sidebar Navigation on the Left + Centered Content on the Right */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Settings Inner Sidebar (3 Tabs riêng biệt) */}
        <aside className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs space-y-1.5">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Danh mục cài đặt
          </div>

          {/* Tab 1: Hồ sơ cá nhân */}
          <button
            type="button"
            onClick={() => handleTabChange('profile')}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
              currentTab === 'profile'
                ? 'bg-blue-50/80 border border-blue-200/80 text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                currentTab === 'profile' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-bold block leading-snug">Hồ sơ cá nhân</span>
              <span
                className={`text-[11px] block truncate mt-0.5 ${
                  currentTab === 'profile' ? 'text-blue-600/80 font-medium' : 'text-slate-400'
                }`}
              >
                Thông tin & liên hệ
              </span>
            </div>
          </button>

          {/* Tab 2: Bảo mật & Đổi mật khẩu */}
          <button
            type="button"
            onClick={() => handleTabChange('security')}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
              currentTab === 'security'
                ? 'bg-blue-50/80 border border-blue-200/80 text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                currentTab === 'security' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-bold block leading-snug">Bảo mật & Đổi mật khẩu</span>
              <span
                className={`text-[11px] block truncate mt-0.5 ${
                  currentTab === 'security' ? 'text-blue-600/80 font-medium' : 'text-slate-400'
                }`}
              >
                Đổi mật khẩu tài khoản
              </span>
            </div>
          </button>

          {/* Tab 3: Cài đặt hệ thống */}
          <button
            type="button"
            onClick={() => handleTabChange('system')}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
              currentTab === 'system'
                ? 'bg-blue-50/80 border border-blue-200/80 text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                currentTab === 'system' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-bold block leading-snug">Cài đặt hệ thống</span>
              <span
                className={`text-[11px] block truncate mt-0.5 ${
                  currentTab === 'system' ? 'text-blue-600/80 font-medium' : 'text-slate-400'
                }`}
              >
                Thương hiệu & liên hệ
              </span>
            </div>
          </button>

          {/* Admin Info Card in Sidebar */}
          <div className="pt-2 border-t border-slate-100 mt-2">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0 text-[11px]">
                <span className="font-bold text-slate-800 block truncate">Vai trò Quản trị viên</span>
                <span className="text-slate-400 block truncate">Toàn quyền hệ thống</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content Area (Căn giữa cân đối và thanh lịch) */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* TAB 1: HỒ SƠ CÁ NHÂN (GIỮ NGUYÊN BỐ CỤC BAN ĐẦU) */}
          {currentTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <h2 className="text-base font-bold text-slate-900">Thông tin hồ sơ Quản trị</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật họ tên, ảnh đại diện và thông tin liên hệ của tài khoản quản trị
                </p>
              </div>

              {profileFeedback && (
                <div
                  className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    profileFeedback.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  {profileFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{profileFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="relative group shrink-0">
                    <img
                      src={avatarUrl || defaultAvatar}
                      alt={fullName || 'Avatar'}
                      className="w-20 h-20 rounded-full object-cover ring-2 ring-white shadow-sm border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultAvatar;
                      }}
                    />
                    <span className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full shadow-sm">
                      <Camera className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="flex-1 w-full space-y-1.5 text-center sm:text-left">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Đường dẫn ảnh đại diện (Avatar URL)
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition"
                    />
                    <p className="text-[11px] text-slate-400">
                      Nhập link ảnh (JPG, PNG) để hiển thị trên avatar góc trên trang quản trị.
                    </p>
                  </div>
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Họ và tên"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    leftIcon={<UserIcon className="w-4 h-4" />}
                    required
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Địa chỉ Email (Định danh)
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed select-none"
                      />
                      <div
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400"
                        title="Email định danh không thể thay đổi"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Email đăng nhập chính của tài khoản</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Số điện thoại"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={<Phone className="w-4 h-4" />}
                    placeholder="0987 654 321"
                  />

                  <Input
                    label="Địa chỉ làm việc / liên hệ"
                    value={personalAddress}
                    onChange={(e) => setPersonalAddress(e.target.value)}
                    leftIcon={<MapPin className="w-4 h-4" />}
                    placeholder="Hà Nội, Việt Nam"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="dark"
                    size="md"
                    isLoading={isUpdatingProfile}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Lưu thông tin cá nhân
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: BẢO MẬT & ĐỔI MẬT KHẨU (KHUNG TO ĐỒNG BỘ NHƯ 2 PHẦN TRƯỚC) */}
          {currentTab === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
              {/* Header Căn giữa, dòng mô tả ngắn gọn */}
              <div className="border-b border-slate-100 pb-4 mb-5 text-center flex flex-col items-center justify-center">
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 mb-2 shadow-2xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Bảo mật & Đổi mật khẩu</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Cập nhật mật khẩu để nâng cao tính an toàn và bảo vệ dữ liệu
                </p>
              </div>

              {passwordFeedback && (
                <div
                  className={`mb-4 p-2.5 rounded-xl border text-xs flex items-center justify-center gap-2 max-w-xl mx-auto ${
                    passwordFeedback.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  {passwordFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl mx-auto">
                <Input
                  label="Mật khẩu hiện tại"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại của bạn"
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Mật khẩu mới"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    leftIcon={<KeyRound className="w-4 h-4" />}
                    required
                  />

                  <Input
                    label="Xác nhận mật khẩu mới"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    leftIcon={<KeyRound className="w-4 h-4" />}
                    required
                  />
                </div>

                <p className="text-[11px] text-slate-400 text-center pt-0.5">
                  Tối thiểu 6 ký tự, nên kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.
                </p>

                {/* Nút cập nhật căn giữa gọn gàng */}
                <div className="pt-2 flex justify-center">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto px-8 shadow-xs"
                    isLoading={isChangingPassword}
                    leftIcon={<KeyRound className="w-4 h-4" />}
                  >
                    Cập nhật mật khẩu
                  </Button>
                </div>
              </form>

              {/* Footer bảo mật tinh tế */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Phiên làm việc được bảo vệ bởi chuẩn mã hóa JWT</span>
              </div>
            </div>
          )}

          {/* TAB 3: CÀI ĐẶT HỆ THỐNG (CĂN GIỮA) */}
          {currentTab === 'system' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
              {/* Header Căn giữa */}
              <div className="border-b border-slate-100 pb-5 mb-6 text-center flex flex-col items-center justify-center">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 mb-2.5 shadow-2xs">
                  <Store className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Cài đặt hệ thống</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Thiết lập thông tin thương hiệu, liên hệ và chính sách cửa hàng
                </p>
              </div>

              {systemSaved && (
                <div className="mb-5 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-center gap-2 max-w-xl mx-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cấu hình hệ thống đã được lưu thành công!</span>
                </div>
              )}

              <form onSubmit={handleSaveSystemSettings} className="space-y-5 max-w-xl mx-auto">
                <Input
                  label="Tên cửa hàng / Thương hiệu"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  leftIcon={<Store className="w-4 h-4" />}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Hotline hỗ trợ"
                    value={hotline}
                    onChange={(e) => setHotline(e.target.value)}
                    required
                  />
                  <Input
                    label="Email tiếp nhận thông tin"
                    type="email"
                    value={systemEmail}
                    onChange={(e) => setSystemEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Địa chỉ trụ sở chính
                  </label>
                  <textarea
                    rows={2}
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition resize-none"
                  />
                </div>

                {/* Nút lưu căn giữa */}
                <div className="pt-3 flex justify-center">
                  <Button
                    type="submit"
                    variant="dark"
                    size="lg"
                    className="px-8 shadow-sm"
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Lưu thiết lập
                  </Button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
