import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Mail,
  Phone,
  ExternalLink,
  X,
  UserCheck,
  UserX,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Edit,
  Trash2,
  User,
} from 'lucide-react';
import { formatPrice } from '../../utils/format';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import { userService, type AdminUser } from '../../api/services/user.service';
import AdminPagination from '../../components/admin/AdminPagination';

const ITEMS_PER_PAGE = 10;

export const AdminCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  
  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<AdminUser | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Form states
  const [addForm, setAddForm] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: 'password123',
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    status: true,
  });

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await userService.getAdminUsers();
      // Loại bỏ tài khoản admin ra khỏi danh sách khách hàng nếu có
      const customerList = data.filter((u) => u.role !== 'ADMIN');
      setCustomers(customerList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách khách hàng từ cơ sở dữ liệu';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    setUpdatingId(id);
    const newStatus = !currentStatus;
    try {
      const updated = await userService.updateUserStatus(id, newStatus);
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: updated.status } : c))
      );
      if (selectedCustomer && selectedCustomer.id === id) {
        setSelectedCustomer((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
      showToast(newStatus ? 'Đã kích hoạt lại tài khoản thành công!' : 'Đã khóa tài khoản người dùng thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái người dùng';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Add customer
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.fullName.trim() || !addForm.username.trim() || !addForm.email.trim()) {
      showToast('Vui lòng điền đầy đủ họ tên, tên đăng nhập và email', 'error');
      return;
    }

    try {
      const created = await userService.createAdminUser({
        fullName: addForm.fullName.trim(),
        username: addForm.username.trim(),
        email: addForm.email.trim(),
        phoneNumber: addForm.phoneNumber.trim() || undefined,
        address: addForm.address.trim() || undefined,
        password: addForm.password || '123123123',
        status: true,
      });

      setCustomers([created, ...customers]);
      setIsAddOpen(false);
      setAddForm({
        fullName: '',
        username: '',
        email: '',
        phoneNumber: '',
        address: '',
        password: 'password123',
      });
      showToast(`Đã thêm khách hàng mới "${created.fullName}" vào Database thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể thêm khách hàng mới';
      showToast(msg, 'error');
    }
  };

  // Open edit
  const handleOpenEdit = (c: AdminUser) => {
    setEditingCustomer(c);
    setEditForm({
      fullName: c.fullName || '',
      email: c.email || '',
      phoneNumber: c.phoneNumber || '',
      address: c.address || '',
      status: c.status,
    });
  };

  // Edit submit
  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      const updated = await userService.updateAdminUser(editingCustomer.id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        address: editForm.address.trim(),
        status: editForm.status,
      });

      setCustomers((prev) =>
        prev.map((c) => (c.id === editingCustomer.id ? { ...c, ...updated } : c))
      );

      if (selectedCustomer?.id === editingCustomer.id) {
        setSelectedCustomer((prev) => (prev ? { ...prev, ...updated } : null));
      }

      showToast(`Đã cập nhật thông tin khách hàng "${updated.fullName}" thành công!`);
      setEditingCustomer(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật thông tin khách hàng';
      showToast(msg, 'error');
    }
  };

  // Delete submit
  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;

    try {
      await userService.deleteAdminUser(deleteTarget.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (selectedCustomer?.id === deleteTarget.id) setSelectedCustomer(null);
      showToast(`Đã xóa khách hàng "${deleteTarget.fullName}" khỏi hệ thống!`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa khách hàng';
      showToast(msg, 'error');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (statusFilter === 'ACTIVE' && !c.status) return false;
    if (statusFilter === 'BLOCKED' && c.status) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.fullName?.toLowerCase().includes(q) || false;
      const matchEmail = c.email?.toLowerCase().includes(q) || false;
      const matchPhone = c.phoneNumber?.includes(q) || false;
      const matchUsername = c.username?.toLowerCase().includes(q) || false;
      return matchName || matchEmail || matchPhone || matchUsername;
    }
    return true;
  });

  const activeCount = customers.filter((c) => c.status).length;
  const blockedCount = customers.filter((c) => !c.status).length;
  const totalSpentAll = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-[9999] text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-md pointer-events-auto border backdrop-blur-md transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-slate-900/95 border-slate-700'
              : 'bg-rose-600/95 border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-white shrink-0" />
          )}
          <span className="font-medium flex-1">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white transition cursor-pointer shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Quản lý khách hàng</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {customers.length} người dùng
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tra cứu thông tin cá nhân, lịch sử tiêu dùng và phân quyền tài khoản người mua
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchCustomers}
            disabled={isLoading}
            className="p-2 sm:p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs flex items-center gap-2 text-xs font-semibold"
            title="Làm mới dữ liệu từ MySQL"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddOpen(true)}
          >
            Thêm khách hàng
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tổng khách hàng</span>
          <span className="text-lg font-bold text-slate-900">{customers.length}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Đang hoạt động</span>
          <span className="text-lg font-bold text-emerald-600">{activeCount}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Bị tạm khóa</span>
          <span className="text-lg font-bold text-rose-600">{blockedCount}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tổng doanh số mua</span>
          <span className="text-lg font-bold text-blue-600">{formatPrice(totalSpentAll)}</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Search & Filter Toolbar */}
        <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-xl">
            <div className="w-full sm:w-72">
              <Input
                type="text"
                placeholder="Tìm tên, email, sđt, username..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            {/* Status Filter Tabs */}
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
                Tất cả ({customers.length})
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
                Hoạt động ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('BLOCKED');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'BLOCKED'
                    ? 'bg-white text-rose-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tạm khóa ({blockedCount})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Hiển thị <strong>{filteredCustomers.length}</strong> / {customers.length} khách hàng
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Đang tải dữ liệu khách hàng từ MySQL Database...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Không tìm thấy khách hàng nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto no-scrollbar">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-500 uppercase tracking-wider shadow-2xs">
                  <th className="py-2.5 px-3 bg-slate-50/95">Khách hàng</th>
                  <th className="py-2.5 px-3 bg-slate-50/95">Liên hệ</th>
                  <th className="py-2.5 px-3 bg-slate-50/95">Địa chỉ</th>
                  <th className="py-2.5 px-3 bg-slate-50/95 text-center">Đơn hàng</th>
                  <th className="py-2.5 px-3 bg-slate-50/95">Tổng chi tiêu</th>
                  <th className="py-2.5 px-3 bg-slate-50/95">Trạng thái</th>
                  <th className="py-2.5 px-3 bg-slate-50/95 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition group">
                    {/* Customer Info */}
                    <td className="py-2 px-3 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <img
                          src={c.avatarUrl}
                          alt={c.fullName}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition block truncate text-xs">
                            {c.fullName}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            @{c.username}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-700 text-xs">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{c.phoneNumber || 'Chưa có SĐT'}</span>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-2 px-3 max-w-[180px] truncate" title={c.address}>
                      <span className="text-slate-600 truncate block text-xs">{c.address || 'Chưa cập nhật'}</span>
                    </td>

                    {/* Orders Count */}
                    <td className="py-2 px-3 text-center whitespace-nowrap font-bold text-slate-900 text-xs">
                      {c.ordersCount} đơn
                    </td>

                    {/* Total Spent */}
                    <td className="py-2 px-3 whitespace-nowrap font-bold text-blue-600 text-xs">
                      {formatPrice(c.totalSpent)}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{c.status ? 'Hoạt động' : 'Tạm khóa'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(c)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === c.id}
                          onClick={() => toggleStatus(c.id, c.status)}
                          className={`p-1 rounded transition cursor-pointer disabled:opacity-50 ${
                            c.status
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={c.status ? 'Khóa tài khoản này' : 'Kích hoạt lại tài khoản'}
                        >
                          {updatingId === c.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                          ) : c.status ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls - 10 rows per page - Pinned to bottom */}
        {!isLoading && filteredCustomers.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-white">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCustomers.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: THÊM KHÁCH HÀNG MỚI                             */}
      {/* ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>Thêm khách hàng mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={addForm.fullName}
                    onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tên đăng nhập (Username) *</label>
                  <input
                    type="text"
                    required
                    placeholder="nguyenvana"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0912 345 678"
                    value={addForm.phoneNumber}
                    onChange={(e) => setAddForm({ ...addForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Địa chỉ thường trú</label>
                <input
                  type="text"
                  placeholder="Quận Cầu Giấy, Hà Nội..."
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mật khẩu mặc định</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu khách hàng
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CHỈNH SỬA THÔNG TIN KHÁCH HÀNG (SỬA)            */}
      {/* ======================================================== */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                <span>Chỉnh sửa thông tin khách hàng</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCustomerSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Trạng thái tài khoản</label>
                <select
                  value={editForm.status ? 'ACTIVE' : 'BLOCKED'}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value === 'ACTIVE' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                >
                  <option value="ACTIVE">Hoạt động bình thường</option>
                  <option value="BLOCKED">Tạm khóa tài khoản</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingCustomer(null)}>
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
      {/* MODAL 3: XÁC NHẬN XÓA KHÁCH HÀNG (XÓA)                   */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4 font-sans text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xóa khách hàng này?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa tài khoản của <strong>{deleteTarget.fullName}</strong> (@{deleteTarget.username})?
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
                onClick={handleDeleteCustomer}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: XEM HỒ SƠ CHI TIẾT KHÁCH HÀNG                   */}
      {/* ======================================================== */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Hồ sơ khách hàng</h3>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3.5">
              <img
                src={selectedCustomer.avatarUrl}
                alt={selectedCustomer.fullName}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-100"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{selectedCustomer.fullName}</h4>
                <p className="text-xs text-slate-500">@{selectedCustomer.username} • {selectedCustomer.email}</p>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded mt-1 border ${
                    selectedCustomer.status
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {selectedCustomer.status ? 'Đang hoạt động' : 'Đang bị khóa'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Mã khách hàng:</span>
                <span className="font-bold text-slate-800">#CUST-{selectedCustomer.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Số điện thoại:</span>
                <span className="font-semibold text-slate-800">{selectedCustomer.phoneNumber || 'Chưa cung cấp'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Địa chỉ giao hàng:</span>
                <span className="font-semibold text-slate-800 truncate max-w-56">{selectedCustomer.address || 'Chưa cung cấp'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Tổng số đơn hàng:</span>
                <span className="font-bold text-blue-600">{selectedCustomer.ordersCount} đơn</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Tổng chi tiêu:</span>
                <span className="font-bold text-emerald-600">{formatPrice(selectedCustomer.totalSpent)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="dark" size="sm" onClick={() => setSelectedCustomer(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomersPage;
