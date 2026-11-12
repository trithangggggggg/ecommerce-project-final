import React, { useState, useEffect, useCallback } from 'react';
import AdminPagination from '../../components/admin/AdminPagination';
import { adminWheelService } from '../../api/services/adminWheel.service';
import type {
  AdminWheelSpinHistoryItem,
  AdminWheelStatsResponse,
  WheelReward,
} from '../../models/wheel.model';

const ITEMS_PER_PAGE = 10;
const REWARD_ITEMS_PER_PAGE = 8;

export const AdminWheelPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'REWARDS'>('HISTORY');

  // Stats & Rewards
  const [stats, setStats] = useState<AdminWheelStatsResponse | null>(null);
  const [rewards, setRewards] = useState<WheelReward[]>([]);

  // Tab 2 Reward Management (Paged + Search + CRUD)
  const [pagedRewards, setPagedRewards] = useState<WheelReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardStatusFilter, setRewardStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [rewardPage, setRewardPage] = useState(1);
  const [rewardTotalPages, setRewardTotalPages] = useState(1);
  const [rewardTotalElements, setRewardTotalElements] = useState(0);

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
  const [historyDetail, setHistoryDetail] = useState<AdminWheelSpinHistoryItem | null>(null);

  const [rewardDetail, setRewardDetail] = useState<WheelReward | null>(null);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<WheelReward | null>(null);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardFormError, setRewardFormError] = useState('');
  const [rewardDeleteTarget, setRewardDeleteTarget] = useState<WheelReward | null>(null);
  const [rewardForm, setRewardForm] = useState({
    label: '',
    shortLabel: '',
    discount: '',
    type: 'ORDER' as 'ORDER' | 'SHIPPING',
    minOrder: 'Mọi đơn hàng',
    maxDiscountAmount: '',
    weight: 10,
    color: '#1e40af',
    textColor: '#ffffff',
    displayOrder: 1,
    isActive: true,
  });

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

  const fetchPagedRewards = useCallback(async () => {
    setRewardsLoading(true);
    try {
      const res = await adminWheelService.getRewardsPaged({
        keyword: rewardSearch.trim() || undefined,
        isActive: rewardStatusFilter === 'ALL' ? undefined : rewardStatusFilter === 'ACTIVE',
        page: rewardPage - 1,
        size: REWARD_ITEMS_PER_PAGE,
      });
      setPagedRewards(res?.content || []);
      setRewardTotalPages(res?.totalPages || 1);
      setRewardTotalElements(res?.totalElements || 0);
    } catch {
      setPagedRewards([]);
    } finally {
      setRewardsLoading(false);
    }
  }, [rewardSearch, rewardStatusFilter, rewardPage]);

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
    void fetchPagedRewards();
  }, [fetchPagedRewards]);

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

  const handleOpenHistoryDetail = async (item: AdminWheelSpinHistoryItem) => {
    setHistoryDetail(item);
    try {
      const fresh = await adminWheelService.getHistoryById(item.id);
      if (fresh) setHistoryDetail(fresh);
    } catch {
      // Keep list record
    }
  };

  const handleOpenAddReward = () => {
    setEditingReward(null);
    setRewardForm({
      label: '',
      shortLabel: '',
      discount: '50.000',
      type: 'ORDER',
      minOrder: '500.000₫',
      maxDiscountAmount: '',
      weight: 10,
      color: '#1e40af',
      textColor: '#ffffff',
      displayOrder: rewardTotalElements + 1,
      isActive: true,
    });
    setRewardFormError('');
    setRewardModalOpen(true);
  };

  const handleOpenEditReward = (reward: WheelReward) => {
    setEditingReward(reward);
    setRewardForm({
      label: reward.label,
      shortLabel: reward.shortLabel,
      discount: reward.discount,
      type: reward.type || 'ORDER',
      minOrder: reward.minOrder || 'Mọi đơn hàng',
      maxDiscountAmount: reward.maxDiscountAmount != null ? String(reward.maxDiscountAmount) : '',
      weight: reward.weight ?? 10,
      color: reward.color || '#1e40af',
      textColor: reward.textColor || '#ffffff',
      displayOrder: reward.displayOrder ?? 1,
      isActive: reward.isActive !== false,
    });
    setRewardFormError('');
    setRewardModalOpen(true);
  };

  const handleOpenRewardDetail = async (reward: WheelReward) => {
    setRewardDetail(reward);
    if (reward.entityId) {
      try {
        const fresh = await adminWheelService.getRewardById(reward.entityId);
        if (fresh) setRewardDetail(fresh);
      } catch {
        // Keep card item
      }
    }
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.label.trim() || !rewardForm.shortLabel.trim() || !rewardForm.discount.trim()) {
      setRewardFormError('Vui lòng điền đầy đủ Tên phần thưởng, Nhãn ngắn và Giá trị ưu đãi');
      return;
    }
    setRewardSaving(true);
    setRewardFormError('');
    try {
      const payload = {
        label: rewardForm.label.trim(),
        shortLabel: rewardForm.shortLabel.trim(),
        discount: rewardForm.discount.trim(),
        type: rewardForm.type,
        minOrder: rewardForm.minOrder.trim() || 'Mọi đơn hàng',
        maxDiscountAmount: rewardForm.maxDiscountAmount ? Number(rewardForm.maxDiscountAmount) : null,
        weight: Math.max(0, Number(rewardForm.weight) || 0),
        color: rewardForm.color || '#1e40af',
        textColor: rewardForm.textColor || '#ffffff',
        displayOrder: Number(rewardForm.displayOrder) || 0,
        isActive: rewardForm.isActive,
      };
      const targetId = editingReward?.entityId ?? editingReward?.id;
      if (editingReward && targetId) {
        await adminWheelService.updateReward(targetId, payload);
        showToast('success', `Đã cập nhật ô phần thưởng "${payload.label}"`);
      } else {
        await adminWheelService.createReward(payload);
        showToast('success', `Đã thêm ô phần thưởng "${payload.label}"`);
      }
      setRewardModalOpen(false);
      await Promise.all([fetchOverview(), fetchPagedRewards()]);
    } catch (err: unknown) {
      setRewardFormError(err instanceof Error ? err.message : 'Lưu phần thưởng thất bại');
    } finally {
      setRewardSaving(false);
    }
  };

  const handleToggleRewardStatus = async (reward: WheelReward) => {
    const id = reward.entityId ?? reward.id;
    try {
      await adminWheelService.toggleRewardStatus(id, reward.isActive === false);
      showToast('success', `Đã ${reward.isActive === false ? 'bật' : 'tạm ẩn'} ô "${reward.label}"`);
      await Promise.all([fetchOverview(), fetchPagedRewards()]);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Đổi trạng thái thất bại');
    }
  };

  const handleDeleteRewardConfirm = async () => {
    if (!rewardDeleteTarget) return;
    const id = rewardDeleteTarget.entityId ?? rewardDeleteTarget.id;
    try {
      await adminWheelService.deleteReward(id);
      showToast('success', `Đã xóa phần thưởng "${rewardDeleteTarget.label}"`);
      setRewardDeleteTarget(null);
      await Promise.all([fetchOverview(), fetchPagedRewards()]);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Xóa phần thưởng thất bại');
    }
  };

  // Tính tổng trọng số
  const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-white text-slate-800 ${
            toastMessage.type === 'success' ? 'border-emerald-200' : 'border-rose-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              toastMessage.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Vòng Quay May Mắn
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold tracking-wider uppercase">
              NEXOR
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý lịch sử quay thưởng, thống kê voucher trúng và cấu hình xác suất vòng quay
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              fetchOverview();
              fetchHistory(currentPage, searchQuery, dateFilter);
              showToast('success', 'Đã làm mới dữ liệu vòng quay!');
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-2xs transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {/* STAT CARDS / KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Card 1: Tổng lượt quay */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Tổng lượt quay
          </span>
          <div className="text-lg font-bold text-slate-900">
            {(stats?.totalSpins ?? 0).toLocaleString('vi-VN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Toàn hệ thống từ trước đến nay
          </span>
        </div>

        {/* Card 2: Lượt quay hôm nay */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Lượt quay hôm nay
          </span>
          <div className="text-lg font-bold text-emerald-600">
            {(stats?.spinsToday ?? 0).toLocaleString('vi-VN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Khách hàng tham gia hôm nay
          </span>
        </div>

        {/* Card 3: Người chơi tham gia */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Khách hàng đã quay
          </span>
          <div className="text-lg font-bold text-purple-600">
            {(stats?.uniqueUsers ?? 0).toLocaleString('vi-VN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Tài khoản khách hàng duy nhất
          </span>
        </div>

        {/* Card 4: Voucher phát hành */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Voucher đã trúng
          </span>
          <div className="text-lg font-bold text-amber-600">
            {(stats?.vouchersIssued ?? 0).toLocaleString('vi-VN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Đã sử dụng: <strong className="text-slate-800">{stats?.vouchersUsed ?? 0}</strong> mã
          </span>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-2xs w-fit shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'HISTORY'
              ? 'bg-blue-600 text-white shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>Lịch sử quay thưởng</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'HISTORY' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalElements}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REWARDS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'REWARDS'
              ? 'bg-blue-600 text-white shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>Cấu hình 8 ô giải thưởng</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'REWARDS' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {rewards.length} ô
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LỊCH SỬ QUAY THƯỞNG */}
      {/* ========================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
          {/* Filter Bar */}
          <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm theo Tên, Email, Username, Mã Voucher, Phần thưởng..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Date Filter */}
              <div className="w-full sm:w-44">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                />
              </div>

              {(searchQuery || dateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDateFilter('');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium self-end md:self-center">
              Tổng cộng <strong>{totalElements}</strong> lượt quay
            </div>
          </div>

          {/* Loading / Empty / Table */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-12 px-4 text-center text-slate-500">
              <span className="text-xs font-medium">Đang tải lịch sử quay thưởng...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Không tìm thấy lượt quay nào
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Thử thay đổi từ khóa hoặc bộ lọc ngày để tìm lại
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto no-scrollbar">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  <tr className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] shadow-2xs">
                    <th className="py-2.5 px-3.5 bg-slate-50/95"># ID</th>
                    <th className="py-2.5 px-3.5 bg-slate-50/95">Khách hàng</th>
                    <th className="py-2.5 px-3.5 bg-slate-50/95">Ngày quay</th>
                    <th className="py-2.5 px-3.5 bg-slate-50/95">Phần thưởng trúng</th>
                    <th className="py-2.5 px-3.5 bg-slate-50/95">Mã Voucher</th>
                    <th className="py-2.5 px-3.5 bg-slate-50/95 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3.5 bg-slate-50/95 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {history.map((item) => {
                    const isUsed = item.usedCount && item.usedCount > 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        {/* ID */}
                        <td className="py-2.5 px-3.5 font-mono font-bold text-slate-500 whitespace-nowrap">
                          #{item.id}
                        </td>

                        {/* Khách hàng */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2.5">
                            {item.avatarUrl ? (
                              <img
                                src={item.avatarUrl}
                                alt={item.username}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {(item.fullName || item.username || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 leading-tight truncate">
                                {item.fullName || item.username}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono truncate">
                                @{item.username} • {item.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Ngày quay */}
                        <td className="py-2.5 px-3.5 text-slate-600 whitespace-nowrap">
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
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            {item.rewardLabel}
                          </span>
                        </td>

                        {/* Mã Voucher */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="inline-flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-mono font-bold text-slate-800">
                            <span>{item.voucherCode}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.voucherCode)}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-sans font-semibold whitespace-nowrap transition cursor-pointer ${
                                copiedVoucher === item.voucherCode
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                              }`}
                              title="Sao chép mã"
                            >
                              {copiedVoucher === item.voucherCode ? 'Đã chép' : 'Sao chép'}
                            </button>
                          </div>
                        </td>

                        {/* Trạng thái sử dụng */}
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          {isUsed ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đã sử dụng
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Chưa dùng
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleOpenHistoryDetail(item)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                            >
                              Xem
                            </button>
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
                              className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                              title="Đặt lại lượt quay hôm nay cho người này"
                            >
                              Đặt lại lượt
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
                              className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                              title="Xóa bản ghi này"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Phân trang */}
          <div className="shrink-0 bg-white">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalElements}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CẤU HÌNH PHẦN THƯỞNG VÒNG QUAY (FULL CRUD + DB) */}
      {/* ========================================================= */}
      {activeTab === 'REWARDS' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* Thanh phân bổ xác suất đồ họa */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Tỷ lệ xác suất trúng thưởng (Tổng trọng số đang bật: {totalWeight})
                </h3>
                <p className="text-xs text-slate-500">
                  Thuật toán Weighted Random tại máy chủ NEXOR dựa trên các ô giải thưởng đang kích hoạt trong MySQL
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddReward}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shrink-0"
              >
                Thêm phần thưởng mới
              </button>
            </div>

            <div className="w-full h-5 rounded-full overflow-hidden flex shadow-inner bg-slate-100">
              {rewards.map((r) => {
                const pct = totalWeight > 0 ? (r.weight / totalWeight) * 100 : 0;
                return (
                  <div
                    key={r.entityId ?? r.id}
                    style={{ width: `${pct}%`, backgroundColor: r.color }}
                    className="h-full transition-all"
                    title={`${r.label}: ${pct.toFixed(1)}% (Trọng số ${r.weight})`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              {rewards.map((r) => {
                const pct = totalWeight > 0 ? (r.weight / totalWeight) * 100 : 0;
                return (
                  <div key={r.entityId ?? r.id} className="flex items-center gap-1.5 text-xs text-slate-700">
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

          {/* Search & Filter + Paged Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                <input
                  type="text"
                  placeholder="Tìm phần thưởng theo tên, nhãn ngắn hoặc mức giảm..."
                  value={rewardSearch}
                  onChange={(e) => {
                    setRewardSearch(e.target.value);
                    setRewardPage(1);
                  }}
                  className="w-full sm:max-w-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
                <select
                  value={rewardStatusFilter}
                  onChange={(e) => {
                    setRewardStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
                    setRewardPage(1);
                  }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang bật</option>
                  <option value="INACTIVE">Đang ẩn</option>
                </select>
              </div>
              <span className="text-xs text-slate-500 font-medium tabular-nums">
                Tổng <strong className="text-slate-800">{rewardTotalElements}</strong> ô giải thưởng
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3.5">Thứ tự</th>
                    <th className="py-3 px-3.5">Phần thưởng</th>
                    <th className="py-3 px-3.5">Loại / Giảm giá</th>
                    <th className="py-3 px-3.5">Trọng số</th>
                    <th className="py-3 px-3.5">Màu ô</th>
                    <th className="py-3 px-3.5">Trạng thái</th>
                    <th className="py-3 px-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rewardsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        Đang tải cấu hình giải thưởng...
                      </td>
                    </tr>
                  ) : pagedRewards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        Không có ô giải thưởng nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    pagedRewards.map((reward) => {
                      const pct = reward.isActive !== false && totalWeight > 0
                        ? ((reward.weight / totalWeight) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={reward.entityId ?? reward.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-slate-500">
                            #{reward.displayOrder ?? reward.id + 1}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="font-bold text-slate-900">{reward.label}</div>
                            <div className="text-[11px] text-slate-500">
                              Nhãn: {reward.shortLabel} • Đơn từ: {reward.minOrder}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="font-bold text-slate-800">{reward.discount}</span>
                            <div className="text-[11px] text-slate-500">
                              {reward.type === 'SHIPPING' ? 'FREESHIP' : 'ORDER VOUCHER'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800">
                            {reward.weight} ({pct}%)
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-black/10"
                              style={{ backgroundColor: reward.color, color: reward.textColor }}
                            >
                              {reward.shortLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <button
                              type="button"
                              onClick={() => void handleToggleRewardStatus(reward)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                                reward.isActive !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {reward.isActive !== false ? 'Đang bật' : 'Đang ẩn'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleOpenRewardDetail(reward)}
                                className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 font-semibold cursor-pointer"
                              >
                                Xem
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditReward(reward)}
                                className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/70 font-semibold cursor-pointer"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => setRewardDeleteTarget(reward)}
                                className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200/70 font-semibold cursor-pointer"
                              >
                                Xóa
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

            <div className="shrink-0 bg-white">
              <AdminPagination
                currentPage={rewardPage}
                totalPages={rewardTotalPages}
                totalItems={rewardTotalElements}
                itemsPerPage={REWARD_ITEMS_PER_PAGE}
                onPageChange={setRewardPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL XÁC NHẬN XÓA LỊCH SỬ */}
      {/* ========================================================= */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa bản ghi lịch sử</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn xóa bản ghi quay thưởng của khách hàng{' '}
                <strong className="text-slate-800">@{deleteModal.username}</strong> ({deleteModal.reward}) không?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, id: null })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-2xs transition cursor-pointer"
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
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Cấp lại lượt quay hôm nay</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Đặt lại lượt quay hôm nay cho khách hàng{' '}
                <strong className="text-slate-800">@{resetModal.username}</strong>? Khách hàng sẽ có thể quay lại ngay lập tức hôm nay.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModal({ isOpen: false, userId: null })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs transition cursor-pointer"
              >
                Xác nhận đặt lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT LỊCH SỬ QUAY THƯỞNG */}
      {historyDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chi tiết Lượt quay #{historyDetail.id}</h3>
              <button
                type="button"
                onClick={() => setHistoryDetail(null)}
                className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block">Khách hàng</span>
                <span className="font-bold text-slate-900">{historyDetail.fullName || historyDetail.username}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Email</span>
                <span className="text-slate-700 break-all">{historyDetail.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Ngày quay</span>
                <span className="font-mono text-slate-800">{historyDetail.spinDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Phần thưởng</span>
                <span className="font-bold text-blue-700">{historyDetail.rewardLabel}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Mã Voucher</span>
                <span className="font-mono font-bold text-slate-900">{historyDetail.voucherCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Trạng thái</span>
                <span className="font-semibold text-slate-800">
                  {historyDetail.usedCount && historyDetail.usedCount > 0 ? 'Đã sử dụng' : 'Chưa sử dụng'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT PHẦN THƯỞNG */}
      {rewardDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chi tiết Giải thưởng</h3>
              <button
                type="button"
                onClick={() => setRewardDetail(null)}
                className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block">Tên phần thưởng</span>
                <span className="font-bold text-slate-900">{rewardDetail.label}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Nhãn trên vòng quay</span>
                <span className="font-mono font-bold text-slate-800">{rewardDetail.shortLabel}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Loại & Giá trị</span>
                <span className="font-bold text-blue-700">{rewardDetail.discount} ({rewardDetail.type})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Đơn tối thiểu</span>
                <span className="text-slate-800">{rewardDetail.minOrder}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Trọng số / Thứ tự</span>
                <span className="font-mono text-slate-800">{rewardDetail.weight} / #{rewardDetail.displayOrder}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Giảm tối đa</span>
                <span className="font-mono text-slate-800">
                  {rewardDetail.maxDiscountAmount ? `${rewardDetail.maxDiscountAmount.toLocaleString('vi-VN')}₫` : 'Không giới hạn'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA PHẦN THƯỞNG */}
      {rewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSaveReward}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingReward ? `Chỉnh sửa Giải "${editingReward.label}"` : 'Thêm Giải thưởng Vòng quay'}
              </h3>
              <button
                type="button"
                onClick={() => setRewardModalOpen(false)}
                className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {rewardFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {rewardFormError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên phần thưởng *</label>
                <input
                  type="text"
                  required
                  value={rewardForm.label}
                  onChange={(e) => setRewardForm({ ...rewardForm, label: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhãn ngắn trên vòng quay *</label>
                <input
                  type="text"
                  required
                  value={rewardForm.shortLabel}
                  onChange={(e) => setRewardForm({ ...rewardForm, shortLabel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Giá trị ưu đãi *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 50.000 hoặc 15%"
                  value={rewardForm.discount}
                  onChange={(e) => setRewardForm({ ...rewardForm, discount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại voucher</label>
                <select
                  value={rewardForm.type}
                  onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value as 'ORDER' | 'SHIPPING' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="ORDER">Giảm giá đơn hàng (ORDER)</option>
                  <option value="SHIPPING">Miễn phí vận chuyển (SHIPPING)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Đơn tối thiểu (hiển thị)</label>
                <input
                  type="text"
                  value={rewardForm.minOrder}
                  onChange={(e) => setRewardForm({ ...rewardForm, minOrder: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Giảm tối đa (VNĐ, nếu là %)</label>
                <input
                  type="number"
                  min={0}
                  value={rewardForm.maxDiscountAmount}
                  onChange={(e) => setRewardForm({ ...rewardForm, maxDiscountAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Trọng số xác suất *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={rewardForm.weight}
                  onChange={(e) => setRewardForm({ ...rewardForm, weight: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Thứ tự ô</label>
                <input
                  type="number"
                  min={0}
                  value={rewardForm.displayOrder}
                  onChange={(e) => setRewardForm({ ...rewardForm, displayOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Màu nền ô</label>
                <input
                  type="color"
                  value={rewardForm.color}
                  onChange={(e) => setRewardForm({ ...rewardForm, color: e.target.value })}
                  className="w-full h-9 p-1 border border-slate-200 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Màu chữ</label>
                <input
                  type="color"
                  value={rewardForm.textColor}
                  onChange={(e) => setRewardForm({ ...rewardForm, textColor: e.target.value })}
                  className="w-full h-9 p-1 border border-slate-200 rounded-lg cursor-pointer"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={rewardForm.isActive}
                    onChange={(e) => setRewardForm({ ...rewardForm, isActive: e.target.checked })}
                  />
                  <span>Kích hoạt ô giải thưởng trên Vòng quay Client</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRewardModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={rewardSaving}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-60"
              >
                {rewardSaving ? 'Đang lưu...' : editingReward ? 'Lưu giải thưởng' : 'Tạo giải thưởng'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL XÓA PHẦN THƯỞNG */}
      {rewardDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa Giải thưởng</h3>
            <p className="text-xs text-slate-500">
              Bạn có chắc chắn muốn xóa ô giải thưởng <strong className="text-slate-800">{rewardDeleteTarget.label}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRewardDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteRewardConfirm()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWheelPage;

