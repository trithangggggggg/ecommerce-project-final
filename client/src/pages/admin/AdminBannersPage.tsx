import React, { useState, useEffect, useCallback } from 'react';
import AdminPagination from '../../components/admin/AdminPagination';
import {
  bannerService,
  type BannerItem,
  type BannerPosition,
} from '../../api/services/banner.service';
import { useBannerStore } from '../../store/useBannerStore';

const ITEMS_PER_PAGE = 8;

const POSITION_OPTIONS: Array<{ value: BannerPosition; label: string }> = [
  { value: 'HERO_SLIDER', label: 'Slider chính (Hero)' },
  { value: 'HERO_PROMO', label: 'Thẻ khuyến mãi phụ (Hero Promo)' },
  { value: 'VERTICAL_PROMO', label: 'Banner dọc trang chủ' },
];

const SUGGESTED_LOCAL_IMAGES = [
  { label: 'MacBook Air M3', url: '/images/macbook-hero-banner.jpg' },
  { label: 'Promo Giảm đến 50%', url: '/images/promo-discount-50.jpg' },
  { label: 'Promo Miễn phí ship', url: '/images/promo-free-shipping.jpg' },
  { label: 'Promo Bảo hành', url: '/images/promo-warranty.jpg' },
  { label: 'Tech Future (Dọc)', url: '/images/tech-future-banner.jpg' },
  { label: 'ASUS ROG Strix', url: '/images/asus-rog-strix.jpg' },
  { label: 'Ecosystem Nexor', url: '/images/tech-ecosystem.jpg' },
  { label: 'iPhone 16 Pro Max', url: '/images/iphone-16-pro-max.jpg' },
  { label: 'Samsung S24 Ultra', url: '/images/samsung-s24-ultra.jpg' },
  { label: 'Tai nghe Promo', url: '/images/headphone-promo.jpg' },
];

const SUGGESTED_LINKS = [
  { label: 'Tất cả sản phẩm', url: '/products' },
  { label: 'Laptop', url: '/products?category=laptop' },
  { label: 'Điện thoại', url: '/products?category=phone' },
  { label: 'Phụ kiện', url: '/products?category=accessory' },
  { label: 'Khuyến mãi', url: '/products?sort=discount' },
  { label: 'Trang chủ', url: '/' },
];

const getPositionLabel = (pos: string) =>
  POSITION_OPTIONS.find((p) => p.value === pos)?.label || pos;

export const AdminBannersPage: React.FC = () => {
  const refreshClientBanners = useBannerStore((s) => s.fetchBanners);

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Detail modal
  const [detailBanner, setDetailBanner] = useState<BannerItem | null>(null);

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('/images/macbook-hero-banner.jpg');
  const [formLinkUrl, setFormLinkUrl] = useState('/products');
  const [formPosition, setFormPosition] = useState<BannerPosition>('HERO_SLIDER');
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<BannerItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bannerService.searchAdminBanners({
        keyword: searchQuery.trim() || undefined,
        position: positionFilter !== 'ALL' ? positionFilter : undefined,
        isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        page: currentPage - 1,
        size: ITEMS_PER_PAGE,
      });
      setBanners(res?.content || []);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách banner từ máy chủ';
      showToast('error', msg);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, positionFilter, statusFilter, currentPage]);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  const handleOpenAdd = () => {
    setEditingBanner(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormBadge('');
    setFormImageUrl('/images/macbook-hero-banner.jpg');
    setFormLinkUrl('/products');
    setFormPosition('HERO_SLIDER');
    setFormDisplayOrder(totalElements + 1);
    setFormStartDate('');
    setFormEndDate('');
    setFormIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: BannerItem) => {
    setEditingBanner(item);
    setFormTitle(item.title || '');
    setFormSubtitle(item.subtitle || '');
    setFormBadge(item.badge || '');
    setFormImageUrl(item.imageUrl || '');
    setFormLinkUrl(item.linkUrl || '/products');
    setFormPosition(item.position || 'HERO_SLIDER');
    setFormDisplayOrder(item.displayOrder ?? 0);
    setFormStartDate(item.startDate ? item.startDate.slice(0, 10) : '');
    setFormEndDate(item.endDate ? item.endDate.slice(0, 10) : '');
    setFormIsActive(Boolean(item.isActive));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenDetail = async (item: BannerItem) => {
    setDetailBanner(item);
    try {
      const fresh = await bannerService.getAdminBannerById(item.id);
      if (fresh) setDetailBanner(fresh);
    } catch {
      // Keep row data if detail call fails
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề banner');
      return;
    }
    if (!formImageUrl.trim()) {
      setFormError('Vui lòng nhập đường dẫn hình ảnh (URL)');
      return;
    }
    if (formStartDate && formEndDate && formEndDate < formStartDate) {
      setFormError('Ngày kết thúc không được nhỏ hơn ngày bắt đầu');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const payload = {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || undefined,
        badge: formBadge.trim() || undefined,
        imageUrl: formImageUrl.trim(),
        linkUrl: formLinkUrl.trim() || '/products',
        position: formPosition,
        displayOrder: Number(formDisplayOrder) || 0,
        isActive: formIsActive,
        startDate: formStartDate || null,
        endDate: formEndDate || null,
      };
      if (editingBanner) {
        await bannerService.updateBanner(editingBanner.id, payload);
        showToast('success', 'Đã cập nhật banner thành công!');
      } else {
        await bannerService.createBanner(payload);
        showToast('success', 'Đã tạo banner mới thành công!');
      }
      setIsModalOpen(false);
      await fetchBanners();
      await refreshClientBanners(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu banner thất bại';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (item: BannerItem) => {
    try {
      await bannerService.toggleBannerStatus(item.id, !item.isActive);
      showToast('success', `Đã ${item.isActive ? 'tạm ẩn' : 'kích hoạt'} banner "${item.title}"`);
      await fetchBanners();
      await refreshClientBanners(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đổi trạng thái banner';
      showToast('error', msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await bannerService.deleteBanner(deleteTarget.id);
      showToast('success', `Đã xóa banner "${deleteTarget.title}"`);
      setDeleteTarget(null);
      await fetchBanners();
      await refreshClientBanners(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa banner thất bại';
      showToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans overflow-hidden">
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý Banner Trang chủ
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
              {totalElements} banner
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Điều khiển toàn bộ slider chính, thẻ promo phụ và banner dọc trên trang chủ cửa hàng (lưu MySQL)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void fetchBanners()}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition cursor-pointer"
          >
            Thêm banner mới
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Filter bar */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, mô tả, badge hoặc liên kết..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:max-w-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={positionFilter}
              onChange={(e) => {
                setPositionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả vị trí</option>
              {POSITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hiển thị</option>
              <option value="INACTIVE">Đang ẩn</option>
            </select>
          </div>
          <span className="text-xs text-slate-500 font-medium tabular-nums">
            Tổng <strong className="text-slate-800">{totalElements}</strong> bản ghi
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Banner</th>
                <th className="py-3 px-3.5">Vị trí</th>
                <th className="py-3 px-3.5">Thứ tự</th>
                <th className="py-3 px-3.5">Lượt click</th>
                <th className="py-3 px-3.5">Trạng thái</th>
                <th className="py-3 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Đang tải danh sách banner...
                  </td>
                </tr>
              ) : banners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Chưa có banner nào phù hợp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                banners.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-20 h-11 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/macbook-hero-banner.jpg';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate max-w-xs">{item.title}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {item.subtitle || item.linkUrl || '/products'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {getPositionLabel(item.position)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-700 tabular-nums">
                      #{item.displayOrder}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-600 tabular-nums">
                      {item.clickCount ?? 0}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(item)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {item.isActive ? 'Đang bật' : 'Đang ẩn'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleOpenDetail(item)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 transition cursor-pointer"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 transition cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition cursor-pointer"
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
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalElements}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* View Detail Modal */}
      {detailBanner && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chi tiết Banner #{detailBanner.id}</h3>
              <button
                type="button"
                onClick={() => setDetailBanner(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <img
              src={detailBanner.imageUrl}
              alt={detailBanner.title}
              className="w-full h-44 object-cover rounded-xl border border-slate-200 bg-slate-50"
            />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <span className="text-slate-400 font-semibold block">Tiêu đề</span>
                <span className="font-bold text-slate-900">{detailBanner.title}</span>
              </div>
              {detailBanner.subtitle && (
                <div className="col-span-2">
                  <span className="text-slate-400 font-semibold block">Mô tả phụ</span>
                  <span className="text-slate-700">{detailBanner.subtitle}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 font-semibold block">Vị trí hiển thị</span>
                <span className="font-semibold text-slate-800">{getPositionLabel(detailBanner.position)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Nhãn (Badge)</span>
                <span className="font-semibold text-slate-800">{detailBanner.badge || 'Không có'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Đường dẫn đích</span>
                <span className="font-mono text-blue-700">{detailBanner.linkUrl || '/products'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Thứ tự / Lượt click</span>
                <span className="font-mono text-slate-800">
                  #{detailBanner.displayOrder} / {detailBanner.clickCount ?? 0} lượt
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Hiệu lực</span>
                <span className="text-slate-700">
                  {detailBanner.startDate || 'Luôn bật'} đến {detailBanner.endDate || 'Không giới hạn'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Trạng thái</span>
                <span className="font-bold text-slate-800">
                  {detailBanner.isActive ? 'Đang hiển thị' : 'Đang ẩn'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitForm}
            className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-900">
                {editingBanner ? `Chỉnh sửa Banner #${editingBanner.id}` : 'Thêm Banner Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Tiêu đề banner *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="VD: MacBook Pro M4 - Đột phá hiệu năng AI"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vị trí hiển thị</label>
                  <select
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  >
                    {POSITION_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhãn nổi bật (Badge)</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="VD: HOT SALE, NEW 2026..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Mô tả ngắn / Dòng phụ</label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="Giảm thêm đến 2.000.000₫ khi thanh toán VietQR"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">URL hình ảnh *</label>
                  <input
                    type="text"
                    required
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SUGGESTED_LOCAL_IMAGES.map((img) => (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => setFormImageUrl(img.url)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer"
                      >
                        {img.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Liên kết khi click</label>
                  <input
                    type="text"
                    value={formLinkUrl}
                    onChange={(e) => setFormLinkUrl(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SUGGESTED_LINKS.map((l) => (
                      <button
                        key={l.url}
                        type="button"
                        onClick={() => setFormLinkUrl(l.url)}
                        className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-medium cursor-pointer"
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thứ tự ưu tiên</label>
                  <input
                    type="number"
                    min={0}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Hiển thị trên Trang chủ ngay</span>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày bắt đầu (tùy chọn)</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày kết thúc (tùy chọn)</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isSaving ? 'Đang lưu...' : editingBanner ? 'Cập nhật Banner' : 'Tạo Banner'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa Banner</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa banner <strong className="text-slate-800">{deleteTarget.title}</strong> khỏi hệ thống không?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDeleteConfirm()}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBannersPage;
