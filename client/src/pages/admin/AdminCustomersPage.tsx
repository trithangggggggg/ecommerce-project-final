import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Mail,
  Phone,
  ExternalLink,
  X,
  UserCheck,
  UserX,
} from 'lucide-react';
import { formatPrice } from '../../utils/format';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

interface Customer {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  ordersCount: number;
  totalSpent: number;
  status: 'ACTIVE' | 'BLOCKED';
  createdAt: string;
  avatarUrl?: string;
}

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 1,
    fullName: 'Nguyễn Văn Minh',
    email: 'minh.nguyen@gmail.com',
    phone: '0912 345 678',
    address: 'Tòa Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM',
    ordersCount: 8,
    totalSpent: 68450000,
    status: 'ACTIVE',
    createdAt: '15/01/2025',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
  },
  {
    id: 2,
    fullName: 'Trần Thị Mai',
    email: 'mai.tran@outlook.com',
    phone: '0987 654 321',
    address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    ordersCount: 5,
    totalSpent: 42300000,
    status: 'ACTIVE',
    createdAt: '02/02/2025',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
  },
  {
    id: 3,
    fullName: 'Lê Hoàng Nam',
    email: 'nam.lehoang@company.vn',
    phone: '0905 123 456',
    address: '88 Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng',
    ordersCount: 3,
    totalSpent: 18990000,
    status: 'ACTIVE',
    createdAt: '10/03/2025',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100',
  },
  {
    id: 4,
    fullName: 'Phạm Quỳnh Anh',
    email: 'quynhanh.pham@yahoo.com',
    phone: '0933 888 999',
    address: '239 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    ordersCount: 6,
    totalSpent: 28500000,
    status: 'ACTIVE',
    createdAt: '18/03/2025',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
  },
  {
    id: 5,
    fullName: 'Đỗ Đức Thắng',
    email: 'thang.dox@gmail.com',
    phone: '0977 112 233',
    address: '15 Trần Phú, Lương Khánh Thiện, Ngô Quyền, Hải Phòng',
    ordersCount: 2,
    totalSpent: 12500000,
    status: 'ACTIVE',
    createdAt: '25/04/2025',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
  },
  {
    id: 6,
    fullName: 'Hoàng Kim Ngân',
    email: 'ngan.hoang@gmail.com',
    phone: '0966 554 433',
    address: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    ordersCount: 1,
    totalSpent: 4200000,
    status: 'BLOCKED',
    createdAt: '01/05/2025',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
  },
];

export const AdminCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const toggleStatus = (id: number) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' } : c
      )
    );
  };

  const filteredCustomers = customers.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.fullName.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      return matchName || matchEmail || matchPhone;
    }
    return true;
  });

  const activeCount = customers.filter((c) => c.status === 'ACTIVE').length;
  const blockedCount = customers.filter((c) => c.status === 'BLOCKED').length;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-0.5">Quản lý bán hàng</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Danh sách khách hàng</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {customers.length} tài khoản
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị hồ sơ tài khoản khách hàng, lịch sử mua sắm và trạng thái hoạt động
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCustomers(MOCK_CUSTOMERS)}
          className="p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Tổng người dùng</span>
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
            {formatPrice(customers.reduce((s, c) => s + c.totalSpent, 0))}
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
                placeholder="Tìm họ tên, email, số điện thoại..."
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Liên hệ</th>
                <th className="py-3 px-4">Địa chỉ</th>
                <th className="py-3 px-4">Đơn hàng</th>
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
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition block truncate">
                          {c.fullName}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          Gia nhập: {c.createdAt}
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
                      <span>{c.phone}</span>
                    </div>
                  </td>

                  {/* Address */}
                  <td className="py-3.5 px-4 max-w-xs truncate" title={c.address}>
                    <span className="text-slate-600 truncate block">{c.address}</span>
                  </td>

                  {/* Orders Count */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
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
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{c.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}</span>
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
                        onClick={() => toggleStatus(c.id)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          c.status === 'ACTIVE'
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={c.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Kích hoạt lại'}
                      >
                        {c.status === 'ACTIVE' ? (
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
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
                <p className="text-xs text-slate-500">{selectedCustomer.email}</p>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded mt-1 border ${
                    selectedCustomer.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {selectedCustomer.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đang bị khóa'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Số điện thoại:</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span>Địa chỉ giao hàng:</span>
                <span className="font-semibold text-slate-900 text-right max-w-xs">{selectedCustomer.address}</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng đơn đặt:</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.ordersCount} đơn hàng</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng chi tiêu:</span>
                <span className="font-bold text-blue-600">{formatPrice(selectedCustomer.totalSpent)}</span>
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
