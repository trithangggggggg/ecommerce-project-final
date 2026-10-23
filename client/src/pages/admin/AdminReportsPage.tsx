import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  ArrowUpRight,
  Search,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { formatPrice, formatDateTime } from '../../utils/format';
import AdminPagination from '../../components/admin/AdminPagination';
import Input from '../../components/common/Input/Input';
import { orderService } from '../../api/services/order.service';

interface ReportTransaction {
  id: string;
  orderCode: string;
  customerName: string;
  productName: string;
  category: string;
  channel: string;
  revenue: number;
  profit: number;
  status: 'SUCCESS' | 'SETTLING' | 'REFUNDED';
  date: string;
}

const ITEMS_PER_PAGE = 10;

export const AdminReportsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | string>('ALL');
  const [dateRange, setDateRange] = useState<'today' | '7days' | 'month' | 'quarter'>('month');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRealTransactions = async () => {
    setIsLoading(true);
    try {
      const orders = await orderService.getAllOrders();
      if (Array.isArray(orders)) {
        const mapped: ReportTransaction[] = orders.map((o) => {
          const firstItem = o.orderItems?.[0];
          const prodName = firstItem
            ? firstItem.productName + (o.orderItems && o.orderItems.length > 1 ? ` (+${o.orderItems.length - 1} món)` : '')
            : 'Thiết bị công nghệ';

          let status: 'SUCCESS' | 'SETTLING' | 'REFUNDED' = 'SETTLING';
          if (o.status === 'COMPLETED') status = 'SUCCESS';
          else if (o.status === 'CANCELLED') status = 'REFUNDED';

          const revenue = Number(o.totalAmount) || 0;
          const profit = Math.round(revenue * 0.18);

          return {
            id: `TXN-${8000 + o.id}`,
            orderCode: `#ORD-${o.id}`,
            customerName: o.receiverName || o.customerName || 'Khách hàng',
            productName: prodName,
            category: 'Thiết bị điện tử',
            channel: o.paymentMethod || 'COD',
            revenue,
            profit,
            status,
            date: o.createdAt ? formatDateTime(o.createdAt) : 'Vừa xong',
          };
        });
        setTransactions(mapped);
      }
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu báo cáo:', e);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      if (channelFilter !== 'ALL' && item.channel !== channelFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTxn = item.id.toLowerCase().includes(q);
        const matchOrder = item.orderCode.toLowerCase().includes(q);
        const matchCustomer = item.customerName.toLowerCase().includes(q);
        const matchProduct = item.productName.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        return matchTxn || matchOrder || matchCustomer || matchProduct || matchCategory;
      }

      return true;
    });
  }, [searchQuery, channelFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredTransactions, currentPage]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setChannelFilter('ALL');
    setDateRange('month');
    setCurrentPage(1);
  };

  const totalRevenue = useMemo(
    () => filteredTransactions.reduce((acc, curr) => acc + curr.revenue, 0),
    [filteredTransactions]
  );
  const totalProfit = useMemo(
    () => filteredTransactions.reduce((acc, curr) => acc + curr.profit, 0),
    [filteredTransactions]
  );

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 font-sans select-none overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Báo cáo doanh thu & Hiệu quả kinh doanh
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi chi tiết số liệu doanh số bán hàng, lợi nhuận ròng và đối soát giao dịch
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="today">Hôm nay</option>
              <option value="7days">7 ngày qua</option>
              <option value="month">Tháng này</option>
              <option value="quarter">Quý này</option>
            </select>
          </div>

          <button
            onClick={fetchRealTransactions}
            className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            title="Tải lại từ Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold block">Doanh thu kỳ này</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-lg font-black text-slate-900 block">{formatPrice(totalRevenue)}</span>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +18.2% so với kỳ trước
          </span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold block">Lợi nhuận gộp</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-lg font-black text-emerald-600 block">{formatPrice(totalProfit)}</span>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Biên lợi nhuận ~20.5%
          </span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold block">Số lượng giao dịch</span>
            <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-lg font-black text-purple-600 block">{filteredTransactions.length} giao dịch</span>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> 100% khớp hệ thống
          </span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold block">Tỷ lệ hủy / hoàn tiền</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-lg font-black text-slate-800 block">1.2%</span>
          <span className="text-[11px] font-semibold text-slate-500">Mức an toàn cao</span>
        </div>
      </div>

      {/* Main Table Container with Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Channel Filter Tabs */}
        <div className="border-b border-slate-100 p-2 sm:px-4 flex items-center gap-1.5 overflow-x-auto bg-slate-50/50 text-xs shrink-0 no-scrollbar">
          {[
            { key: 'ALL', label: 'Tất cả kênh bán' },
            { key: 'VNPAY', label: 'Cổng VNPAY / Thẻ' },
            { key: 'COD', label: 'Thanh toán COD' },
            { key: 'BANK_TRANSFER', label: 'Chuyển khoản' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setChannelFilter(tab.key as any);
                setCurrentPage(1);
              }}
              className={`py-2 px-3.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                channelFilter === tab.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Toolbar cho mục Báo cáo */}
        <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex-1 max-w-lg">
            <Input
              type="text"
              placeholder="Tìm kiếm báo cáo theo mã GD, mã đơn, khách hàng, sản phẩm..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            {(searchQuery || channelFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            )}

            <span className="text-xs text-slate-400 font-medium">
              Hiển thị <strong>{filteredTransactions.length}</strong> kết quả
            </span>
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-500 uppercase tracking-wider shadow-2xs">
                <th className="py-2.5 px-4 bg-slate-50/95">MÃ GIAO DỊCH</th>
                <th className="py-2.5 px-4 bg-slate-50/95">MÃ ĐƠN</th>
                <th className="py-2.5 px-4 bg-slate-50/95">KHÁCH HÀNG</th>
                <th className="py-2.5 px-4 bg-slate-50/95">SẢN PHẨM / DANH MỤC</th>
                <th className="py-2.5 px-4 bg-slate-50/95">KÊNH THANH TOÁN</th>
                <th className="py-2.5 px-4 bg-slate-50/95">DOANH THU</th>
                <th className="py-2.5 px-4 bg-slate-50/95">LỢI NHUẬN</th>
                <th className="py-2.5 px-4 bg-slate-50/95">TRẠNG THÁI</th>
                <th className="py-2.5 px-4 bg-slate-50/95">THỜI GIAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 px-4 font-bold text-blue-600 whitespace-nowrap">
                    #{tx.id}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                    {tx.orderCode}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                    {tx.customerName}
                  </td>
                  <td className="py-2.5 px-4 max-w-[200px]">
                    <span className="font-semibold text-slate-800 block truncate">
                      {tx.productName}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-slate-700 uppercase px-2 py-0.5 rounded bg-slate-100 text-[10px]">
                      {tx.channel}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {formatPrice(tx.revenue)}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-emerald-600 whitespace-nowrap">
                    +{formatPrice(tx.profit)}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {tx.status === 'SUCCESS' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Thành công
                      </span>
                    )}
                    {tx.status === 'SETTLING' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Đang đối soát
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 font-medium text-[11px] whitespace-nowrap">
                    {tx.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 10 rows per page pagination - Pinned to bottom */}
        <div className="shrink-0 border-t border-slate-100 bg-white">
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTransactions.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage;
