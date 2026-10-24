import React, { useState, useEffect } from 'react';
import {
  Percent,
  Plus,
  Search,
  Copy,
  Check,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  Calendar,
  Tag,
  RefreshCw,
} from 'lucide-react';
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
  expiry: string;
  usedCount: number;
  maxUsage: number;
  status: 'ACTIVE' | 'EXPIRED';
}

const ITEMS_PER_PAGE = 10;

export const AdminPromotionsPage: React.FC = () => {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ALL');
  const [copied, setCopied] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const data = await promotionService.getPromotions();
      setPromos(data);
    } catch {
      setPromos([]);
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
  const [deleteTarget, setDeleteTarget] = useState<PromoItem | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    code: '',
    title: '',
    discount: '',
    minOrder: '',
    expiry: '2026-12-31',
    maxUsage: 100,
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED',
  });

  const [editForm, setEditForm] = useState({
    code: '',
    title: '',
    discount: '',
    minOrder: '',
    expiry: '',
    maxUsage: 100,
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED',
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
        expiry: addForm.expiry,
        usedCount: 0,
        maxUsage: Number(addForm.maxUsage) || 100,
        status: addForm.status,
      });

      setPromos((prev) => [newPromo, ...prev]);
      setIsAddOpen(false);
      setAddForm({
        code: '',
        title: '',
        discount: '',
        minOrder: '',
        expiry: '2026-12-31',
        maxUsage: 100,
        status: 'ACTIVE',
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
    setEditForm({
      code: p.code,
      title: p.title,
      discount: p.discount,
      minOrder: p.minOrder,
      expiry: p.expiry,
      maxUsage: p.maxUsage,
      status: p.status,
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
        expiry: editForm.expiry,
        maxUsage: Number(editForm.maxUsage) || 100,
        status: editForm.status,
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

  // Filter
  const filteredPromos = promos.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = p.code.toLowerCase().includes(q);
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchDiscount = p.discount.toLowerCase().includes(q);
      return matchCode || matchTitle || matchDiscount;
    }
    return true;
  });

  const activeCount = promos.filter((p) => p.status === 'ACTIVE').length;
  const expiredCount = promos.filter((p) => p.status === 'EXPIRED').length;
  const totalUsed = promos.reduce((sum, p) => sum + p.usedCount, 0);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPromos.length / ITEMS_PER_PAGE) || 1;
  const paginatedPromos = filteredPromos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Percent className="w-6 h-6 text-blue-600" />
            <span>Quản lý mã khuyến mãi & Voucher</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {promos.length} mã
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập các chương trình ưu đãi, voucher giảm giá và theo dõi hiệu suất chuyển đổi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={fetchPromotions}
          >
            Làm mới
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddOpen(true)}
          >
            Tạo mã mới
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tổng số mã</span>
          <span className="text-lg font-bold text-slate-900">{promos.length}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Đang áp dụng</span>
          <span className="text-lg font-bold text-emerald-600">{activeCount}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Đã hết hạn</span>
          <span className="text-lg font-bold text-rose-600">{expiredCount}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Lượt dùng thành công</span>
          <span className="text-lg font-bold text-blue-600">{totalUsed.toLocaleString()}</span>
        </div>
      </div>

      {/* Main Table Card (Dạng bảng) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Search & Filter Bar */}
        <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-xl">
            <div className="w-full sm:w-72">
              <Input
                type="text"
                placeholder="Tìm mã code, tên chương trình, mức giảm..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
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

        {/* Table View */}
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
              {filteredPromos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy mã khuyến mãi nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedPromos.map((p) => {
                  const percentUsed = Math.min(100, Math.round((p.usedCount / p.maxUsage) * 100));
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition group">
                      {/* Code */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                            {p.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(p.code)}
                            className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Sao chép mã"
                          >
                            {copied === p.code ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Title & Discount */}
                      <td className="py-2 px-3 max-w-[200px]">
                        <div className="font-bold text-slate-900 truncate" title={p.title}>{p.title}</div>
                        <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          <span>{p.discount}</span>
                        </div>
                      </td>

                      {/* Min Order */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 font-medium text-xs">
                        {p.minOrder}
                      </td>

                      {/* Expiry */}
                      <td className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{p.expiry}</span>
                        </div>
                      </td>

                      {/* Usage progress */}
                      <td className="py-2 px-3 whitespace-nowrap min-w-[120px]">
                        <div className="flex items-center justify-between text-[10px] font-medium text-slate-700 mb-0.5">
                          <span>{p.usedCount} / {p.maxUsage}</span>
                          <span className="text-slate-400 font-bold">{percentUsed}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
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
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{p.status === 'ACTIVE' ? 'Đang áp dụng' : 'Hết hạn'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                            title="Chỉnh sửa voucher"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Xóa voucher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - 10 rows per page - Pinned to bottom */}
        {filteredPromos.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-white">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredPromos.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: THÊM MÃ KHUYẾN MÃI MỚI                          */}
      {/* ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-600" />
                <span>Tạo mã khuyến mãi / Voucher mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                  <label className="block text-slate-700 font-semibold mb-1">Ngày hết hạn (HSD)</label>
                  <input
                    type="date"
                    required
                    value={addForm.expiry}
                    onChange={(e) => setAddForm({ ...addForm, expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as 'ACTIVE' | 'EXPIRED' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                  >
                    <option value="ACTIVE">Đang áp dụng</option>
                    <option value="EXPIRED">Đã hết hạn</option>
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
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                <span>Chỉnh sửa Voucher {editingPromo.code}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPromo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                  <label className="block text-slate-700 font-semibold mb-1">Ngày hết hạn (HSD)</label>
                  <input
                    type="date"
                    required
                    value={editForm.expiry}
                    onChange={(e) => setEditForm({ ...editForm, expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'ACTIVE' | 'EXPIRED' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                  >
                    <option value="ACTIVE">Đang áp dụng</option>
                    <option value="EXPIRED">Đã hết hạn</option>
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
      {/* MODAL 3: XÁC NHẬN XÓA VOUCHER (XÓA)                      */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4 font-sans text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xóa Voucher {deleteTarget.code}?</h3>
              <p className="text-xs text-slate-500 mt-1">
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
