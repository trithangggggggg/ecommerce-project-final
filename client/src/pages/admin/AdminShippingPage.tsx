import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Star,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';
import { shippingService } from '../../api/services/shipping.service';

export interface ShippingCarrier {
  id: number;
  code: string;
  name: string;
  serviceType: string;
  hotline: string;
  activeOrders: number;
  rating: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const ITEMS_PER_PAGE = 10;

export const AdminShippingPage: React.FC = () => {
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCarriers = async () => {
    setIsLoading(true);
    try {
      const data = await shippingService.getCarriers();
      setCarriers(data);
    } catch {
      setCarriers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCarriers();
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<ShippingCarrier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShippingCarrier | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    code: '',
    name: '',
    serviceType: '',
    hotline: '',
    rating: 5.0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    serviceType: '',
    hotline: '',
    rating: 5.0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.code.trim()) {
      showToast('Vui lòng nhập tên đối tác và mã dịch vụ!');
      return;
    }

    try {
      const newCarrier = await shippingService.createCarrier({
        code: addForm.code.trim().toUpperCase(),
        name: addForm.name.trim(),
        serviceType: addForm.serviceType.trim() || 'Chuyển phát nhanh',
        hotline: addForm.hotline.trim() || '1900 0000',
        activeOrders: 0,
        rating: Number(addForm.rating) || 5.0,
        status: addForm.status,
      });

      setCarriers((prev) => [newCarrier, ...prev]);
      setIsAddOpen(false);
      setAddForm({
        code: '',
        name: '',
        serviceType: '',
        hotline: '',
        rating: 5.0,
        status: 'ACTIVE',
      });
      showToast(`Đã thêm đối tác vận chuyển "${newCarrier.name}" vào Database!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo đối tác vận chuyển';
      showToast(msg);
    }
  };

  // Open edit
  const handleOpenEdit = (c: ShippingCarrier) => {
    setEditingCarrier(c);
    setEditForm({
      code: c.code,
      name: c.name,
      serviceType: c.serviceType,
      hotline: c.hotline,
      rating: c.rating,
      status: c.status,
    });
  };

  // Edit submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCarrier) return;

    try {
      const updated = await shippingService.updateCarrier(editingCarrier.id, {
        code: editForm.code.trim().toUpperCase(),
        name: editForm.name.trim(),
        serviceType: editForm.serviceType.trim(),
        hotline: editForm.hotline.trim(),
        rating: Number(editForm.rating) || 5.0,
        status: editForm.status,
      });

      setCarriers((prev) =>
        prev.map((item) => (item.id === editingCarrier.id ? updated : item))
      );

      showToast(`Đã cập nhật đối tác "${updated.name}" thành công!`);
      setEditingCarrier(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật đối tác vận chuyển';
      showToast(msg);
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await shippingService.deleteCarrier(deleteTarget.id);
      setCarriers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      showToast(`Đã xóa đối tác vận chuyển "${deleteTarget.name}" khỏi Database!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xóa đối tác vận chuyển';
      showToast(msg);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filter
  const filteredCarriers = carriers.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = c.code.toLowerCase().includes(q);
      const matchName = c.name.toLowerCase().includes(q);
      const matchService = c.serviceType.toLowerCase().includes(q);
      const matchPhone = c.hotline.includes(q);
      return matchCode || matchName || matchService || matchPhone;
    }
    return true;
  });

  const activeCount = carriers.filter((c) => c.status === 'ACTIVE').length;
  const inactiveCount = carriers.filter((c) => c.status === 'INACTIVE').length;
  const totalActiveOrders = carriers.reduce((sum, c) => sum + c.activeOrders, 0);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCarriers.length / ITEMS_PER_PAGE) || 1;
  const paginatedCarriers = filteredCarriers.slice(
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
            <Truck className="w-6 h-6 text-blue-600" />
            <span>Đối tác & Dịch vụ vận chuyển</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {carriers.length} đối tác
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị các đơn vị giao hàng, cấu hình API liên kết và theo dõi hiệu suất giao vận
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={fetchCarriers}
          >
            Làm mới
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddOpen(true)}
          >
            Thêm đối tác
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tổng đơn vị</span>
          <span className="text-lg font-bold text-slate-900">{carriers.length}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Đang kết nối</span>
          <span className="text-lg font-bold text-emerald-600">{activeCount}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Đơn đang luân chuyển</span>
          <span className="text-lg font-bold text-blue-600">{totalActiveOrders} đơn</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tạm dừng kết nối</span>
          <span className="text-lg font-bold text-slate-500">{inactiveCount}</span>
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
                placeholder="Tìm mã đối tác, tên hãng, hotline..."
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
                Tất cả ({carriers.length})
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
                Đang kết nối ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('INACTIVE');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white text-rose-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tạm ngưng ({inactiveCount})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Hiển thị <strong>{filteredCarriers.length}</strong> / {carriers.length} đối tác
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-500 uppercase tracking-wider shadow-2xs">
                <th className="py-2.5 px-3 bg-slate-50/95">Mã đối tác</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Đơn vị vận chuyển</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Dịch vụ</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Hotline</th>
                <th className="py-2.5 px-3 bg-slate-50/95 text-center">Đơn đang giao</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Đánh giá</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Trạng thái</th>
                <th className="py-2.5 px-3 bg-slate-50/95 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCarriers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy đối tác vận chuyển nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedCarriers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition group">
                    {/* Code */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-xs">
                        {c.code}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-2 px-3 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate" title={c.name}>
                          {c.name}
                        </span>
                      </div>
                    </td>

                    {/* Service */}
                    <td className="py-2 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {c.serviceType}
                    </td>

                    {/* Hotline */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.hotline}</span>
                      </div>
                    </td>

                    {/* Active orders */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200 text-[11px]">
                        {c.activeOrders} đơn
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{c.rating.toFixed(1)}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{c.status === 'ACTIVE' ? 'Đang kết nối' : 'Tạm ngưng'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                          title="Chỉnh sửa thông tin đối tác"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Xóa đối tác"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - 10 rows per page - Pinned to bottom */}
        {filteredCarriers.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-white">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCarriers.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: THÊM ĐỐI TÁC VẬN CHUYỂN MỚI                     */}
      {/* ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span>Thêm đối tác vận chuyển mới</span>
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
                  <label className="block text-slate-700 font-semibold mb-1">Mã đối tác (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: FAST-EXPRESS"
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tên đơn vị vận chuyển *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kerry Express Việt Nam"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Loại hình dịch vụ giao nhận</label>
                <input
                  type="text"
                  placeholder="VD: Chuyển phát hỏa tốc, Tiết kiệm liên tỉnh..."
                  value={addForm.serviceType}
                  onChange={(e) => setAddForm({ ...addForm, serviceType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hotline CSKH</label>
                  <input
                    type="text"
                    placeholder="1900 1234"
                    value={addForm.hotline}
                    onChange={(e) => setAddForm({ ...addForm, hotline: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Trạng thái kết nối</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                  >
                    <option value="ACTIVE">Đang kết nối</option>
                    <option value="INACTIVE">Tạm ngưng</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu đối tác
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CHỈNH SỬA ĐỐI TÁC VẬN CHUYỂN (SỬA)              */}
      {/* ======================================================== */}
      {editingCarrier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                <span>Chỉnh sửa đối tác {editingCarrier.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCarrier(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã đối tác (Code) *</label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tên đơn vị vận chuyển *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Loại hình dịch vụ</label>
                <input
                  type="text"
                  value={editForm.serviceType}
                  onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hotline CSKH</label>
                  <input
                    type="text"
                    value={editForm.hotline}
                    onChange={(e) => setEditForm({ ...editForm, hotline: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Trạng thái kết nối</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                  >
                    <option value="ACTIVE">Đang kết nối</option>
                    <option value="INACTIVE">Tạm ngưng</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingCarrier(null)}>
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
      {/* MODAL 3: XÁC NHẬN XÓA ĐỐI TÁC                            */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4 font-sans text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xóa đối tác này?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn ngắt kết nối và xóa <strong>{deleteTarget.name}</strong> khỏi hệ thống?
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

export default AdminShippingPage;
