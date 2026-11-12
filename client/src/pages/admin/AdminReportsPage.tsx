import React, { useState, useMemo, useEffect } from 'react';
import { formatPrice, formatDateTime } from '../../utils/format';
import AdminPagination from '../../components/admin/AdminPagination';
import AdminSummaryStrip from '../../components/admin/AdminSummaryStrip';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import { orderService } from '../../api/services/order.service';
import { productService } from '../../api/services/product.service';
import { inventoryService, type ImportReceiptDto } from '../../api/services/inventory.service';
import {
  getPaymentMethodLabel,
  getPaymentStatusMeta,
  type OrderResponse,
} from '../../models/order.model';

interface ReportTransaction {
  id: string;
  orderId: number;
  orderCode: string;
  customerName: string;
  productName: string;
  category: string;
  channel: string;
  channelLabel: string;
  revenue: number;
  cogs: number;
  profit: number;
  costMethodLabel: string;
  status: 'SUCCESS' | 'SETTLING' | 'REFUNDED';
  date: string;
  rawDate: number;
  order: OrderResponse;
}

const ITEMS_PER_PAGE = 10;
const MARGIN_STORAGE_KEY = 'nexor_report_fallback_margin_pct';

export const AdminReportsPage: React.FC = () => {
  const [rawOrders, setRawOrders] = useState<OrderResponse[]>([]);
  const [productCategoryMap, setProductCategoryMap] = useState<Map<number, string>>(new Map());
  const [costMaps, setCostMaps] = useState<{
    byVariant: Map<number, number>;
    bySku: Map<string, number>;
    byProduct: Map<number, number>;
  }>({
    byVariant: new Map(),
    bySku: new Map(),
    byProduct: new Map(),
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | string>('ALL');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | 'month' | 'quarter'>('all');
  const [estimatedMarginPct, setEstimatedMarginPct] = useState<number>(() => {
    const saved = Number(localStorage.getItem(MARGIN_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 && saved < 100 ? saved : 18;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<ReportTransaction | null>(null);

  const handleMarginChange = (val: number) => {
    const clamped = Math.max(1, Math.min(95, Number.isFinite(val) ? val : 18));
    setEstimatedMarginPct(clamped);
    localStorage.setItem(MARGIN_STORAGE_KEY, String(clamped));
  };

  const fetchRealTransactions = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [orders, productsRes, receiptsRes] = await Promise.all([
        orderService.getAllOrders(),
        productService.getAdminProducts({ limit: 200 }).catch(() => ({ data: [] })),
        inventoryService.getReceipts({ limit: 500 }).catch(() => ({ data: [] as ImportReceiptDto[] })),
      ]);

      const prodCatMap = new Map<number, string>();
      if (Array.isArray(productsRes?.data)) {
        productsRes.data.forEach((p) => {
          if (p.id && p.category?.name) {
            prodCatMap.set(p.id, p.category.name);
          }
        });
      }
      setProductCategoryMap(prodCatMap);

      const variantAcc = new Map<number, { cost: number; qty: number }>();
      const skuAcc = new Map<string, { cost: number; qty: number }>();
      const prodAcc = new Map<number, { cost: number; qty: number }>();

      const receipts = Array.isArray(receiptsRes?.data) ? receiptsRes.data : [];
      receipts.forEach((receipt) => {
        (receipt.items || []).forEach((item) => {
          const unitCost = Number(item.unitPrice) || 0;
          const qty = Math.max(1, Number(item.quantity) || 1);
          if (unitCost <= 0) return;

          if (item.variantId) {
            const cur = variantAcc.get(item.variantId) || { cost: 0, qty: 0 };
            variantAcc.set(item.variantId, { cost: cur.cost + unitCost * qty, qty: cur.qty + qty });
          }
          if (item.sku && item.sku.trim()) {
            const key = item.sku.trim().toUpperCase();
            const cur = skuAcc.get(key) || { cost: 0, qty: 0 };
            skuAcc.set(key, { cost: cur.cost + unitCost * qty, qty: cur.qty + qty });
          }
          if (item.productId) {
            const cur = prodAcc.get(item.productId) || { cost: 0, qty: 0 };
            prodAcc.set(item.productId, { cost: cur.cost + unitCost * qty, qty: cur.qty + qty });
          }
        });
      });

      const byVariant = new Map<number, number>();
      variantAcc.forEach((v, k) => byVariant.set(k, Math.round(v.cost / v.qty)));
      const bySku = new Map<string, number>();
      skuAcc.forEach((v, k) => bySku.set(k, Math.round(v.cost / v.qty)));
      const byProduct = new Map<number, number>();
      prodAcc.forEach((v, k) => byProduct.set(k, Math.round(v.cost / v.qty)));

      setCostMaps({ byVariant, bySku, byProduct });
      setRawOrders(Array.isArray(orders) ? orders : []);
    } catch (err: unknown) {
      setRawOrders([]);
      setLoadError(err instanceof Error ? err.message : 'Không thể tải dữ liệu báo cáo từ máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTransactions();
  }, []);

  const transactions = useMemo<ReportTransaction[]>(() => {
    const costRatioFallback = 1 - estimatedMarginPct / 100;
    return rawOrders.map((o) => {
      const items = o.orderItems || [];
      const firstItem = items[0];
      const prodName = firstItem
        ? firstItem.productName + (items.length > 1 ? ` (+${items.length - 1} món)` : '')
        : 'Đơn hàng NEXOR';

      let status: 'SUCCESS' | 'SETTLING' | 'REFUNDED' = 'SETTLING';
      if (o.status === 'COMPLETED') status = 'SUCCESS';
      else if (o.status === 'CANCELLED') status = 'REFUNDED';

      const revenue = Number(o.totalAmount) || 0;
      const shippingFee = Number(o.shippingFee) || 0;

      let cogs = 0;
      let matchedItems = 0;
      if (items.length > 0) {
        items.forEach((item) => {
          const qty = Math.max(1, Number(item.quantity) || 1);
          const skuKey = item.sku?.trim().toUpperCase() || '';
          const unitCost =
            (item.variantId ? costMaps.byVariant.get(item.variantId) : undefined) ??
            (skuKey ? costMaps.bySku.get(skuKey) : undefined) ??
            (item.productId ? costMaps.byProduct.get(item.productId) : undefined);

          if (unitCost && unitCost > 0) {
            matchedItems += 1;
            cogs += unitCost * qty;
          } else {
            const lineSale = Number(item.totalPrice) || (Number(item.price) || 0) * qty;
            cogs += Math.round(lineSale * costRatioFallback);
          }
        });
      } else {
        cogs = Math.round(Math.max(0, revenue - shippingFee) * costRatioFallback);
      }

      const goodsRevenue = Math.max(0, revenue - shippingFee);
      const profit = goodsRevenue - cogs;
      const costMethodLabel =
        items.length > 0 && matchedItems === items.length
          ? 'Giá vốn nhập'
          : matchedItems > 0
          ? 'Nhập + Ước tính'
          : `Biên ${estimatedMarginPct}%`;

      const orderTimestamp = o.createdAt ? new Date(o.createdAt).getTime() : Date.now();
      const categoryName =
        firstItem?.categoryName ||
        (firstItem?.productId ? productCategoryMap.get(firstItem.productId) : undefined) ||
        'Chưa phân loại';
      const channel = o.paymentMethod || 'COD';

      return {
        id: `TXN-${8000 + o.id}`,
        orderId: o.id,
        orderCode: `#ORD-${o.id}`,
        customerName: o.receiverName || o.customerName || 'Khách hàng',
        productName: prodName,
        category: categoryName,
        channel,
        channelLabel: getPaymentMethodLabel(channel),
        revenue,
        cogs,
        profit,
        costMethodLabel,
        status,
        date: o.createdAt ? formatDateTime(o.createdAt) : 'Vừa xong',
        rawDate: isNaN(orderTimestamp) ? Date.now() : orderTimestamp,
        order: o,
      };
    });
  }, [rawOrders, productCategoryMap, costMaps, estimatedMarginPct]);

  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    return transactions.filter((item) => {
      // Bộ lọc thời gian thực tế
      if (dateRange === 'today' && now - item.rawDate > 24 * 60 * 60 * 1000) return false;
      if (dateRange === '7days' && now - item.rawDate > 7 * 24 * 60 * 60 * 1000) return false;
      if (dateRange === 'month' && now - item.rawDate > 30 * 24 * 60 * 60 * 1000) return false;
      if (dateRange === 'quarter' && now - item.rawDate > 90 * 24 * 60 * 60 * 1000) return false;

      // Bộ lọc kênh thanh toán
      if (channelFilter !== 'ALL' && item.channel !== channelFilter) return false;

      // Tìm kiếm từ khóa
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
  }, [transactions, searchQuery, channelFilter, dateRange]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(
      (safePage - 1) * ITEMS_PER_PAGE,
      safePage * ITEMS_PER_PAGE
    );
  }, [filteredTransactions, safePage]);

  const channelTabs = useMemo(() => {
    const knownOrder = ['COD', 'SEPAY', 'VNPAY', 'BANK_TRANSFER', 'ONLINE', 'MOMO'];
    const presentChannels = new Set<string>(knownOrder);
    transactions.forEach((t) => {
      if (t.channel) presentChannels.add(t.channel);
    });
    return [
      { key: 'ALL', label: 'Tất cả kênh bán', count: transactions.length },
      ...Array.from(presentChannels).map((key) => ({
        key,
        label: getPaymentMethodLabel(key),
        count: transactions.filter((t) => t.channel === key).length,
      })),
    ];
  }, [transactions]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setChannelFilter('ALL');
    setDateRange('all');
    setCurrentPage(1);
  };

  // Tính toán số liệu động 100% từ danh sách giao dịch thực tế
  const nonRefunded = useMemo(
    () => filteredTransactions.filter((t) => t.status !== 'REFUNDED'),
    [filteredTransactions]
  );

  const totalRevenue = useMemo(
    () => nonRefunded.reduce((acc, curr) => acc + curr.revenue, 0),
    [nonRefunded]
  );

  const totalProfit = useMemo(
    () => nonRefunded.reduce((acc, curr) => acc + curr.profit, 0),
    [nonRefunded]
  );

  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : estimatedMarginPct.toFixed(1);

  const successCount = useMemo(
    () => filteredTransactions.filter((t) => t.status === 'SUCCESS').length,
    [filteredTransactions]
  );

  const settlingCount = useMemo(
    () => filteredTransactions.filter((t) => t.status === 'SETTLING').length,
    [filteredTransactions]
  );

  const refundCount = useMemo(
    () => filteredTransactions.filter((t) => t.status === 'REFUNDED').length,
    [filteredTransactions]
  );

  const refundRate = filteredTransactions.length > 0
    ? ((refundCount / filteredTransactions.length) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans select-none overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Báo cáo doanh thu & Hiệu quả kinh doanh
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu tổng hợp thời gian thực từ cơ sở dữ liệu MySQL NEXOR
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 font-semibold shadow-2xs">
            <span>Biên dự phòng:</span>
            <input
              type="number"
              min={1}
              max={95}
              value={estimatedMarginPct}
              onChange={(e) => handleMarginChange(Number(e.target.value))}
              className="w-12 text-center font-bold text-slate-900 border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-blue-500"
              aria-label="Phần trăm biên lợi nhuận dự phòng khi chưa có phiếu nhập"
            />
            <span>%</span>
          </label>

          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value as 'all' | 'today' | '7days' | 'month' | 'quarter');
              setCurrentPage(1);
            }}
            aria-label="Khoảng thời gian báo cáo"
            className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">Toàn bộ thời gian</option>
            <option value="today">Hôm nay (24 giờ)</option>
            <option value="7days">7 ngày qua</option>
            <option value="month">30 ngày qua</option>
            <option value="quarter">Quý này (90 ngày)</option>
          </select>

          <button
            type="button"
            onClick={fetchRealTransactions}
            disabled={isLoading}
            className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            title="Tải lại từ Database"
          >
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {/* Compact Overview Strip (Động 100%) */}
      <AdminSummaryStrip
        items={[
          {
            label: 'Doanh thu thuần',
            value: formatPrice(totalRevenue),
            subValue: `${nonRefunded.length} đơn hợp lệ`,
          },
          {
            label: 'Lợi nhuận gộp',
            value: formatPrice(totalProfit),
            subValue: `Biên ~${profitMargin}%`,
            valueClassName: 'text-emerald-600',
          },
          {
            label: 'Giao dịch',
            value: `${filteredTransactions.length}`,
            subValue: `${successCount} OK · ${settlingCount} xử lý`,
            valueClassName: 'text-purple-600',
          },
          {
            label: 'Hủy / hoàn',
            value: `${refundRate}%`,
            subValue: `${refundCount} đơn`,
            valueClassName: 'text-amber-600',
          },
        ]}
      />

      {/* Main Table Container with Search */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        {loadError && (
          <div className="mx-3.5 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-700 shrink-0">
            <span className="font-medium">{loadError}</span>
            <Button type="button" variant="outline" size="sm" onClick={fetchRealTransactions}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Channel Filter Tabs */}
        <div className="border-b border-slate-100 px-3.5 py-2.5 flex items-center gap-1.5 overflow-x-auto bg-slate-50/40 text-xs shrink-0 no-scrollbar">
          {channelTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setChannelFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`py-1.5 px-3 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                channelFilter === tab.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                    channelFilter === tab.key ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Toolbar cho mục Báo cáo */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex-1 max-w-lg">
            <Input
              type="text"
              placeholder="Tìm kiếm báo cáo theo mã GD, mã đơn, khách hàng, sản phẩm..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {(searchQuery || channelFilter !== 'ALL' || dateRange !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer text-xs font-semibold whitespace-nowrap"
              >
                Đặt lại
              </button>
            )}

            <span className="text-xs text-slate-500 font-medium tabular-nums">
              Hiển thị <strong className="text-slate-800">{filteredTransactions.length}</strong> kết quả
            </span>
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">MÃ GIAO DỊCH</th>
                <th className="py-2.5 px-4">MÃ ĐƠN</th>
                <th className="py-2.5 px-4">KHÁCH HÀNG</th>
                <th className="py-2.5 px-4">SẢN PHẨM / DANH MỤC</th>
                <th className="py-2.5 px-4">KÊNH THANH TOÁN</th>
                <th className="py-2.5 px-4 text-right">DOANH THU</th>
                <th className="py-2.5 px-4 text-right">LỢI NHUẬN</th>
                <th className="py-2.5 px-4">TRẠNG THÁI</th>
                <th className="py-2.5 px-4">THỜI GIAN</th>
                <th className="py-2.5 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center">
                    <p className="text-sm font-semibold text-slate-600">
                      {isLoading
                        ? 'Đang tải dữ liệu báo cáo từ MySQL...'
                        : 'Không có giao dịch nào phù hợp với bộ lọc.'}
                    </p>
                    {!isLoading && (
                      <p className="text-xs text-slate-400 mt-1">
                        Thử thay đổi khoảng thời gian, kênh thanh toán hoặc từ khóa tìm kiếm.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap tabular-nums">
                      #{tx.id}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap tabular-nums">
                      {tx.orderCode}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {tx.customerName}
                    </td>
                    <td className="py-2.5 px-4 max-w-[220px]">
                      <span className="font-semibold text-slate-800 block truncate" title={tx.productName}>
                        {tx.productName}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[10px]" title={tx.channelLabel}>
                        {tx.channel}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatPrice(tx.revenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap tabular-nums">
                      <span className={`font-bold block ${tx.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.profit >= 0 ? `+${formatPrice(tx.profit)}` : formatPrice(tx.profit)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{tx.costMethodLabel}</span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {tx.status === 'SUCCESS' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Hoàn thành
                        </span>
                      )}
                      {tx.status === 'SETTLING' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Đang xử lý
                        </span>
                      )}
                      {tx.status === 'REFUNDED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Đã hủy đơn
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-medium text-[11px] whitespace-nowrap tabular-nums">
                      {tx.date}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedTx(tx)}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 10 rows per page pagination - Pinned to bottom */}
        <div className="shrink-0 bg-white">
          <AdminPagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredTransactions.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Chi tiết giao dịch / đơn hàng */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl font-sans max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Chi tiết Giao dịch #{selectedTx.id} ({selectedTx.orderCode})
                </h3>
                <p className="text-[11px] text-slate-500">{selectedTx.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">Khách hàng</span>
                  <p className="font-bold text-slate-900">{selectedTx.customerName}</p>
                  <p className="text-slate-600">{selectedTx.order.phoneNumber || '—'}</p>
                  <p className="text-slate-500">{selectedTx.order.shippingAddress || '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">Thanh toán & Kênh</span>
                  <p className="font-bold text-slate-900">{selectedTx.channelLabel}</p>
                  <p className="text-slate-600">
                    Thanh toán: <strong>{getPaymentStatusMeta(selectedTx.order).label}</strong>
                  </p>
                  <p className="text-slate-500">Phương pháp vốn: {selectedTx.costMethodLabel}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2 px-3">Sản phẩm</th>
                      <th className="py-2 px-3 text-center">SL</th>
                      <th className="py-2 px-3 text-right">Đơn giá</th>
                      <th className="py-2 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedTx.order.orderItems || []).map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-900 block">{item.productName}</span>
                          {item.variantName && (
                            <span className="text-[11px] text-slate-500 block">{item.variantName}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold">{item.quantity}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{formatPrice(item.price)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                          {formatPrice(item.totalPrice || item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Phí vận chuyển:</span>
                  <span className="tabular-nums">{formatPrice(Number(selectedTx.order.shippingFee) || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Giảm giá khuyến mãi:</span>
                  <span className="tabular-nums text-rose-600">
                    -{formatPrice(Number(selectedTx.order.discountAmount) || 0)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Doanh thu đơn hàng:</span>
                  <span className="tabular-nums">{formatPrice(selectedTx.revenue)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Giá vốn ước tính / nhập ({selectedTx.costMethodLabel}):</span>
                  <span className="tabular-nums">{formatPrice(selectedTx.cogs)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 text-sm pt-1 border-t border-slate-200">
                  <span>Lợi nhuận gộp ròng:</span>
                  <span className="tabular-nums">
                    {selectedTx.profit >= 0 ? `+${formatPrice(selectedTx.profit)}` : formatPrice(selectedTx.profit)}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedTx(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;

