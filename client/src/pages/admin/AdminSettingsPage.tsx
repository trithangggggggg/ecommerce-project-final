import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';
import { useAuthStore } from '../../store/useAuthStore';
import { useSiteConfigStore } from '../../store/useSiteConfigStore';
import { settingService, type SystemSettingItem } from '../../api/services/setting.service';

const RAW_ITEMS_PER_PAGE = 10;

const SETTING_GROUPS = ['ALL', 'STORE_CONTACT', 'SHIPPING', 'PAYMENT', 'SOCIAL', 'GENERAL', 'AI'];

export const AdminSettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab =
    (searchParams.get('tab') as 'profile' | 'security' | 'system' | 'raw') || 'profile';

  const { user, updateProfile, changePassword } = useAuthStore();
  const refreshSiteConfig = useSiteConfigStore((s) => s.fetchSiteConfig);

  const handleTabChange = (tab: 'profile' | 'security' | 'system' | 'raw') => {
    setSearchParams({ tab });
  };

  // DB-backed System Settings map
  const [sysValues, setSysValues] = useState<Record<string, string>>({
    'store.name': 'NEXOR Technology Store',
    'store.shortName': 'NEXOR',
    'store.tagline': 'Hệ sinh thái Công nghệ & Trải nghiệm AI',
    'store.hotline': '1800 6688',
    'store.hotlineLabel': '1800 6688 (Miễn phí)',
    'store.email': 'support@nexor.vn',
    'store.address': 'Tầng 12, Tòa nhà Nexor Tower, Quận 1, TP. Hồ Chí Minh',
    'store.openHours': '08:00 - 22:00 (Thứ 2 - Chủ Nhật)',
    'store.copyright': '© 2026 NEXOR Technology. Bảo lưu mọi quyền.',
    'shipping.freeshipThreshold': '20000000',
    'shipping.halfShipThreshold': '10000000',
    'shipping.defaultFee': '30000',
    'shipping.estimatedLeadTime': '2 - 3 ngày làm việc',
    'payment.codEnabled': 'true',
    'payment.sepayEnabled': 'true',
    'social.facebookUrl': '',
    'social.youtubeUrl': '',
    'social.zaloUrl': '',
    'general.wheelEnabled': 'true',
    'general.promoTickerText': '',
    'general.flashSaleBannerTitle': 'GIỜ VÀNG GIÁ SỐC - SĂN DEAL CHÍNH HÃNG',
  });
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemSaving, setSystemSaving] = useState(false);
  const [systemFeedback, setSystemFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Raw Settings Table (Tab 4: 6 ops)
  const [rawSettings, setRawSettings] = useState<SystemSettingItem[]>([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawSearch, setRawSearch] = useState('');
  const [rawGroup, setRawGroup] = useState('ALL');
  const [rawPage, setRawPage] = useState(1);
  const [rawTotalPages, setRawTotalPages] = useState(1);
  const [rawTotalElements, setRawTotalElements] = useState(0);
  const [rawDetail, setRawDetail] = useState<SystemSettingItem | null>(null);
  const [rawDeleteTarget, setRawDeleteTarget] = useState<SystemSettingItem | null>(null);
  const [rawModalOpen, setRawModalOpen] = useState(false);
  const [rawEditing, setRawEditing] = useState<SystemSettingItem | null>(null);
  const [rawForm, setRawForm] = useState({
    settingKey: '',
    settingValue: '',
    settingGroup: 'GENERAL',
    label: '',
    description: '',
    valueType: 'STRING',
    isPublic: true,
  });
  const [rawFormError, setRawFormError] = useState('');

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

  const fetchAllSystemSettings = useCallback(async () => {
    setSystemLoading(true);
    try {
      const items = await settingService.getAllAdminSettings();
      if (items.length > 0) {
        setSysValues((prev) => {
          const next = { ...prev };
          items.forEach((it) => {
            if (it.settingKey) {
              next[it.settingKey] = it.settingValue ?? '';
            }
          });
          return next;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải cấu hình từ hệ thống';
      setSystemFeedback({ type: 'error', message: msg });
    } finally {
      setSystemLoading(false);
    }
  }, []);

  const fetchRawSettings = useCallback(async () => {
    setRawLoading(true);
    try {
      const res = await settingService.searchAdminSettings({
        keyword: rawSearch.trim() || undefined,
        group: rawGroup !== 'ALL' ? rawGroup : undefined,
        page: rawPage - 1,
        size: RAW_ITEMS_PER_PAGE,
      });
      setRawSettings(res?.content || []);
      setRawTotalPages(res?.totalPages || 1);
      setRawTotalElements(res?.totalElements || 0);
    } catch {
      setRawSettings([]);
    } finally {
      setRawLoading(false);
    }
  }, [rawSearch, rawGroup, rawPage]);

  useEffect(() => {
    if (currentTab === 'system') {
      void fetchAllSystemSettings();
    } else if (currentTab === 'raw') {
      void fetchRawSettings();
    }
  }, [currentTab, fetchAllSystemSettings, fetchRawSettings]);

  const setSysField = (key: string, val: string) => {
    setSysValues((prev) => ({ ...prev, [key]: val }));
  };

  // Handler: Lưu cấu hình hệ thống vào MySQL DB
  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSystemSaving(true);
    setSystemFeedback(null);
    try {
      await settingService.bulkSaveSettings(sysValues);
      await refreshSiteConfig(true);
      setSystemFeedback({ type: 'success', message: 'Đã lưu toàn bộ cấu hình vào MySQL và đồng bộ Storefront!' });
      setTimeout(() => setSystemFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu cấu hình thất bại';
      setSystemFeedback({ type: 'error', message: msg });
    } finally {
      setSystemSaving(false);
    }
  };

  const handleOpenRawAdd = () => {
    setRawEditing(null);
    setRawForm({
      settingKey: '',
      settingValue: '',
      settingGroup: 'GENERAL',
      label: '',
      description: '',
      valueType: 'STRING',
      isPublic: true,
    });
    setRawFormError('');
    setRawModalOpen(true);
  };

  const handleOpenRawEdit = (item: SystemSettingItem) => {
    setRawEditing(item);
    setRawForm({
      settingKey: item.settingKey,
      settingValue: item.settingValue ?? '',
      settingGroup: item.settingGroup || 'GENERAL',
      label: item.label || '',
      description: item.description || '',
      valueType: item.valueType || 'STRING',
      isPublic: item.isPublic !== false,
    });
    setRawFormError('');
    setRawModalOpen(true);
  };

  const handleSaveRaw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawForm.settingKey.trim()) {
      setRawFormError('settingKey không được để trống');
      return;
    }
    setRawFormError('');
    try {
      if (rawEditing) {
        await settingService.updateSetting(rawEditing.id, rawForm);
      } else {
        await settingService.createSetting(rawForm);
      }
      setRawModalOpen(false);
      await fetchRawSettings();
      await refreshSiteConfig(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu khóa cấu hình thất bại';
      setRawFormError(msg);
    }
  };

  const handleDeleteRaw = async () => {
    if (!rawDeleteTarget) return;
    try {
      await settingService.deleteSetting(rawDeleteTarget.id);
      setRawDeleteTarget(null);
      await fetchRawSettings();
      await refreshSiteConfig(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa khóa cấu hình thất bại';
      setSystemFeedback({ type: 'error', message: msg });
      setRawDeleteTarget(null);
    }
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
    <div className="h-full flex flex-col min-h-0 space-y-3 font-sans overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Cài đặt</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thông tin tài khoản cá nhân, bảo mật đăng nhập và cấu hình vận hành hệ thống
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Quản trị viên • Toàn quyền hệ thống
          </span>
        </div>
      </div>

      {/* Horizontal Tab Navigation Pills */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-2xs w-fit shrink-0">
        <button
          type="button"
          onClick={() => handleTabChange('profile')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            currentTab === 'profile'
              ? 'bg-blue-600 text-white shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Hồ sơ cá nhân
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('security')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            currentTab === 'security'
              ? 'bg-blue-600 text-white shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Bảo mật & Đổi mật khẩu
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('system')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            currentTab === 'system'
              ? 'bg-blue-600 text-white shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Cấu hình Storefront & Vận hành
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('raw')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            currentTab === 'raw'
              ? 'bg-blue-600 text-white shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Bảng Khóa Cấu hình (DB)
        </button>
      </div>

      {/* Main Settings Content Area */}
      <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* TAB 1: HỒ SƠ CÁ NHÂN */}
        {currentTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs flex-1 min-h-0 overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 mb-5">
              <h2 className="text-base font-bold text-slate-900">Thông tin hồ sơ Quản trị</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cập nhật họ tên, ảnh đại diện và thông tin liên hệ của tài khoản quản trị
              </p>
            </div>

            {profileFeedback && (
              <div
                className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  profileFeedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    profileFeedback.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                />
                <span>{profileFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="shrink-0">
                  <img
                    src={avatarUrl || defaultAvatar}
                    alt={fullName || 'Avatar'}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-white shadow-sm border border-slate-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultAvatar;
                    }}
                  />
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
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Nhập link ảnh (JPG, PNG) để hiển thị trên avatar góc trên trang quản trị.
                  </p>
                </div>
              </div>

              {/* Form Inputs - Crisp 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Họ và tên"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Địa chỉ Email (Định danh)
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    title="Email định danh không thể thay đổi"
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Email đăng nhập chính của tài khoản</span>
                </div>

                <Input
                  label="Số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0987 654 321"
                />

                <Input
                  label="Địa chỉ làm việc / liên hệ"
                  value={personalAddress}
                  onChange={(e) => setPersonalAddress(e.target.value)}
                  placeholder="Hà Nội, Việt Nam"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="dark"
                  size="md"
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? 'Đang lưu...' : 'Lưu thông tin cá nhân'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: BẢO MẬT & ĐỔI MẬT KHẨU */}
        {currentTab === 'security' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs flex-1 min-h-0 overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 mb-5">
              <h2 className="text-base font-bold text-slate-900">Bảo mật & Đổi mật khẩu</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cập nhật mật khẩu để nâng cao tính an toàn và bảo vệ dữ liệu
              </p>
            </div>

            {passwordFeedback && (
              <div
                className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  passwordFeedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    passwordFeedback.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                />
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Mật khẩu hiện tại"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại của bạn"
                    required
                  />
                </div>

                <Input
                  label="Mật khẩu mới"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />

                <Input
                  label="Xác nhận mật khẩu mới"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-slate-400">
                  Tối thiểu 6 ký tự, nên kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.
                </p>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto px-6 shadow-xs"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
                </Button>
              </div>
            </form>

            <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              Phiên làm việc được bảo vệ bởi chuẩn mã hóa JWT
            </div>
          </div>
        )}

        {/* TAB 3: CẤU HÌNH STOREFRONT & VẬN HÀNH (MYSQL) */}
        {currentTab === 'system' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5 flex-1 min-h-0 overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Cấu hình Vận hành & Storefront</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mọi thay đổi được lưu trực tiếp trong bảng system_settings của MySQL và áp dụng ngay cho Client & Backend
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchAllSystemSettings()}
                disabled={systemLoading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {systemLoading ? 'Đang tải...' : 'Đồng bộ lại DB'}
              </button>
            </div>

            {systemFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  systemFeedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {systemFeedback.message}
              </div>
            )}

            <form onSubmit={handleSaveSystemSettings} className="space-y-6">
              {/* Nhóm 1: Thông tin cửa hàng */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                  1. Thông tin Cửa hàng & Liên hệ (Header / Footer / Auth)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    label="Tên thương hiệu đầy đủ"
                    value={sysValues['store.name'] || ''}
                    onChange={(e) => setSysField('store.name', e.target.value)}
                    required
                  />
                  <Input
                    label="Tên viết tắt (Logo text)"
                    value={sysValues['store.shortName'] || ''}
                    onChange={(e) => setSysField('store.shortName', e.target.value)}
                  />
                  <Input
                    label="Khẩu hiệu (Tagline)"
                    value={sysValues['store.tagline'] || ''}
                    onChange={(e) => setSysField('store.tagline', e.target.value)}
                  />
                  <Input
                    label="Số Hotline chính"
                    value={sysValues['store.hotline'] || ''}
                    onChange={(e) => setSysField('store.hotline', e.target.value)}
                    required
                  />
                  <Input
                    label="Nhãn Hotline hiển thị"
                    value={sysValues['store.hotlineLabel'] || ''}
                    onChange={(e) => setSysField('store.hotlineLabel', e.target.value)}
                  />
                  <Input
                    label="Email hỗ trợ"
                    type="email"
                    value={sysValues['store.email'] || ''}
                    onChange={(e) => setSysField('store.email', e.target.value)}
                    required
                  />
                  <Input
                    label="Giờ mở cửa"
                    value={sysValues['store.openHours'] || ''}
                    onChange={(e) => setSysField('store.openHours', e.target.value)}
                  />
                  <Input
                    label="Bản quyền (Footer Copyright)"
                    value={sysValues['store.copyright'] || ''}
                    onChange={(e) => setSysField('store.copyright', e.target.value)}
                  />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Địa chỉ trụ sở chính
                    </label>
                    <textarea
                      rows={2}
                      value={sysValues['store.address'] || ''}
                      onChange={(e) => setSysField('store.address', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Vận chuyển & Freeship */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                  2. Chính sách Vận chuyển & Ngưỡng Freeship (Backend & Giỏ hàng / Thanh toán)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    label="Ngưỡng Freeship 100% (VNĐ)"
                    type="number"
                    value={sysValues['shipping.freeshipThreshold'] || '20000000'}
                    onChange={(e) => setSysField('shipping.freeshipThreshold', e.target.value)}
                  />
                  <Input
                    label="Ngưỡng giảm 50% ship (VNĐ)"
                    type="number"
                    value={sysValues['shipping.halfShipThreshold'] || '10000000'}
                    onChange={(e) => setSysField('shipping.halfShipThreshold', e.target.value)}
                  />
                  <Input
                    label="Phí vận chuyển mặc định (VNĐ)"
                    type="number"
                    value={sysValues['shipping.defaultFee'] || '30000'}
                    onChange={(e) => setSysField('shipping.defaultFee', e.target.value)}
                  />
                  <Input
                    label="Thời gian giao dự kiến"
                    value={sysValues['shipping.estimatedLeadTime'] || ''}
                    onChange={(e) => setSysField('shipping.estimatedLeadTime', e.target.value)}
                  />
                </div>
              </div>

              {/* Nhóm 3: Thanh toán & Khuyến mãi chung */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                  3. Cổng Thanh toán & Chiến dịch trên Storefront
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sysValues['payment.codEnabled'] === 'true'}
                      onChange={(e) => setSysField('payment.codEnabled', String(e.target.checked))}
                    />
                    <span>Bật Thanh toán khi nhận hàng (COD)</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sysValues['payment.sepayEnabled'] === 'true'}
                      onChange={(e) => setSysField('payment.sepayEnabled', String(e.target.checked))}
                    />
                    <span>Bật Chuyển khoản VietQR / SePay</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sysValues['general.wheelEnabled'] === 'true'}
                      onChange={(e) => setSysField('general.wheelEnabled', String(e.target.checked))}
                    />
                    <span>Bật Vòng quay May mắn trên Client</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Input
                    label="Dòng thông báo Topbar (Promo Ticker)"
                    value={sysValues['general.promoTickerText'] || ''}
                    onChange={(e) => setSysField('general.promoTickerText', e.target.value)}
                    placeholder="VD: Thu cũ đổi mới trợ giá đến 3.000.000₫"
                  />
                  <Input
                    label="Tiêu đề Khu vực Flash Sale"
                    value={sysValues['general.flashSaleBannerTitle'] || ''}
                    onChange={(e) => setSysField('general.flashSaleBannerTitle', e.target.value)}
                  />
                </div>
              </div>

              {/* Nhóm 4: Mạng xã hội */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                  4. Liên kết Mạng xã hội (Footer)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Facebook Fanpage URL"
                    value={sysValues['social.facebookUrl'] || ''}
                    onChange={(e) => setSysField('social.facebookUrl', e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                  <Input
                    label="YouTube Channel URL"
                    value={sysValues['social.youtubeUrl'] || ''}
                    onChange={(e) => setSysField('social.youtubeUrl', e.target.value)}
                    placeholder="https://youtube.com/..."
                  />
                  <Input
                    label="Zalo OA / Hỗ trợ URL"
                    value={sysValues['social.zaloUrl'] || ''}
                    onChange={(e) => setSysField('social.zaloUrl', e.target.value)}
                    placeholder="https://zalo.me/..."
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end border-t border-slate-100">
                <Button
                  type="submit"
                  variant="dark"
                  size="md"
                  disabled={systemSaving}
                  className="px-6 shadow-xs"
                >
                  {systemSaving ? 'Đang lưu...' : 'Lưu toàn bộ cấu hình DB'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: BẢNG KHÓA CẤU HÌNH (THÊM / SỬA / XÓA / TÌM KIẾM / PHÂN TRANG / XEM CHI TIẾT) */}
        {currentTab === 'raw' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                <input
                  type="text"
                  placeholder="Tìm theo key, nhãn hoặc giá trị..."
                  value={rawSearch}
                  onChange={(e) => {
                    setRawSearch(e.target.value);
                    setRawPage(1);
                  }}
                  className="w-full sm:max-w-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
                <select
                  value={rawGroup}
                  onChange={(e) => {
                    setRawGroup(e.target.value);
                    setRawPage(1);
                  }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  {SETTING_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g === 'ALL' ? 'Tất cả nhóm' : g}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleOpenRawAdd}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                Thêm khóa mới
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3.5">Key</th>
                    <th className="py-3 px-3.5">Nhóm</th>
                    <th className="py-3 px-3.5">Giá trị</th>
                    <th className="py-3 px-3.5">Công khai</th>
                    <th className="py-3 px-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawLoading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        Đang tải...
                      </td>
                    </tr>
                  ) : rawSettings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        Không có khóa cấu hình nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    rawSettings.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                          {item.settingKey}
                          {item.label && (
                            <div className="text-[11px] font-sans font-normal text-slate-500">
                              {item.label}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {item.settingGroup}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 max-w-xs truncate font-mono text-slate-700">
                          {item.settingValue}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="text-[11px] font-semibold text-slate-700">
                            {item.isPublic !== false ? 'Public' : 'Private'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setRawDetail(item)}
                              className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 font-semibold cursor-pointer"
                            >
                              Xem
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRawEdit(item)}
                              className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/70 font-semibold cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => setRawDeleteTarget(item)}
                              className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200/70 font-semibold cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 bg-white">
              <AdminPagination
                currentPage={rawPage}
                totalPages={rawTotalPages}
                totalItems={rawTotalElements}
                itemsPerPage={RAW_ITEMS_PER_PAGE}
                onPageChange={setRawPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Raw Setting Detail Modal */}
      {rawDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chi tiết Khóa #{rawDetail.id}</h3>
              <button
                type="button"
                onClick={() => setRawDetail(null)}
                className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Setting Key</span>
              <span className="font-mono font-bold text-slate-900">{rawDetail.settingKey}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Nhóm / Loại</span>
              <span className="text-slate-800">{rawDetail.settingGroup} ({rawDetail.valueType || 'STRING'})</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Giá trị hiện tại</span>
              <pre className="mt-1 p-2.5 rounded-lg bg-slate-50 border border-slate-200 whitespace-pre-wrap break-all font-mono text-slate-800">
                {rawDetail.settingValue}
              </pre>
            </div>
            {rawDetail.description && (
              <div>
                <span className="text-slate-400 font-semibold block">Mô tả</span>
                <p className="text-slate-700">{rawDetail.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw Setting Add/Edit Modal */}
      {rawModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRaw}
            className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {rawEditing ? `Sửa khóa ${rawEditing.settingKey}` : 'Thêm Khóa Cấu hình Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setRawModalOpen(false)}
                className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {rawFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {rawFormError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Setting Key *</label>
                <input
                  type="text"
                  required
                  value={rawForm.settingKey}
                  onChange={(e) => setRawForm({ ...rawForm, settingKey: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhóm</label>
                <select
                  value={rawForm.settingGroup}
                  onChange={(e) => setRawForm({ ...rawForm, settingGroup: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  {SETTING_GROUPS.filter((g) => g !== 'ALL').map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Nhãn hiển thị</label>
                <input
                  type="text"
                  value={rawForm.label}
                  onChange={(e) => setRawForm({ ...rawForm, label: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Giá trị</label>
                <textarea
                  rows={3}
                  value={rawForm.settingValue}
                  onChange={(e) => setRawForm({ ...rawForm, settingValue: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={rawForm.isPublic}
                    onChange={(e) => setRawForm({ ...rawForm, isPublic: e.target.checked })}
                  />
                  <span>Trả về qua API công khai (/api/settings/public)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRawModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
              >
                Lưu khóa cấu hình
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Raw Delete Modal */}
      {rawDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa Khóa</h3>
            <p className="text-xs text-slate-500">
              Bạn chắc chắn muốn xóa khóa <strong className="font-mono text-slate-800">{rawDeleteTarget.settingKey}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRawDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteRaw()}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
