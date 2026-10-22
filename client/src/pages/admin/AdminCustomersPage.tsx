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
} from 'lucide-react';
import { formatPrice } from '../../utils/format';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import { userService, type AdminUser } from '../../api/services/user.service';

export const AdminCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<AdminUser | null>(null);
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

  return (
    <div className="space-y-6 font-sans">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-0.5">Quản trị người dùng</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Danh sách khách hàng</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {customers.length} tài khoản MySQL
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị tài khoản khách hàng thực tế từ cơ sở dữ liệu, lịch sử mua sắm và trạng thái tài khoản
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCustomers}
          disabled={isLoading}
          className="p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Tổng khách hàng</span>
          <span className="text-xl font-bold text-slate-900">{customers.length}</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Đang hoạt động</span>
          <span className="text-xl font-bold text-emerald-600">{activeCount}</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Đang bị khóa</span>
          <span className="text-xl font-bold text-rose-600">{blockedCount}</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Doanh thu tích lũy</span>
          <span className="text-xl font-bold text-blue-600">
            {formatPrice(totalSpentAll)}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-xl">
            <div className="w-full sm:w-80">
              <Input
                type="text"
                placeholder="Tìm họ tên, email, SĐT, username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'BLOCKED')}
              className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="BLOCKED">Đang bị khóa</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Hiển thị <strong>{filteredCustomers.length}</strong> / {customers.length} khách hàng
          </div>
        </div>

        {/* Loading / Table */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Đang tải dữ liệu khách hàng từ MySQL Database...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Không tìm thấy khách hàng nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Liên hệ</th>
                  <th className="py-3 px-4">Địa chỉ</th>
                  <th className="py-3 px-4 text-center">Đơn hàng</th>
                  <th className="py-3 px-4">Tổng chi tiêu</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition group">
                    {/* Customer Info */}
                    <td className="py-3.5 px-4 min-w-56">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.avatarUrl}
                          alt={c.fullName}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition block truncate">
                            {c.fullName}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            @{c.username} • {c.createdAt ? c.createdAt.substring(0, 10) : '2025-01-01'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-44">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{c.phoneNumber || 'Chưa cập nhật SĐT'}</span>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-4 max-w-xs truncate" title={c.address}>
                      <span className="text-slate-600 truncate block">{c.address || 'Chưa cập nhật địa chỉ'}</span>
                    </td>

                    {/* Orders Count */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-slate-900">
                      {c.ordersCount} đơn
                    </td>

                    {/* Total Spent */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-blue-600">
                      {formatPrice(c.totalSpent)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
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
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(c)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === c.id}
                          onClick={() => toggleStatus(c.id, c.status)}
                          className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 ${
                            c.status
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={c.status ? 'Khóa tài khoản này' : 'Kích hoạt lại tài khoản'}
                        >
                          {updatingId === c.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                          ) : c.status ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
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

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Số điện thoại:</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.phoneNumber || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span>Địa chỉ giao hàng:</span>
                <span className="font-semibold text-slate-900 text-right max-w-xs">{selectedCustomer.address || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng đơn đặt:</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.ordersCount} đơn hàng</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng chi tiêu:</span>
                <span className="font-bold text-blue-600">{formatPrice(selectedCustomer.totalSpent)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ngày tham gia:</span>
                <span className="text-slate-500">{selectedCustomer.createdAt || 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
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
