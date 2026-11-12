import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';
import { promotionService } from '../../api/services/promotion.service';

export interface PromoItem {
  id: number;
  code: string;
  title: string;
  discount: string;
  minOrder: string;
  startDate?: string | null;
  expiry: string;
  maxDiscountAmount?: number | null;
  usedCount: number;
  maxUsage: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  type?: 'ORDER' | 'SHIPPING';
  userId?: number | null;
}

const ITEMS_PER_PAGE = 10;

const getTodayIso = () => new Date().toLocaleDateString('en-CA');

const isPromoExpired = (p: PromoItem, today = getTodayIso()) =>
  p.status === 'EXPIRED' || Boolean(p.expiry && p.expiry < today);

const isPromoNotStarted = (p: PromoItem, today = getTodayIso()) =>
  Boolean(p.startDate && p.startDate > today);

export const AdminPromotionsPage: React.FC = () => {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED'>('ALL');
  const [copied, setCopied] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchPromotions = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await promotionService.getPromotions();
      setPromos(data);
    } catch (err: unknown) {
      setPromos([]);
      setLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách khuyến mãi từ máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoItem | null>(null);
  const [detailPromo, setDetailPromo] = useState<PromoItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoItem | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    code: '',
    title: '',
    discount: '',
    minOrder: '',
    startDate: '',
    expiry: '2026-12-31',
    maxDiscountAmount: '',
    maxUsage: 100,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    type: 'ORDER' as 'ORDER' | 'SHIPPING',
  });

  const [editForm, setEditForm] = useState({
    code: '',
    title: '',
    discount: '',
    minOrder: '',
    startDate: '',
    expiry: '',
    maxDiscountAmount: '',
    maxUsage: 100,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    type: 'ORDER' as 'ORDER' | 'SHIPPING',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    showToast(`Đã sao chép mã "${code}"`);
    setTimeout(() => setCopied(null), 2000);
  };

  // Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.code.trim() || !addForm.discount.trim()) {
      showToast('Vui lòng nhập mã voucher và mức giảm!');
      return;
    }

    try {
      const newPromo = await promotionService.createPromotion({
        code: addForm.code.trim().toUpperCase(),
        title: addForm.title.trim() || 'Ưu đãi khuyến mãi NEXOR',
        discount: addForm.discount.trim(),
        minOrder: addForm.minOrder.trim() || 'Mọi đơn hàng',
        startDate: addForm.startDate.trim() || null,
        expiry: addForm.expiry,
        maxDiscountAmount: addForm.maxDiscountAmount.trim() ? Number(addForm.maxDiscountAmount) : null,
        usedCount: 0,
        maxUsage: Number(addForm.maxUsage) || 100,
        status: addForm.status,
        type: addForm.type,
      });

      setPromos((prev) => [newPromo, ...prev]);
      setIsAddOpen(false);
      setAddForm({
        code: '',
        title: '',
        discount: '',
        minOrder: '',
        startDate: '',
        expiry: '2026-12-31',
        maxDiscountAmount: '',
        maxUsage: 100,
        status: 'ACTIVE',
        type: 'ORDER',
      });
      showToast(`Đã thêm mã khuyến mãi "${newPromo.code}" vào Database thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo mã khuyến mãi';
      showToast(msg);
    }
  };

  // Open Edit
  const handleOpenEdit = (p: PromoItem) => {
    setEditingPromo(p);
    const defaultType = p.type || (p.code.toUpperCase().startsWith('FREESHIP') || p.code.toUpperCase().startsWith('SHIP') ? 'SHIPPING' : 'ORDER');
    setEditForm({
      code: p.code,
      title: p.title,
      discount: p.discount,
      minOrder: p.minOrder,
      startDate: p.startDate || '',
      expiry: p.expiry || '',
      maxDiscountAmount: p.maxDiscountAmount != null ? String(p.maxDiscountAmount) : '',
      maxUsage: p.maxUsage,
      status: p.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      type: defaultType,
    });
  };

  // Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;

    try {
      const updated = await promotionService.updatePromotion(editingPromo.id, {
        code: editForm.code.trim().toUpperCase(),
        title: editForm.title.trim(),
        discount: editForm.discount.trim(),
        minOrder: editForm.minOrder.trim(),
        startDate: editForm.startDate.trim() || null,
        expiry: editForm.expiry,
        maxDiscountAmount: editForm.maxDiscountAmount.trim() ? Number(editForm.maxDiscountAmount) : null,
        maxUsage: Number(editForm.maxUsage) || 100,
        status: editForm.status,
        type: editForm.type,
      });

      setPromos((prev) =>
        prev.map((item) => (item.id === editingPromo.id ? updated : item))
      );

      showToast(`Đã cập nhật mã "${updated.code}" thành công!`);
      setEditingPromo(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật mã khuyến mãi';
      showToast(msg);
    }
  };

  const handleOpenDetail = async (p: PromoItem) => {
    setDetailPromo(p);
    setIsDetailLoading(true);
    try {
      const fresh = await promotionService.getPromotionById(p.id);
      setDetailPromo(fresh);
    } catch {
      // Giữ nguyên dữ liệu hàng hiện tại nếu không tải mới được
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleToggleStatus = async (p: PromoItem) => {
    const nextStatus = p.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    try {
      const updated = await promotionService.togglePromotionStatus(p.id, nextStatus);
      setPromos((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
      showToast(`Đã chuyển mã "${updated.code}" sang ${updated.status === 'ACTIVE' ? 'Đang áp dụng' : 'Tạm ngưng'}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể đổi trạng thái mã khuyến mãi');
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await promotionService.deletePromotion(deleteTarget.id);
      setPromos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`Đã xóa mã voucher "${deleteTarget.code}" khỏi Database!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xóa mã khuyến mãi';
      showToast(msg);
    } finally {
      setDeleteTarget(null);
    }
  };

  const todayIso = getTodayIso();

  // Filter
  const filteredPromos = promos.filter((p) => {
    const expired = isPromoExpired(p, todayIso);
    if (statusFilter === 'ACTIVE' && (p.status !== 'ACTIVE' || expired)) return false;
    if (statusFilter === 'INACTIVE' && p.status !== 'INACTIVE') return false;
    if (statusFilter === 'EXPIRED' && !expired) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = p.code.toLowerCase().includes(q);
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchDiscount = p.discount.toLowerCase().includes(q);
      return matchCode || matchTitle || matchDiscount;
    }
    return true;
  });

  const activeCount = promos.filter((p) => p.status === 'ACTIVE' && !isPromoExpired(p, todayIso)).length;
  const inactiveCount = promos.filter((p) => p.status === 'INACTIVE').length;
  const expiredCount = promos.filter((p) => isPromoExpired(p, todayIso)).length;
  const totalUsed = promos.reduce((sum, p) => sum + p.usedCount, 0);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPromos.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPromos = filteredPromos.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý mã khuyến mãi & Voucher
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {promos.length} mã
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập các chương trình ưu đãi, voucher giảm giá và theo dõi hiệu suất chuyển đổi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={fetchPromotions}
          >
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
          >
            Tạo mã mới
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tổng số mã</span>
          <span className="text-lg font-bold text-slate-900">{promos.length}</span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Đang áp dụng</span>
          <span className="text-lg font-bold text-emerald-600">{activeCount}</span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Đã hết hạn</span>
          <span className="text-lg font-bold text-rose-600">{expiredCount}</span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Lượt dùng thành công</span>
          <span className="text-lg font-bold text-blue-600">{totalUsed.toLocaleString()}</span>
        </div>
      </div>

      {/* Main Table Card (Dạng bảng) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Search & Filter Bar */}
        <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            <div className="w-full sm:w-72">
              <Input
                type="text"
                placeholder="Tìm mã code, tên chương trình, mức giảm..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({promos.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ACTIVE');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-emerald-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đang áp dụng ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('INACTIVE');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white text-amber-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tạm ngưng ({inactiveCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('EXPIRED');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'EXPIRED'
                    ? 'bg-white text-rose-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hết hạn ({expiredCount})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Hiển thị <strong>{filteredPromos.length}</strong> / {promos.length} voucher
          </div>
        </div>

        {loadError && (
          <div className="mx-3.5 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-700 shrink-0">
            <span className="font-medium">{loadError}</span>
            <Button type="button" variant="outline" size="sm" onClick={fetchPromotions}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Loading / Empty / Table View */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12 px-4 text-center text-slate-500">
            <span className="text-xs font-medium">Đang tải danh sách mã khuyến mãi...</span>
          </div>
        ) : filteredPromos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm font-semibold text-slate-700">Không tìm thấy mã khuyến mãi nào</p>
            <p className="text-xs text-slate-400 mt-1">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto no-scrollbar">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-500 uppercase tracking-wider shadow-2xs">
                  <th className="py-2.5 px-3 bg-slate-50/95">Mã Voucher</th>
                  <th className="py-2.5 px-3 bg-slate-50/95">Chương trình & Mức giảm</th>
                  <th className="py-2.5 px-3 bg-slate-50/95">Điều kiện tối thiểu</th>
                  <th className="py-2.5 px-3 bg-slate-50/95">Hạn sử dụng</th>
                  <th className="py-2.5 px-3 bg-slate-50/95">Lượt sử dụng</th>
                  <th className="py-2.5 px-3 bg-slate-50/95">Trạng thái</th>
                  <th className="py-2.5 px-3 bg-slate-50/95 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPromos.map((p) => {
                  const percentUsed = Math.min(100, Math.round((p.usedCount / p.maxUsage) * 100));
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition group">
                      {/* Code */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                            {p.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(p.code)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                              copied === p.code
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                            title="Sao chép mã"
                          >
                            {copied === p.code ? 'Đã chép' : 'Sao chép'}
                          </button>
                        </div>
                      </td>

                      {/* Title & Discount */}
                      <td className="py-2.5 px-3 max-w-[240px]">
                        <div className="font-bold text-slate-900 truncate" title={p.title}>{p.title}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {p.type === 'SHIPPING' || p.code.toUpperCase().startsWith('FREESHIP') || p.code.toUpperCase().startsWith('SHIP') ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                              Vận chuyển
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                              Đơn hàng
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-emerald-600">
                            {p.discount}
                          </span>
                        </div>
                      </td>

                      {/* Min Order */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium text-xs">
                        {p.minOrder}
                      </td>

                      {/* Expiry */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-xs text-slate-600">
                        <div>{p.expiry || 'Không giới hạn'}</div>
                        {p.startDate && (
                          <div className="text-[10px] text-slate-400">Từ {p.startDate}</div>
                        )}
                      </td>

                      {/* Usage progress */}
                      <td className="py-2.5 px-3 whitespace-nowrap min-w-[120px]">
                        <div className="flex items-center justify-between text-[10px] font-medium text-slate-700 mb-0.5">
                          <span>{p.usedCount} / {p.maxUsage}</span>
                          <span className="text-slate-400 font-bold">{percentUsed}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              percentUsed >= 100
                                ? 'bg-rose-500'
                                : percentUsed > 70
                                ? 'bg-amber-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${percentUsed}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {(() => {
                          const expired = isPromoExpired(p, todayIso);
                          const notStarted = isPromoNotStarted(p, todayIso);
                          const label = expired
                            ? 'Hết hạn'
                            : p.status === 'INACTIVE'
                            ? 'Tạm ngưng'
                            : notStarted
                            ? 'Chưa mở'
                            : 'Đang áp dụng';
                          const cls = expired
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : p.status === 'INACTIVE'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : notStarted
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(p)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                            title="Xem chi tiết voucher"
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                              p.status === 'INACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title={p.status === 'INACTIVE' ? 'Kích hoạt voucher' : 'Tạm ngưng voucher'}
                          >
                            {p.status === 'INACTIVE' ? 'Kích hoạt' : 'Tạm ngưng'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                            title="Chỉnh sửa voucher"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                            title="Xóa voucher"
                          >
                            Xóa
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

        {/* Pagination Controls - Always pinned at bottom */}
        <div className="shrink-0 bg-white">
          <AdminPagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredPromos.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: THÊM MÃ KHUYẾN MÃI MỚI                          */}
      {/* ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Tạo mã khuyến mãi / Voucher mới
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã Voucher (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: TECHSALE20"
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mức giảm chi tiết *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Giảm 20% (Tối đa 500k)"
                    value={addForm.discount}
                    onChange={(e) => setAddForm({ ...addForm, discount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên chương trình khuyến mãi</label>
                <input
                  type="text"
                  placeholder="VD: Ưu đãi ngày hội công nghệ cuối tháng..."
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Điều kiện tối thiểu</label>
                  <input
                    type="text"
                    placeholder="VD: Đơn từ 1.500.000₫"
                    value={addForm.minOrder}
                    onChange={(e) => setAddForm({ ...addForm, minOrder: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giảm tối đa (VNĐ - tuỳ chọn)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 500000"
                    value={addForm.maxDiscountAmount}
                    onChange={(e) => setAddForm({ ...addForm, maxDiscountAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ngày bắt đầu (tuỳ chọn)</label>
                  <input
                    type="date"
                    value={addForm.startDate}
                    onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ngày hết hạn (HSD) *</label>
                  <input
                    type="date"
                    required
                    value={addForm.expiry}
                    onChange={(e) => setAddForm({ ...addForm, expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Loại ưu đãi</label>
                  <select
                    value={addForm.type}
                    onChange={(e) => setAddForm({ ...addForm, type: e.target.value as 'ORDER' | 'SHIPPING' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-blue-700"
                  >
                    <option value="ORDER">Giảm giá tiền hàng</option>
                    <option value="SHIPPING">Miễn / Giảm phí ship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giới hạn số lượt dùng</label>
                  <input
                    type="number"
                    min="1"
                    value={addForm.maxUsage}
                    onChange={(e) => setAddForm({ ...addForm, maxUsage: Number(e.target.value) || 100 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Trạng thái</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                  >
                    <option value="ACTIVE">Đang áp dụng</option>
                    <option value="INACTIVE">Tạm ngưng</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu voucher
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CHỈNH SỬA VOUCHER (SỬA)                         */}
      {/* ======================================================== */}
      {editingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Chỉnh sửa Voucher {editingPromo.code}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPromo(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã Voucher (Code) *</label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mức giảm chi tiết *</label>
                  <input
                    type="text"
                    required
                    value={editForm.discount}
                    onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên chương trình</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Điều kiện tối thiểu</label>
                  <input
                    type="text"
                    value={editForm.minOrder}
                    onChange={(e) => setEditForm({ ...editForm, minOrder: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giảm tối đa (VNĐ - tuỳ chọn)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 500000"
                    value={editForm.maxDiscountAmount}
                    onChange={(e) => setEditForm({ ...editForm, maxDiscountAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ngày bắt đầu (tuỳ chọn)</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ngày hết hạn (HSD) *</label>
                  <input
                    type="date"
                    required
                    value={editForm.expiry}
                    onChange={(e) => setEditForm({ ...editForm, expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Loại ưu đãi</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'ORDER' | 'SHIPPING' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-blue-700"
                  >
                    <option value="ORDER">Giảm giá tiền hàng</option>
                    <option value="SHIPPING">Miễn / Giảm phí ship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giới hạn số lượt dùng</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.maxUsage}
                    onChange={(e) => setEditForm({ ...editForm, maxUsage: Number(e.target.value) || 100 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Trạng thái</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                  >
                    <option value="ACTIVE">Đang áp dụng</option>
                    <option value="INACTIVE">Tạm ngưng</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingPromo(null)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CHI TIẾT MÃ KHUYẾN MÃI (XEM)                    */}
      {/* ======================================================== */}
      {detailPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Chi tiết Voucher {detailPromo.code}</h3>
                {isDetailLoading && <p className="text-[11px] text-slate-400">Đang đồng bộ dữ liệu mới nhất...</p>}
              </div>
              <button
                type="button"
                onClick={() => setDetailPromo(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Mã code</span>
                <span className="font-mono font-bold text-blue-700 text-sm">{detailPromo.code}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Loại ưu đãi</span>
                <span className="font-bold text-slate-800">{detailPromo.type === 'SHIPPING' ? 'Miễn / Giảm phí ship' : 'Giảm giá tiền hàng'}</span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Chương trình</span>
                <span className="font-semibold text-slate-900">{detailPromo.title}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Mức giảm</span>
                <span className="font-bold text-emerald-700">{detailPromo.discount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Giảm tối đa</span>
                <span className="font-bold text-slate-800">
                  {detailPromo.maxDiscountAmount != null ? `${Number(detailPromo.maxDiscountAmount).toLocaleString('vi-VN')}₫` : 'Không giới hạn'}
                </span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Điều kiện áp dụng</span>
                <span className="font-medium text-slate-800">{detailPromo.minOrder || 'Mọi đơn hàng'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Ngày bắt đầu</span>
                <span className="font-medium text-slate-800">{detailPromo.startDate || 'Áp dụng ngay'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Hạn sử dụng</span>
                <span className="font-medium text-slate-800">{detailPromo.expiry || 'Không giới hạn'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Lượt đã sử dụng</span>
                <span className="font-bold text-slate-900">{detailPromo.usedCount} / {detailPromo.maxUsage}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Trạng thái</span>
                <span className="font-bold text-slate-900">
                  {isPromoExpired(detailPromo, todayIso)
                    ? 'Hết hạn'
                    : detailPromo.status === 'INACTIVE'
                    ? 'Tạm ngưng'
                    : 'Đang áp dụng'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailPromo(null)}>
                Đóng
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  const target = detailPromo;
                  setDetailPromo(null);
                  handleOpenEdit(target);
                }}
              >
                Chỉnh sửa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: XÁC NHẬN XÓA VOUCHER (XÓA)                      */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 font-sans text-center">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Xóa Voucher {deleteTarget.code}?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hành động này sẽ xóa hoàn toàn mã voucher khỏi hệ thống áp dụng khuyến mãi.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
                onClick={handleDeleteConfirm}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromotionsPage;
