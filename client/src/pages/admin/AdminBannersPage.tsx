import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useBannerStore } from '../../store/useBannerStore';
import type { BannerItem } from '../../models/banner.model';

const SUGGESTED_LOCAL_IMAGES = [
  { label: 'MacBook Air M3', url: '/images/macbook-hero-banner.jpg' },
  { label: 'Tech Future', url: '/images/tech-future-banner.jpg' },
  { label: 'ASUS ROG Strix', url: '/images/asus-rog-strix.jpg' },
  { label: 'Ecosystem Nexor', url: '/images/tech-ecosystem.jpg' },
  { label: 'iPhone 16 Pro Max', url: '/images/iphone-16-pro-max.jpg' },
  { label: 'Samsung S24 Ultra', url: '/images/samsung-s24-ultra.jpg' },
  { label: 'Tai nghe Promo', url: '/images/headphone-promo.jpg' },
];

export const AdminBannersPage: React.FC = () => {
  const {
    banners,
    addBanner,
    updateBanner,
    deleteBanner,
    moveBanner,
    toggleActive,
    resetToDefault,
  } = useBannerStore();

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Delete Confirm Modal
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<BannerItem | null>(null);

  // Reset Confirm Modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Live preview active index in the admin page
  const [previewIndex, setPreviewIndex] = useState(0);

  const activeBanners = banners.filter((b) => b.isActive).sort((a, b) => a.order - b.order);
  const sortedBanners = [...banners].sort((a, b) => a.order - b.order);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleOpenAddModal = () => {
    setEditingBannerId(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormImageUrl('/images/macbook-hero-banner.jpg');
    setFormLinkUrl('/products');
    setFormIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: BannerItem) => {
    setEditingBannerId(item.id);
    setFormTitle(item.title);
    setFormSubtitle(item.subtitle || '');
    setFormImageUrl(item.imageUrl);
    setFormLinkUrl(item.linkUrl);
    setFormIsActive(item.isActive);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImageUrl.trim()) {
      setFormError('Vui lòng nhập đường dẫn hình ảnh (URL)');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề banner');
      return;
    }

    if (editingBannerId) {
      updateBanner(editingBannerId, {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || undefined,
        imageUrl: formImageUrl.trim(),
        linkUrl: formLinkUrl.trim() || '/products',
        isActive: formIsActive,
      });
      showToast('success', 'Đã cập nhật thông tin banner thành công!');
    } else {
      addBanner({
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || undefined,
        imageUrl: formImageUrl.trim(),
        linkUrl: formLinkUrl.trim() || '/products',
        isActive: formIsActive,
      });
      showToast('success', 'Đã thêm banner mới thành công!');
    }

    setIsModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmItem) return;
    deleteBanner(deleteConfirmItem.id);
    setDeleteConfirmItem(null);
    showToast('success', 'Đã xóa banner khỏi danh sách!');
  };

  const handleResetConfirm = () => {
    resetToDefault();
    setShowResetConfirm(false);
    showToast('success', 'Đã khôi phục danh sách banner về mặc định ban đầu!');
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    moveBanner(id, direction);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 animate-slide-in ${notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Quản lý Banner Trang chủ
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Tùy chỉnh danh sách ảnh trượt (Carousel) hiển thị tại vị trí trung tâm Hero Section trang chủ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Khôi phục banner mẫu"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Banner Mới</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-xs text-slate-500 font-medium">Tổng số Banner</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{banners.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-xs text-slate-500 font-medium">Đang kích hoạt hiển thị</div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">
              {activeBanners.length} <span className="text-xs text-slate-400 font-normal">/ {banners.length}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-xs text-slate-500 font-medium">Chế độ hiển thị Trang chủ</div>
            <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Carousel Tự động trượt
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Live Preview Box */}
      {activeBanners.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Xem trước thực tế trên Trang chủ (Live Preview)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Banner {previewIndex + 1} / {activeBanners.length}
            </span>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-21/9 max-h-[300px] border border-slate-800 shadow-md group">
            {activeBanners[previewIndex] && (
              <>
                <img
                  src={activeBanners[previewIndex].imageUrl}
                  alt={activeBanners[previewIndex].title}
                  className="w-full h-full object-cover transition-opacity duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/macbook-hero-banner.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-600 text-[11px] font-bold text-white uppercase tracking-wider w-fit mb-1.5 shadow-sm">
                    Vị trí #{previewIndex + 1}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-sm">
                    {activeBanners[previewIndex].title}
                  </h3>
                  {activeBanners[previewIndex].subtitle && (
                    <p className="text-xs text-slate-200 mt-1 line-clamp-1">
                      {activeBanners[previewIndex].subtitle}
                    </p>
                  )}
                  <div className="text-[11px] text-blue-300 font-medium mt-1 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>Điều hướng đến: {activeBanners[previewIndex].linkUrl}</span>
                  </div>
                </div>
              </>
            )}

            {/* Thumbnail dots selector */}
            <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
              {activeBanners.map((b, idx) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setPreviewIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${previewIndex === idx ? 'w-6 bg-blue-500' : 'w-2 bg-white/50 hover:bg-white/80'
                    }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Banners List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Danh sách các Banner ({banners.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sử dụng nút mũi tên để điều chỉnh thứ tự trượt xuất hiện trên trang chủ
            </p>
          </div>
        </div>

        {banners.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Chưa có banner nào</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Nhấn nút Thêm Banner Mới hoặc bấm Mặc Định để khôi phục bộ banner mẫu sắc nét.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleResetConfirm}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Khôi phục mặc định
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Thêm banner ngay
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-20 text-center">Thứ tự</th>
                  <th className="py-3.5 px-4 w-44">Hình ảnh</th>
                  <th className="py-3.5 px-4">Thông tin Banner</th>
                  <th className="py-3.5 px-4 w-48">Liên kết điều hướng</th>
                  <th className="py-3.5 px-4 w-32 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sortedBanners.map((item, index) => {
                  const isFirst = index === 0;
                  const isLast = index === sortedBanners.length - 1;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${!item.isActive ? 'opacity-60 bg-slate-50/30' : ''
                        }`}
                    >
                      {/* Thứ tự & Nút di chuyển */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-bold text-slate-900 w-5">{item.order}</span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMove(item.id, 'up')}
                              disabled={isFirst}
                              className={`p-1 rounded hover:bg-slate-200 transition-colors ${isFirst ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 cursor-pointer'
                                }`}
                              title="Di chuyển lên trước"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(item.id, 'down')}
                              disabled={isLast}
                              className={`p-1 rounded hover:bg-slate-200 transition-colors ${isLast ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 cursor-pointer'
                                }`}
                              title="Di chuyển xuống dưới"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Ảnh Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-16/9 w-36 shadow-2xs group">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/macbook-hero-banner.jpg';
                            }}
                          />
                        </div>
                      </td>

                      {/* Tiêu đề & Phụ đề */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm leading-snug">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-slate-500 text-xs mt-0.5 line-clamp-1">
                            {item.subtitle}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          ID: {item.id}
                        </div>
                      </td>

                      {/* Liên kết */}
                      <td className="py-3.5 px-4">
                        <a
                          href={item.linkUrl}
                          target={item.linkUrl.startsWith('http') ? '_blank' : '_self'}
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-medium text-xs max-w-full truncate transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.linkUrl}</span>
                        </a>
                      </td>

                      {/* Trạng thái Bật/Tắt */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleActive(item.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${item.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                          title={item.isActive ? 'Click để tắt hiển thị' : 'Click để bật hiển thị'}
                        >
                          {item.isActive ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>Hiển thị</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-slate-400" />
                              <span>Đã ẩn</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa banner"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmItem(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa banner"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Banner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingBannerId ? 'Chỉnh sửa Banner' : 'Thêm Banner Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* URL ảnh */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đường dẫn ảnh Banner (Image URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="Ví dụ: /images/macbook-hero-banner.jpg hoặc https://..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  required
                />

                {/* Quick suggestions */}
                <div className="mt-2">
                  <span className="text-[11px] text-slate-500 font-medium block mb-1">
                    Hoặc chọn nhanh ảnh có sẵn trong dự án:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_LOCAL_IMAGES.map((sug) => (
                      <button
                        key={sug.url}
                        type="button"
                        onClick={() => setFormImageUrl(sug.url)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${formImageUrl === sug.url
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        {sug.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Image Preview in Modal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xem trước hình ảnh
                </label>
                <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-21/9 max-h-[180px] flex items-center justify-center">
                  {formImageUrl.trim() ? (
                    <img
                      src={formImageUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/macbook-hero-banner.jpg';
                      }}
                    />
                  ) : (
                    <div className="text-center text-slate-400 text-xs">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      Chưa nhập đường dẫn ảnh
                    </div>
                  )}
                </div>
              </div>

              {/* Tiêu đề */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề Banner <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: MacBook Air M3 - Siêu mỏng nhẹ, hiệu năng đỉnh cao"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  required
                />
              </div>

              {/* Phụ đề */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả phụ / Thông điệp khuyến mãi (Subtitle)
                </label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="Ví dụ: Giảm giá đến 15% kèm gói bảo hành 24 tháng chính hãng"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Đường dẫn điều hướng */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đường dẫn điều hướng khi bấm (Link URL)
                </label>
                <input
                  type="text"
                  value={formLinkUrl}
                  onChange={(e) => setFormLinkUrl(e.target.value)}
                  placeholder="Ví dụ: /products/4 hoặc /products?category=laptop hoặc https://..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>

              {/* Trạng thái kích hoạt */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">Hiển thị trên Trang chủ</div>
                  <div className="text-[11px] text-slate-500">
                    Bật để đưa banner vào danh sách trượt tự động
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingBannerId ? 'Cập nhật Banner' : 'Lưu Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa Banner?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Bạn có chắc chắn muốn xóa banner <strong className="text-slate-800">"{deleteConfirmItem.title}"</strong>? Thao tác này sẽ gỡ banner khỏi thanh trượt trên trang chủ.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset to Default Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Khôi phục về Banner mẫu?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Toàn bộ danh sách banner hiện tại sẽ được thay thế bằng 4 banner chất lượng cao tiêu chuẩn của hệ thống (MacBook, ROG Strix, Tech Future, Ecosystem).
            </p>

            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBannersPage;
