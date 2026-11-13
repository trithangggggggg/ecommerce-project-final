import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';
import { supplierService } from '../../api/services/supplier.service';

export interface SupplierItem {
  id: number;
  code: string;
  name: string;
  brand: string;
  contact: string;
  email: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const ITEMS_PER_PAGE = 10;

function truncateText(text?: string | null, maxChars = 18): string {
  if (!text) return '—';
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}...`;
}

export const AdminSuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await supplierService.getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setSuppliers([]);
      setLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách nhà cung cấp từ máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<SupplierItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SupplierItem | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    code: '',
    name: '',
    brand: '',
    contact: '',
    email: '',
    address: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    brand: '',
    contact: '',
    email: '',
    address: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.code.trim() || !addForm.name.trim()) {
      showToast('Vui lòng điền mã và tên nhà cung cấp!');
      return;
    }

    try {
      const newSupplier = await supplierService.createSupplier({
        code: addForm.code.trim().toUpperCase(),
        name: addForm.name.trim(),
        brand: addForm.brand.trim() || 'Đa thương hiệu',
        contact: addForm.contact.trim() || '024 0000 0000',
        email: addForm.email.trim() || 'partner@techsupplier.vn',
        address: addForm.address.trim() || 'Hà Nội, Việt Nam',
        status: addForm.status,
      });

      setSuppliers((prev) => [newSupplier, ...prev]);
      setIsAddOpen(false);
      setAddForm({
        code: '',
        name: '',
        brand: '',
        contact: '',
        email: '',
        address: '',
        status: 'ACTIVE',
      });
      showToast(`Đã thêm nhà cung cấp "${newSupplier.name}" vào Database thành công!`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi thêm nhà cung cấp');
    }
  };

  // Open edit
  const handleOpenEdit = (s: SupplierItem) => {
    setEditingSupplier(s);
    setEditForm({
      code: s.code,
      name: s.name,
      brand: s.brand,
      contact: s.contact,
      email: s.email,
      address: s.address,
      status: s.status,
    });
  };

  // Edit submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    try {
      const updated = await supplierService.updateSupplier(editingSupplier.id, {
        code: editForm.code.trim().toUpperCase(),
        name: editForm.name.trim(),
        brand: editForm.brand.trim(),
        contact: editForm.contact.trim(),
        email: editForm.email.trim(),
        address: editForm.address.trim(),
        status: editForm.status,
      });

      setSuppliers((prev) =>
        prev.map((item) => (item.id === editingSupplier.id ? updated : item))
      );

      showToast(`Đã cập nhật nhà cung cấp "${updated.name}" thành công!`);
      setEditingSupplier(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi cập nhật nhà cung cấp');
    }
  };

  const handleOpenDetail = async (s: SupplierItem) => {
    setDetailSupplier(s);
    setIsDetailLoading(true);
    try {
      const fresh = await supplierService.getSupplierById(s.id);
      setDetailSupplier(fresh);
    } catch {
      // Giữ nguyên dữ liệu hiện có
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleToggleStatus = async (s: SupplierItem) => {
    const nextStatus = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const updated = await supplierService.toggleSupplierStatus(s.id, nextStatus);
      setSuppliers((prev) => prev.map((item) => (item.id === s.id ? updated : item)));
      showToast(`Đã chuyển "${updated.name}" sang ${updated.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm dừng'}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể đổi trạng thái nhà cung cấp');
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await supplierService.deleteSupplier(deleteTarget.id);
      setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToast(`Đã xóa nhà cung cấp "${deleteTarget.name}" khỏi Database!`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi xóa nhà cung cấp');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filter
  const filteredSuppliers = suppliers.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = s.code.toLowerCase().includes(q);
      const matchName = s.name.toLowerCase().includes(q);
      const matchBrand = s.brand.toLowerCase().includes(q);
      const matchContact = s.contact.includes(q);
      const matchEmail = s.email.toLowerCase().includes(q);
      return matchCode || matchName || matchBrand || matchContact || matchEmail;
    }
    return true;
  });

  const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
  const inactiveCount = suppliers.filter((s) => s.status === 'INACTIVE').length;
  const uniqueBrandCount = React.useMemo(() => {
    const brandSet = new Set<string>();
    suppliers.forEach((s) => {
      (s.brand || '')
        .split(/[,/|;]/)
        .map((b) => b.trim().toLowerCase())
        .filter((b) => b && b !== 'đa thương hiệu')
        .forEach((b) => brandSet.add(b));
    });
    return brandSet.size;
  }, [suppliers]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSuppliers = filteredSuppliers.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
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
              Đối tác & Nhà cung cấp thiết bị
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
              {suppliers.length} nhà cung cấp
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
              {uniqueBrandCount} hãng
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách các nhà phân phối ủy quyền, hãng công nghệ chính hãng cung cấp linh kiện và sản phẩm
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={fetchSuppliers}
            disabled={isLoading}
          >
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddOpen(true)}
          >
            Thêm nhà cung cấp
          </Button>
        </div>
      </div>

      {/* Main Table Card (Dạng bảng gọn gàng) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
            <div className="w-full sm:w-72">
              <Input
                type="text"
                placeholder="Tìm tên đối tác, mã NCC..."
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
                Tất cả ({suppliers.length})
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
                Đang hợp tác ({activeCount})
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
                Tạm dừng ({inactiveCount})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end lg:self-center tabular-nums">
            Hiển thị <strong className="text-slate-800">{filteredSuppliers.length}</strong> / {suppliers.length} nhà cung cấp
          </div>
        </div>

        {loadError && (
          <div className="mx-3.5 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-700 shrink-0">
            <span className="font-medium">{loadError}</span>
            <Button type="button" variant="outline" size="sm" onClick={fetchSuppliers}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Table View */}
        <div className="flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Mã NCC</th>
                <th className="py-2.5 px-3">Nhà cung cấp / Doanh nghiệp</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Thương hiệu</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Thông tin liên hệ</th>
                <th className="py-2.5 px-3">Địa chỉ trụ sở</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Trạng thái</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <p className="text-sm font-semibold text-slate-600">
                      {isLoading
                        ? 'Đang tải danh sách nhà cung cấp...'
                        : 'Không tìm thấy nhà cung cấp nào phù hợp.'}
                    </p>
                    {!isLoading && (
                      <p className="text-xs text-slate-400 mt-1">
                        Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm, hoặc nhấn "Thêm nhà cung cấp".
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition group">
                    {/* Code */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs tabular-nums">
                        {s.code}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3 max-w-[230px]">
                      <span
                        className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate block max-w-[230px]"
                        title={s.name}
                      >
                        {s.name}
                      </span>
                    </td>

                    {/* Brand */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                        {s.brand}
                      </span>
                    </td>

                    {/* Contact (Phone + Email) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="text-slate-800 font-medium text-xs tabular-nums">
                        {s.contact}
                      </div>
                      <div className="text-slate-500 text-[11px] truncate max-w-[170px]" title={s.email}>
                        {s.email}
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-2.5 px-3 max-w-[140px]" title={s.address}>
                      <span className="text-slate-600 text-xs truncate block max-w-[140px]">
                        {truncateText(s.address, 18)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{s.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm dừng'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(s)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                          title="Xem chi tiết nhà cung cấp"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap border transition cursor-pointer ${
                            s.status === 'ACTIVE'
                              ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                          title={s.status === 'ACTIVE' ? 'Tạm dừng hợp tác' : 'Kích hoạt hợp tác'}
                        >
                          {s.status === 'ACTIVE' ? 'Tạm dừng' : 'Hợp tác'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                          title="Chỉnh sửa nhà cung cấp"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                          title="Xóa nhà cung cấp"
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

        {/* Pagination Controls - Always pinned to bottom */}
        <div className="shrink-0 bg-white">
          <AdminPagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredSuppliers.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: THÊM NHÀ CUNG CẤP MỚI                           */}
      {/* ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl font-sans max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                Thêm nhà cung cấp / đối tác mới
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
                    <label className="block text-slate-700 font-semibold mb-1">Mã NCC (Code) *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: NCC-ASUS-VN"
                      value={addForm.code}
                      onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Thương hiệu phân phối</label>
                    <input
                      type="text"
                      placeholder="VD: Apple, ASUS, Dell..."
                      value={addForm.brand}
                      onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tên đơn vị / Doanh nghiệp *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Công ty TNHH Phân Phối Synnex FPT..."
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Số điện thoại liên hệ</label>
                    <input
                      type="text"
                      placeholder="024 1234 5678"
                      value={addForm.contact}
                      onChange={(e) => setAddForm({ ...addForm, contact: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Email giao dịch</label>
                    <input
                      type="email"
                      placeholder="partner@supplier.vn"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Địa chỉ trụ sở / Kho chính</label>
                    <input
                      type="text"
                      placeholder="Tòa nhà văn phòng, Đường, Quận, Thành phố..."
                      value={addForm.address}
                      onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Trạng thái hợp tác</label>
                    <select
                      value={addForm.status}
                      onChange={(e) => setAddForm({ ...addForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-semibold"
                    >
                      <option value="ACTIVE">Đang hợp tác phân phối</option>
                      <option value="INACTIVE">Tạm dừng giao dịch</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu nhà cung cấp
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CHỈNH SỬA NHÀ CUNG CẤP (SỬA)                     */}
      {/* ======================================================== */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl font-sans max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  Chỉnh sửa đối tác {editingSupplier.name}
                </h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{editingSupplier.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 min-h-0 flex flex-col text-xs">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Mã NCC (Code) *</label>
                    <input
                      type="text"
                      required
                      value={editForm.code}
                      onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Thương hiệu phân phối</label>
                    <input
                      type="text"
                      value={editForm.brand}
                      onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tên đơn vị / Doanh nghiệp *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Số điện thoại liên hệ</label>
                    <input
                      type="text"
                      value={editForm.contact}
                      onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Email giao dịch</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Địa chỉ trụ sở</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Trạng thái hợp tác</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-semibold"
                    >
                      <option value="ACTIVE">Đang hợp tác phân phối</option>
                      <option value="INACTIVE">Tạm dừng giao dịch</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingSupplier(null)}>
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
      {/* MODAL 3: CHI TIẾT NHÀ CUNG CẤP (XEM)                     */}
      {/* ======================================================== */}
      {detailSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl font-sans overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900">Chi tiết Nhà cung cấp</h3>
                {isDetailLoading && <p className="text-[11px] text-slate-400">Đang đồng bộ dữ liệu...</p>}
              </div>
              <button
                type="button"
                onClick={() => setDetailSupplier(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Mã NCC</span>
                <span className="font-mono font-bold text-blue-700">{detailSupplier.code}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Trạng thái</span>
                <span className="font-bold text-slate-900">
                  {detailSupplier.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm dừng'}
                </span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Tên đối tác / Doanh nghiệp</span>
                <span className="font-bold text-slate-900">{detailSupplier.name}</span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Thương hiệu đại diện</span>
                <span className="font-semibold text-slate-800">{detailSupplier.brand || '—'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Điện thoại / Hotline</span>
                <span className="font-medium text-slate-800">{detailSupplier.contact || '—'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Email liên hệ</span>
                <span className="font-medium text-slate-800 break-all">{detailSupplier.email || '—'}</span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block">Địa chỉ trụ sở / kho</span>
                <span className="font-medium text-slate-800">{detailSupplier.address || '—'}</span>
              </div>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailSupplier(null)}>
                Đóng
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  const target = detailSupplier;
                  setDetailSupplier(null);
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
      {/* MODAL 4: XÁC NHẬN XÓA NHÀ CUNG CẤP                        */}
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
                Bạn có chắc chắn muốn xóa đối tác{' '}
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
    </div>
  );
};

export default AdminSuppliersPage;
