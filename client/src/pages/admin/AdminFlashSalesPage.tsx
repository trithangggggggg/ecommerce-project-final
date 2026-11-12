import React, { useState, useEffect, useCallback } from 'react';
import AdminPagination from '../../components/admin/AdminPagination';
import {
  flashSaleService,
  type FlashSaleDto,
  type FlashSaleProductItem,
} from '../../api/services/flashSale.service';
import { productService } from '../../api/services/product.service';
import type { Product } from '../../models/product.model';
import { formatPrice } from '../../utils/format';

const ITEMS_PER_PAGE = 10;

const toLocalDatetimeInput = (iso?: string): string => {
  if (!iso) return '';
  return iso.slice(0, 16);
};

const toIsoPayload = (localVal: string): string => {
  if (!localVal) return '';
  return localVal.length === 16 ? `${localVal}:00` : localVal;
};

const STATUS_BADGE: Record<string, string> = {
  LIVE: 'bg-rose-50 text-rose-700 border-rose-200',
  UPCOMING: 'bg-amber-50 text-amber-700 border-amber-200',
  ENDED: 'bg-slate-100 text-slate-600 border-slate-200',
  INACTIVE: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_LABEL: Record<string, string> = {
  LIVE: 'Đang diễn ra',
  UPCOMING: 'Sắp diễn ra',
  ENDED: 'Đã kết thúc',
  INACTIVE: 'Đang tắt',
};

export const AdminFlashSalesPage: React.FC = () => {
  const [flashSales, setFlashSales] = useState<FlashSaleDto[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [detailItem, setDetailItem] = useState<FlashSaleDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlashSaleDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formBadgeText, setFormBadgeText] = useState('FLASH SALE');
  const [formDescription, setFormDescription] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formItems, setFormItems] = useState<FlashSaleProductItem[]>([]);

  // Product picker
  const [selectedProductId, setSelectedProductId] = useState<number>(0);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFlashSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await flashSaleService.searchAdminFlashSales({
        keyword: searchQuery.trim() || undefined,
        isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        page: currentPage - 1,
        size: ITEMS_PER_PAGE,
      });
      setFlashSales(res?.content || []);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách Flash Sale';
      showToast('error', msg);
      setFlashSales([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productService.getAdminProducts({ page: 1, limit: 100 });
      setProducts(res.data || []);
    } catch {
      // Ignore optional dropdown preload error
    }
  }, []);

  useEffect(() => {
    void fetchFlashSales();
  }, [fetchFlashSales]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const handleOpenAdd = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 6 * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setEditingId(null);
    setFormTitle('');
    setFormBadgeText('GIỜ VÀNG GIÁ SỐC');
    setFormDescription('');
    setFormStartTime(fmt(now));
    setFormEndTime(fmt(end));
    setFormIsActive(true);
    setFormItems([]);
    setSelectedProductId(0);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (fs: FlashSaleDto) => {
    try {
      const full = await flashSaleService.getFlashSaleById(fs.id);
      setEditingId(full.id);
      setFormTitle(full.title);
      setFormBadgeText(full.badgeText || 'FLASH SALE');
      setFormDescription(full.description || '');
      setFormStartTime(toLocalDatetimeInput(full.startTime));
      setFormEndTime(toLocalDatetimeInput(full.endTime));
      setFormIsActive(Boolean(full.isActive));
      setFormItems(full.items || []);
      setSelectedProductId(0);
      setFormError('');
      setIsModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải chi tiết Flash Sale';
      showToast('error', msg);
    }
  };

  const handleOpenDetail = async (fs: FlashSaleDto) => {
    try {
      const full = await flashSaleService.getFlashSaleById(fs.id);
      setDetailItem(full);
    } catch {
      setDetailItem(fs);
    }
  };

  const handleAddProductToDeal = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;
    if (formItems.some((item) => item.productId === prod.id)) {
      setFormError(`Sản phẩm "${prod.name}" đã có trong chương trình này`);
      return;
    }
    const orig = Number(prod.originalPrice || prod.price || 0);
    const suggestedSale = Math.round(Number(prod.price || 0) * 0.9);
    setFormItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        productBrand: prod.brand,
        productImageUrl: prod.imageUrl,
        originalPrice: orig > 0 ? orig : Number(prod.price || 0),
        salePrice: suggestedSale > 0 ? suggestedSale : Number(prod.price || 0),
        stockLimit: Math.min(20, Math.max(1, prod.stock || 20)),
        soldCount: 0,
        displayOrder: prev.length + 1,
      },
    ]);
    setSelectedProductId(0);
    setFormError('');
  };

  const handleUpdateDealItem = (index: number, patch: Partial<FlashSaleProductItem>) => {
    setFormItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const handleRemoveDealItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tên chương trình Flash Sale');
      return;
    }
    if (!formStartTime || !formEndTime || formEndTime <= formStartTime) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        badgeText: formBadgeText.trim() || 'FLASH SALE',
        startTime: toIsoPayload(formStartTime),
        endTime: toIsoPayload(formEndTime),
        isActive: formIsActive,
        items: formItems.map((it, idx) => ({
          productId: it.productId,
          salePrice: Number(it.salePrice) || 0,
          originalPrice: Number(it.originalPrice) || Number(it.salePrice) || 0,
          stockLimit: Math.max(1, Number(it.stockLimit) || 10),
          soldCount: Math.max(0, Number(it.soldCount) || 0),
          displayOrder: idx + 1,
        })),
      };

      if (editingId) {
        await flashSaleService.updateFlashSale(editingId, payload);
        showToast('success', 'Đã cập nhật chương trình Flash Sale!');
      } else {
        await flashSaleService.createFlashSale(payload);
        showToast('success', 'Đã tạo chương trình Flash Sale mới!');
      }
      setIsModalOpen(false);
      await fetchFlashSales();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu Flash Sale thất bại';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (fs: FlashSaleDto) => {
    try {
      await flashSaleService.toggleFlashSaleStatus(fs.id, !fs.isActive);
      showToast('success', `Đã ${fs.isActive ? 'tắt' : 'kích hoạt'} chương trình "${fs.title}"`);
      await fetchFlashSales();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đổi trạng thái thất bại';
      showToast('error', msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await flashSaleService.deleteFlashSale(deleteTarget.id);
      showToast('success', `Đã xóa Flash Sale "${deleteTarget.title}"`);
      setDeleteTarget(null);
      await fetchFlashSales();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa Flash Sale thất bại';
      showToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans overflow-hidden">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý Chương trình Flash Sale
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 tabular-nums">
              {totalElements} chương trình
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập khung giờ vàng, đếm ngược thời gian thực và danh sách sản phẩm giảm giá hiển thị trên Trang chủ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void fetchFlashSales()}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Tạo Flash Sale mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Tìm theo tên chương trình hoặc nhãn badge..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:max-w-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang kích hoạt</option>
              <option value="INACTIVE">Đang tắt</option>
            </select>
          </div>
          <span className="text-xs text-slate-500 font-medium tabular-nums">
            Tổng <strong className="text-slate-800">{totalElements}</strong> chương trình
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50/95 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Chương trình</th>
                <th className="py-3 px-3.5">Thời gian</th>
                <th className="py-3 px-3.5">Sản phẩm</th>
                <th className="py-3 px-3.5">Trạng thái</th>
                <th className="py-3 px-3.5">Kích hoạt</th>
                <th className="py-3 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Đang tải chương trình Flash Sale...
                  </td>
                </tr>
              ) : flashSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Chưa có chương trình Flash Sale nào.
                  </td>
                </tr>
              ) : (
                flashSales.map((fs) => (
                  <tr key={fs.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-slate-900">{fs.title}</div>
                      <div className="text-[11px] text-slate-500">{fs.badgeText || 'FLASH SALE'}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-[11px] text-slate-600 whitespace-nowrap">
                      <div>Từ: {fs.startTime?.replace('T', ' ').slice(0, 16)}</div>
                      <div>Đến: {fs.endTime?.replace('T', ' ').slice(0, 16)}</div>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-700 tabular-nums">
                      {fs.itemCount} sản phẩm
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          STATUS_BADGE[fs.runtimeStatus] || STATUS_BADGE.INACTIVE
                        }`}
                      >
                        {STATUS_LABEL[fs.runtimeStatus] || fs.runtimeStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(fs)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                          fs.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {fs.isActive ? 'Đang bật' : 'Đang tắt'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleOpenDetail(fs)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 cursor-pointer"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleOpenEdit(fs)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(fs)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 cursor-pointer"
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
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{detailItem.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {detailItem.startTime?.replace('T', ' ').slice(0, 16)} — {detailItem.endTime?.replace('T', ' ').slice(0, 16)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {detailItem.description && (
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  {detailItem.description}
                </p>
              )}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">
                  Sản phẩm trong chương trình ({detailItem.items?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {(detailItem.items || []).length === 0 ? (
                    <div className="p-4 text-center text-slate-500">Chưa gắn sản phẩm nào</div>
                  ) : (
                    (detailItem.items || []).map((it) => (
                      <div key={it.productId} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {it.productImageUrl && (
                            <img
                              src={it.productImageUrl}
                              alt={it.productName}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{it.productName}</div>
                            <div className="text-[11px] text-slate-500">
                              Giới hạn: {it.stockLimit} • Đã bán: {it.soldCount}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-rose-600">{formatPrice(it.salePrice)}</div>
                          <div className="text-[11px] text-slate-400 line-through">
                            {formatPrice(it.originalPrice || it.salePrice)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? `Cập nhật Flash Sale #${editingId}` : 'Tạo Chương trình Flash Sale'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên chương trình *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="VD: Giờ Vàng Công Nghệ Cuối Tuần"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhãn hiển thị (Badge)</label>
                  <input
                    type="text"
                    value={formBadgeText}
                    onChange={(e) => setFormBadgeText(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian bắt đầu *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian kết thúc *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Mô tả ngắn</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Kích hoạt chương trình ngay khi đến giờ</span>
                  </label>
                </div>
              </div>

              {/* Pick products */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <label className="block font-bold text-slate-800">Danh sách sản phẩm tham gia Flash Sale</label>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(Number(e.target.value))}
                    className="flex-1 min-w-[220px] px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  >
                    <option value={0}>-- Chọn sản phẩm từ kho --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatPrice(p.price)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddProductToDeal}
                    disabled={!selectedProductId}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer disabled:opacity-40"
                  >
                    Thêm vào Deal
                  </button>
                </div>

                {formItems.length > 0 && (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {formItems.map((it, idx) => (
                      <div key={it.productId} className="p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                        <div className="sm:col-span-4 min-w-0">
                          <div className="font-bold text-slate-900 truncate">{it.productName}</div>
                          <div className="text-[11px] text-slate-400">
                            Giá gốc: {formatPrice(it.originalPrice || 0)}
                          </div>
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Giá Flash Sale</label>
                          <input
                            type="number"
                            min={0}
                            value={it.salePrice}
                            onChange={(e) => handleUpdateDealItem(idx, { salePrice: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Suất bán</label>
                          <input
                            type="number"
                            min={1}
                            value={it.stockLimit}
                            onChange={(e) => handleUpdateDealItem(idx, { stockLimit: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Đã bán</label>
                          <input
                            type="number"
                            min={0}
                            value={it.soldCount}
                            onChange={(e) => handleUpdateDealItem(idx, { soldCount: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none"
                          />
                        </div>
                        <div className="sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveDealItem(idx)}
                            className="px-2 py-1 rounded bg-rose-50 text-rose-700 font-semibold cursor-pointer"
                          >
                            Gỡ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-60"
              >
                {isSaving ? 'Đang lưu...' : editingId ? 'Lưu chương trình' : 'Tạo Flash Sale'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa Flash Sale</h3>
            <p className="text-xs text-slate-500">
              Bạn chắc chắn muốn xóa chương trình <strong className="text-slate-800">{deleteTarget.title}</strong>?
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

export default AdminFlashSalesPage;

