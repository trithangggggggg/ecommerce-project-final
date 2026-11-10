import React, { useState, useEffect, useCallback } from 'react';
import {
  Gift,
  RotateCw,
  Calendar,
  Users,
  Ticket,
  Search,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Award,
  Sparkles,
} from 'lucide-react';
import AdminPagination from '../../components/admin/AdminPagination';
import { adminWheelService } from '../../api/services/adminWheel.service';
import type {
  AdminWheelSpinHistoryItem,
  AdminWheelStatsResponse,
  WheelReward,
} from '../../models/wheel.model';

const ITEMS_PER_PAGE = 10;

export const AdminWheelPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'REWARDS'>('HISTORY');

  // Stats & Rewards
  const [stats, setStats] = useState<AdminWheelStatsResponse | null>(null);
  const [rewards, setRewards] = useState<WheelReward[]>([]);

  // History list & pagination
  const [history, setHistory] = useState<AdminWheelSpinHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1); // 1-based
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Modals & Feedback
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: number | null;
    username?: string;
    reward?: string;
  }>({ isOpen: false, id: null });

  const [resetModal, setResetModal] = useState<{
    isOpen: boolean;
    userId: number | null;
    username?: string;
  }>({ isOpen: false, userId: null });

  // Tải thống kê tổng quan và cấu hình phần thưởng
  const fetchOverview = useCallback(async () => {
    try {
      const [statsData, rewardsData] = await Promise.all([
        adminWheelService.getStats(),
        adminWheelService.getRewards(),
      ]);
      setStats(statsData);
      setRewards(rewardsData);
    } catch {
      // Ignored
    }
  }, []);

  // Tải danh sách lịch sử quay thưởng
  const fetchHistory = useCallback(async (page: number, query: string, date: string) => {
    setIsLoading(true);
    try {
      const data = await adminWheelService.getHistory({
        page: page - 1, // 0-based for server
        size: ITEMS_PER_PAGE,
        search: query.trim() || undefined,
        date: date || undefined,
      });

      if (data) {
        setHistory(data.content || []);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);
      } else {
        setHistory([]);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch {
      setHistory([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchHistory(currentPage, searchQuery, dateFilter);
  }, [fetchHistory, currentPage, searchQuery, dateFilter]);

  // Toast auto dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
  };

  // Sao chép mã voucher
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(code);
    setTimeout(() => setCopiedVoucher(null), 2000);
  };

  // Xóa lịch sử quay
  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await adminWheelService.deleteHistory(deleteModal.id);
      showToast('success', 'Đã xóa bản ghi lịch sử quay thưởng thành công!');
      setDeleteModal({ isOpen: false, id: null });
      fetchHistory(currentPage, searchQuery, dateFilter);
      fetchOverview();
    } catch {
      showToast('error', 'Không thể xóa bản ghi. Vui lòng thử lại!');
    }
  };

  // Reset lượt quay hôm nay cho user
  const handleConfirmReset = async () => {
    if (!resetModal.userId) return;
    try {
      await adminWheelService.resetUserSpin(resetModal.userId);
      showToast('success', `Đã cấp lại lượt quay hôm nay cho ${resetModal.username || 'người dùng'}!`);
      setResetModal({ isOpen: false, userId: null });
      fetchHistory(currentPage, searchQuery, dateFilter);
      fetchOverview();
    } catch {
      showToast('error', 'Không thể đặt lại lượt quay. Vui lòng thử lại!');
    }
  };

  // Tính tổng trọng số
  const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-white text-slate-800 animate-slide-in">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Vòng Quay May Mắn</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-black tracking-wider uppercase">
                  NEXOR
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Quản lý lịch sử quay thưởng, thống kê voucher trúng và cấu hình xác suất vòng quay
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              fetchOverview();
              fetchHistory(currentPage, searchQuery, dateFilter);
              showToast('success', 'Đã làm mới dữ liệu vòng quay!');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-2xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* STAT CARDS / KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng lượt quay */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tổng lượt quay
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {(stats?.totalSpins ?? 0).toLocaleString('vi-VN')}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Toàn hệ thống từ trước đến nay
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <RotateCw className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Lượt quay hôm nay */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Lượt quay hôm nay
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {(stats?.spinsToday ?? 0).toLocaleString('vi-VN')}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Khách hàng tham gia hôm nay
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Người chơi tham gia */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Khách hàng đã quay
            </span>
            <div className="text-2xl font-black text-purple-600 mt-1">
              {(stats?.uniqueUsers ?? 0).toLocaleString('vi-VN')}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Tài khoản khách hàng duy nhất
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Voucher phát hành */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Voucher đã trúng
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {(stats?.vouchersIssued ?? 0).toLocaleString('vi-VN')}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Đã sử dụng: <strong className="text-slate-800">{stats?.vouchersUsed ?? 0}</strong> mã
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'HISTORY'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCw className="w-4 h-4" />
          <span>Lịch sử quay thưởng</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-bold">
            {totalElements}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REWARDS')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'REWARDS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Cấu hình 8 ô giải thưởng</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-bold">
            {rewards.length} ô
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LỊCH SỬ QUAY THƯỞNG */}
      {/* ========================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm theo Tên, Email, Username, Mã Voucher, Phần thưởng..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <div className="relative w-full sm:w-48">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                />
              </div>
            </div>

            {(searchQuery || dateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4"># ID</th>
                    <th className="py-3.5 px-4">Khách hàng</th>
                    <th className="py-3.5 px-4">Ngày quay</th>
                    <th className="py-3.5 px-4">Phần thưởng trúng</th>
                    <th className="py-3.5 px-4">Mã Voucher</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                        <span>Đang tải lịch sử quay thưởng...</span>
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Gift className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <span className="font-semibold block text-slate-600">
                          Không tìm thấy lượt quay nào
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Thử thay đổi từ khóa hoặc bộ lọc ngày để tìm lại
                        </span>
                      </td>
                    </tr>
                  ) : (
                    history.map((item) => {
                      const isUsed = item.usedCount && item.usedCount > 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          {/* ID */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-500">
                            #{item.id}
                          </td>

                          {/* Khách hàng */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {item.avatarUrl ? (
                                <img
                                  src={item.avatarUrl}
                                  alt={item.username}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                  {(item.fullName || item.username || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 leading-tight">
                                  {item.fullName || item.username}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  @{item.username} • {item.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Ngày quay */}
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{item.spinDate}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>

                          {/* Phần thưởng trúng */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/60 shadow-2xs">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              <span>{item.rewardLabel}</span>
                            </span>
                          </td>

                          {/* Mã Voucher */}
                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono font-bold text-slate-800">
                              <span>{item.voucherCode}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.voucherCode)}
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition"
                                title="Sao chép mã"
                              >
                                {copiedVoucher === item.voucherCode ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Trạng thái sử dụng */}
                          <td className="py-3 px-4 text-center">
                            {isUsed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                                Đã sử dụng
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 uppercase tracking-wide">
                                Chưa dùng
                              </span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Nút reset lượt quay hôm nay cho user */}
                              <button
                                type="button"
                                onClick={() =>
                                  setResetModal({
                                    isOpen: true,
                                    userId: item.userId,
                                    username: item.username,
                                  })
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                                title="Đặt lại lượt quay hôm nay cho người này"
                              >
                                <RotateCw className="w-4 h-4" />
                              </button>

                              {/* Nút xoá bản ghi */}
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteModal({
                                    isOpen: true,
                                    id: item.id,
                                    username: item.username,
                                    reward: item.rewardLabel,
                                  })
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Xóa bản ghi này"
                              >
                                <Trash2 className="w-4 h-4" />
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

            {/* Phân trang */}
            {totalElements > 0 && (
              <div className="p-4 border-t border-slate-100">
                <AdminPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalElements}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CẤU HÌNH 8 Ô PHẦN THƯỞNG */}
      {/* ========================================================= */}
      {activeTab === 'REWARDS' && (
        <div className="space-y-6">
          {/* Thanh phân bổ xác suất đồ họa */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Tỷ lệ xác suất trúng thưởng (Tổng trọng số: {totalWeight})
                </h3>
                <p className="text-xs text-slate-500">
                  Thuật toán Weighted Random tại máy chủ NEXOR dựa trên trọng số của từng giải
                </p>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                8 Phần thưởng chuẩn NEXOR
              </span>
            </div>

            {/* Distribution Bar */}
            <div className="w-full h-5 rounded-full overflow-hidden flex shadow-inner bg-slate-100">
              {rewards.map((r) => {
                const pct = totalWeight > 0 ? (r.weight / totalWeight) * 100 : 0;
                return (
                  <div
                    key={r.id}
                    style={{ width: `${pct}%`, backgroundColor: r.color }}
                    className="h-full transition-all group relative cursor-pointer"
                    title={`${r.label}: ${pct.toFixed(1)}% (Trọng số ${r.weight})`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-2">
              {rewards.map((r) => {
                const pct = totalWeight > 0 ? (r.weight / totalWeight) * 100 : 0;
                return (
                  <div key={r.id} className="flex items-center gap-1.5 text-xs text-slate-700">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="font-semibold">{r.shortLabel}:</span>
                    <span className="font-mono text-slate-500">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cards 8 ô phần thưởng */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {rewards.map((reward, index) => {
              const theoreticalPct = totalWeight > 0 ? (reward.weight / totalWeight) * 100 : 0;
              const distItem = stats?.rewardDistributions?.find((d) => d.rewardId === reward.id);
              const actualCount = distItem?.count ?? 0;
              const actualPct = distItem?.percentage ?? 0;

              return (
                <div
                  key={reward.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                >
                  {/* Top Bar với màu sắc ô */}
                  <div
                    className="p-3 text-white flex items-center justify-between"
                    style={{ backgroundColor: reward.color }}
                  >
                    <span className="text-xs font-black uppercase tracking-wider">
                      Ô #{index + 1}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/25">
                      {reward.type === 'SHIPPING' ? 'FREESHIP' : 'ORDER VOUCHER'}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-extrabold text-slate-900">
                          {reward.label}
                        </h4>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          [{reward.shortLabel}]
                        </span>
                      </div>

                      <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Giảm giá:</span>
                          <span className="font-bold text-slate-800">{reward.discount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Đơn tối thiểu:</span>
                          <span className="font-medium text-slate-700">{reward.minOrder}</span>
                        </div>
                        {reward.maxDiscountAmount && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Giảm tối đa:</span>
                            <span className="font-medium text-slate-700">
                              {reward.maxDiscountAmount.toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats footer */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Trọng số:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {reward.weight} ({theoreticalPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Đã trúng thực tế:</span>
                        <span className="font-mono font-extrabold text-emerald-600">
                          {actualCount} lượt ({actualPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL XÁC NHẬN XÓA LỊCH SỬ */}
      {/* ========================================================= */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa bản ghi lịch sử</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa bản ghi quay thưởng của khách hàng{' '}
                <strong className="text-slate-800">@{deleteModal.username}</strong> ({deleteModal.reward}) không?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, id: null })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-2xs transition"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL XÁC NHẬN RESET LƯỢT QUAY HÔM NAY CHO USER */}
      {/* ========================================================= */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <RotateCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cấp lại lượt quay hôm nay</h3>
              <p className="text-xs text-slate-500 mt-1">
                Đặt lại lượt quay hôm nay cho khách hàng{' '}
                <strong className="text-slate-800">@{resetModal.username}</strong>? Khách hàng sẽ có thể quay lại ngay lập tức hôm nay.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResetModal({ isOpen: false, userId: null })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs transition"
              >
                Xác nhận đặt lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWheelPage;

