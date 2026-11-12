import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';
import { shippingService } from '../../api/services/shipping.service';
import { formatPrice } from '../../utils/format';

export interface ShippingCarrier {
  id: number;
  code: string;
  name: string;
  serviceType: string;
  estimatedDelivery?: string;
  hotline: string;
  shippingFee: number;
  activeOrders: number;
  rating: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const formatCarrierRating = (rating?: number | null) => {
  const num = Number(rating);
  return (rating != null && Number.isFinite(num) ? num : 5.0).toFixed(1);
};

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
      showToast('Không thể tải danh sách đối tác vận chuyển từ máy chủ.');
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
  const [detailCarrier, setDetailCarrier] = useState<ShippingCarrier | null>(null);
  const [editingCarrier, setEditingCarrier] = useState<ShippingCarrier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShippingCarrier | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    code: '',
    name: '',
    serviceType: '',
    estimatedDelivery: '2 - 3 ngày làm việc',
    hotline: '',
    shippingFee: 30000,
    rating: 5.0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    serviceType: '',
    estimatedDelivery: '2 - 3 ngày làm việc',
    hotline: '',
    shippingFee: 30000,
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
        estimatedDelivery: addForm.estimatedDelivery.trim() || '2 - 3 ngày làm việc',
        hotline: addForm.hotline.trim() || '1900 0000',
        shippingFee: Number(addForm.shippingFee) || 30000,
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
        estimatedDelivery: '2 - 3 ngày làm việc',
        hotline: '',
        shippingFee: 30000,
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
      code: c.code || '',
      name: c.name || '',
      serviceType: c.serviceType || '',
      estimatedDelivery: c.estimatedDelivery || '2 - 3 ngày làm việc',
      hotline: c.hotline || '',
      shippingFee: Number(c.shippingFee) || 30000,
      rating: c.rating != null && Number.isFinite(Number(c.rating)) ? Number(c.rating) : 5.0,
      status: c.status || 'ACTIVE',
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
        estimatedDelivery: editForm.estimatedDelivery.trim() || '2 - 3 ngày làm việc',
        hotline: editForm.hotline.trim(),
        shippingFee: Number(editForm.shippingFee) || 30000,
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
      const matchCode = (c.code || '').toLowerCase().includes(q);
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchService = (c.serviceType || '').toLowerCase().includes(q);
      const matchPhone = (c.hotline || '').includes(q);
      return matchCode || matchName || matchService || matchPhone;
    }
    return true;
  });

  const activeCount = carriers.filter((c) => c.status === 'ACTIVE').length;
  const inactiveCount = carriers.filter((c) => c.status === 'INACTIVE').length;
  const totalActiveOrders = carriers.reduce((sum, c) => sum + Number(c.activeOrders ?? 0), 0);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCarriers.length / ITEMS_PER_PAGE) || 1;
  const paginatedCarriers = filteredCarriers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white text-xs font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Đối tác & Dịch vụ vận chuyển
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
              {carriers.length} đối tác
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
              Đang giao: {totalActiveOrders} đơn
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị các đơn vị giao hàng, cấu hình API liên kết và theo dõi hiệu suất giao vận
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={fetchCarriers}
            disabled={isLoading}
          >
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddOpen(true)}
          >
            Thêm đối tác
          </Button>
        </div>
      </div>

      {/* Main Table Card (Dạng bảng) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            <div className="w-full sm:w-72">
              <Input
                type="text"
                placeholder="Tìm mã đối tác, tên hãng, hotline..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-lg self-start sm:self-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer tabular-nums ${
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
                className={`px-2.5 py-1 rounded-md transition cursor-pointer tabular-nums ${
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
                className={`px-2.5 py-1 rounded-md transition cursor-pointer tabular-nums ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white text-rose-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tạm ngưng ({inactiveCount})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end lg:self-center tabular-nums">
            Hiển thị <strong className="text-slate-800">{filteredCarriers.length}</strong> / {carriers.length} đối tác
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Mã đối tác</th>
                <th className="py-2.5 px-3.5">Đơn vị vận chuyển</th>
                <th className="py-2.5 px-3.5">Dịch vụ</th>
                <th className="py-2.5 px-3.5 text-right">Cước phí</th>
                <th className="py-2.5 px-3.5">Hotline</th>
                <th className="py-2.5 px-3.5 text-center">Đơn đang giao</th>
                <th className="py-2.5 px-3.5 text-center">Đánh giá</th>
                <th className="py-2.5 px-3.5">Trạng thái</th>
                <th className="py-2.5 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCarriers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 px-4 text-center">
                    <p className="text-sm font-semibold text-slate-600">
                      {isLoading
                        ? 'Đang tải danh sách đối tác vận chuyển...'
                        : 'Không tìm thấy đối tác vận chuyển nào phù hợp.'}
                    </p>
                    {!isLoading && (
                      <p className="text-xs text-slate-400 mt-1">
                        Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm, hoặc nhấn "Thêm đối tác".
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCarriers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition group">
                    {/* Code */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs tabular-nums">
                        {c.code}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3.5 max-w-[220px]">
                      <span
                        className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate block"
                        title={c.name}
                      >
                        {c.name}
                      </span>
                    </td>

                    {/* Service */}
                    <td className="py-2.5 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                      <span className="block text-slate-700">{c.serviceType || 'Chuyển phát tiêu chuẩn'}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {c.estimatedDelivery || '2 - 3 ngày làm việc'}
                      </span>
                    </td>

                    {/* Shipping Fee */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <span className="font-bold text-slate-800 text-xs tabular-nums">
                        {formatPrice(Number(c.shippingFee) || 30000)}
                      </span>
                    </td>

                    {/* Hotline */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="text-slate-700 font-medium tabular-nums">{c.hotline || 'Chưa cập nhật'}</span>
                    </td>

                    {/* Active orders */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[11px] tabular-nums">
                        {Number(c.activeOrders ?? 0)} đơn
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span className="font-bold text-amber-600 text-xs tabular-nums">
                        {formatCarrierRating(c.rating)} / 5
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{c.status === 'ACTIVE' ? 'Đang kết nối' : 'Tạm ngưng'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailCarrier(c)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                          title="Xem chi tiết đối tác vận chuyển"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                          title="Chỉnh sửa thông tin đối tác"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                          title="Xóa đối tác"
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

        {/* Pagination Controls - 10 rows per page - Pinned to bottom */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCarriers.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: THÊM ĐỐI TÁC VẬN CHUYỂN MỚI                     */}
      {/* ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl font-sans max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                Thêm đối tác vận chuyển mới
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex-1 min-h-0 flex flex-col text-xs">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Mã đối tác (Code) *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: FAST-EXPRESS"
                      value={addForm.code}
                      onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Loại hình dịch vụ giao nhận</label>
                    <input
                      type="text"
                      placeholder="VD: Chuyển phát hỏa tốc, Tiết kiệm..."
                      value={addForm.serviceType}
                      onChange={(e) => setAddForm({ ...addForm, serviceType: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Cước phí cơ bản (VNĐ) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      required
                      placeholder="30000"
                      value={addForm.shippingFee}
                      onChange={(e) => setAddForm({ ...addForm, shippingFee: Number(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-semibold text-blue-600 tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Hotline CSKH</label>
                    <input
                      type="text"
                      placeholder="1900 1234"
                      value={addForm.hotline}
                      onChange={(e) => setAddForm({ ...addForm, hotline: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Trạng thái kết nối</label>
                    <select
                      value={addForm.status}
                      onChange={(e) => setAddForm({ ...addForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-semibold"
                    >
                      <option value="ACTIVE">Đang kết nối</option>
                      <option value="INACTIVE">Tạm ngưng</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Thời gian giao hàng dự kiến</label>
                  <input
                    type="text"
                    placeholder="VD: 1 - 2 ngày (24h nội thành)"
                    value={addForm.estimatedDelivery}
                    onChange={(e) => setAddForm({ ...addForm, estimatedDelivery: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
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
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl font-sans max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  Chỉnh sửa đối tác {editingCarrier.name}
                </h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{editingCarrier.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCarrier(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 min-h-0 flex flex-col text-xs">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Mã đối tác (Code) *</label>
                    <input
                      type="text"
                      required
                      value={editForm.code}
                      onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Tên đơn vị vận chuyển *</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Loại hình dịch vụ</label>
                    <input
                      type="text"
                      value={editForm.serviceType}
                      onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Cước phí cơ bản (VNĐ) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      required
                      placeholder="30000"
                      value={editForm.shippingFee}
                      onChange={(e) => setEditForm({ ...editForm, shippingFee: Number(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-semibold text-blue-600 tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Hotline CSKH</label>
                    <input
                      type="text"
                      value={editForm.hotline}
                      onChange={(e) => setEditForm({ ...editForm, hotline: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Trạng thái kết nối</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-semibold"
                    >
                      <option value="ACTIVE">Đang kết nối</option>
                      <option value="INACTIVE">Tạm ngưng</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Thời gian giao hàng dự kiến</label>
                  <input
                    type="text"
                    placeholder="VD: 1 - 2 ngày (24h nội thành)"
                    value={editForm.estimatedDelivery}
                    onChange={(e) => setEditForm({ ...editForm, estimatedDelivery: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
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
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl font-sans overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">Xóa đối tác này?</h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn ngắt kết nối và xóa{' '}
                <strong className="text-slate-900">{deleteTarget.name}</strong> ({deleteTarget.code}) khỏi hệ thống?
              </p>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: XEM CHI TIẾT ĐỐI TÁC VẬN CHUYỂN                 */}
      {/* ======================================================== */}
      {detailCarrier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl font-sans overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">{detailCarrier.name}</h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  ID #{detailCarrier.id} · Mã đối tác: {detailCarrier.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailCarrier(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Loại dịch vụ</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {detailCarrier.serviceType || 'Chuyển phát tiêu chuẩn'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Thời gian giao dự kiến</span>
                  <span className="font-bold text-blue-700 mt-0.5 block">
                    {detailCarrier.estimatedDelivery || '2 - 3 ngày làm việc'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Cước phí cơ bản</span>
                  <span className="font-bold text-slate-900 tabular-nums mt-0.5 block">
                    {formatPrice(Number(detailCarrier.shippingFee) || 30000)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Hotline CSKH</span>
                  <span className="font-bold text-slate-800 tabular-nums mt-0.5 block">
                    {detailCarrier.hotline || 'Chưa cập nhật'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Đơn đang giao</span>
                  <span className="font-bold text-blue-700 tabular-nums mt-0.5 block">
                    {Number(detailCarrier.activeOrders ?? 0)} đơn
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Đánh giá dịch vụ</span>
                  <span className="font-bold text-amber-600 tabular-nums mt-0.5 block">
                    {formatCarrierRating(detailCarrier.rating)} / 5.0
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Trạng thái kết nối</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      detailCarrier.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{detailCarrier.status === 'ACTIVE' ? 'Đang kết nối' : 'Tạm ngưng'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDetailCarrier(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const target = detailCarrier;
                  setDetailCarrier(null);
                  handleOpenEdit(target);
                }}
              >
                Chỉnh sửa đối tác
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminShippingPage;
