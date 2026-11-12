import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';
import { storeService } from '../../api/services/store.service';
import type { StoreLocation, StoreLocationRequest } from '../../models/store.model';

const ITEMS_PER_PAGE = 8;

export const AdminStoresPage: React.FC = () => {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [detailStore, setDetailStore] = useState<StoreLocation | null>(null);

  // Modal Thêm mới / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreLocation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Xóa
  const [deleteTarget, setDeleteTarget] = useState<StoreLocation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const initialFormState: StoreLocationRequest = {
    name: '',
    address: '',
    province: '',
    district: '',
    phoneNumber: '',
    latitude: undefined,
    longitude: undefined,
    openHours: '08:00 - 22:00',
    imageUrl: '',
    status: 'ACTIVE',
  };
  const [formData, setFormData] = useState<StoreLocationRequest>(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const data = await storeService.getAdminStores();
      setStores(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách showroom từ máy chủ';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Danh sách tỉnh thành duy nhất có trong dữ liệu
  const provincesList = Array.from(new Set(stores.map((s) => s.province).filter(Boolean))).sort();

  // Reset trang về 1 khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, provinceFilter, statusFilter]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Vui lòng nhập tên showroom';
    if (!formData.address.trim()) errors.address = 'Vui lòng nhập địa chỉ chi tiết';
    if (!formData.province.trim()) errors.province = 'Vui lòng nhập hoặc chọn Tỉnh/Thành phố';

    if (formData.latitude !== undefined && formData.latitude !== null && isNaN(Number(formData.latitude))) {
      errors.latitude = 'Vĩ độ (latitude) phải là số hợp lệ';
    }
    if (formData.longitude !== undefined && formData.longitude !== null && isNaN(Number(formData.longitude))) {
      errors.longitude = 'Kinh độ (longitude) phải là số hợp lệ';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Mở modal thêm mới
  const handleOpenAddModal = () => {
    setEditingStore(null);
    setFormData(initialFormState);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (store: StoreLocation) => {
    setEditingStore(store);
    setFormData({
      name: store.name || '',
      address: store.address || '',
      province: store.province || '',
      district: store.district || '',
      phoneNumber: store.phoneNumber || '',
      latitude: store.latitude ?? undefined,
      longitude: store.longitude ?? undefined,
      openHours: store.openHours || '08:00 - 22:00',
      imageUrl: store.imageUrl || '',
      status: store.status || 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = async (store: StoreLocation) => {
    setDetailStore(store);
    try {
      const fresh = await storeService.getAdminStoreById(store.id);
      if (fresh) setDetailStore(fresh);
    } catch {
      // Keep list record
    }
  };

  // Xử lý Submit Form (Thêm mới hoặc Cập nhật)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: StoreLocationRequest = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        province: formData.province.trim(),
        district: formData.district?.trim() || undefined,
        phoneNumber: formData.phoneNumber?.trim() || undefined,
        latitude: formData.latitude !== undefined && formData.latitude !== null && !isNaN(Number(formData.latitude))
          ? Number(formData.latitude)
          : undefined,
        longitude: formData.longitude !== undefined && formData.longitude !== null && !isNaN(Number(formData.longitude))
          ? Number(formData.longitude)
          : undefined,
        openHours: formData.openHours?.trim() || '08:00 - 22:00',
        imageUrl: formData.imageUrl?.trim() || undefined,
        status: formData.status || 'ACTIVE',
      };

      if (editingStore) {
        // Cập nhật
        const updated = await storeService.updateStore(editingStore.id, payload);
        setStores((prev) =>
          prev.map((item) => (item.id === editingStore.id ? { ...item, ...updated } : item))
        );
        showToast(`Đã cập nhật showroom "${payload.name}" thành công!`);
      } else {
        // Thêm mới
        const created = await storeService.createStore(payload);
        setStores((prev) => [created, ...prev]);
        showToast(`Đã thêm showroom mới "${payload.name}" thành công!`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu showroom thất bại';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xác nhận Xóa
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await storeService.deleteStore(deleteTarget.id);
      setStores((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToast(`Đã xóa showroom "${deleteTarget.name}" thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa showroom thất bại';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Lọc danh sách Showroom
  const filteredStores = stores.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (provinceFilter !== 'ALL' && s.province !== provinceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchAddress = s.address.toLowerCase().includes(q);
      const matchProvince = s.province.toLowerCase().includes(q);
      const matchDistrict = (s.district || '').toLowerCase().includes(q);
      const matchPhone = (s.phoneNumber || '').includes(q);
      return matchName || matchAddress || matchProvince || matchDistrict || matchPhone;
    }
    return true;
  });

  const activeCount = stores.filter((s) => s.status === 'ACTIVE').length;
  const inactiveCount = stores.filter((s) => s.status === 'INACTIVE').length;

  // Phân trang
  const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE) || 1;
  const paginatedStores = filteredStores.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hệ thống Showroom &amp; Cửa hàng
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
              {stores.length} địa điểm
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý danh sách chi nhánh, địa chỉ GPS hiển thị trực tiếp trên bản đồ khách hàng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStores}
            disabled={isLoading}
            className="whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-semibold shadow-2xs"
          >
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            className="whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-semibold shadow-2xs"
          >
            Thêm showroom
          </Button>
        </div>
      </div>

      {/* Main Data Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Integrated Clean Filter Bar */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 shrink-0 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Tìm theo tên showroom, địa chỉ, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!px-3.5 !py-2 !text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc Tỉnh/Thành */}
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Tất cả Tỉnh/Thành</option>
              {provincesList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Lọc Trạng thái */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap tabular-nums ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({stores.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap tabular-nums ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-emerald-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hoạt động ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap tabular-nums ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white text-slate-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tạm ngừng ({inactiveCount})
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-auto min-h-0 no-scrollbar">
          {paginatedStores.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-bold text-slate-800">
                Không tìm thấy showroom nào phù hợp
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc tỉnh thành, trạng thái
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3.5 w-12 text-center">#</th>
                  <th className="py-3 px-3.5">Tên Showroom</th>
                  <th className="py-3 px-3.5">Khu vực / Tỉnh thành</th>
                  <th className="py-3 px-3.5">Địa chỉ chi tiết</th>
                  <th className="py-3 px-3.5">Liên hệ</th>
                  <th className="py-3 px-3.5">Giờ mở cửa</th>
                  <th className="py-3 px-3.5">Tọa độ GPS</th>
                  <th className="py-3 px-3.5 text-center">Trạng thái</th>
                  <th className="py-3 px-3.5 text-right w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedStores.map((store, index) => {
                  const recordIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                  const isActive = store.status === 'ACTIVE';

                  return (
                    <tr
                      key={store.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px] tabular-nums">
                        {recordIndex}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {store.name}
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-800">{store.province}</div>
                        {store.district && (
                          <div className="text-[11px] text-slate-400">{store.district}</div>
                        )}
                      </td>

                      <td className="py-3 px-3.5 max-w-xs">
                        <div className="text-slate-600 line-clamp-2 text-[11px] leading-relaxed">
                          {store.address}
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        {store.phoneNumber ? (
                          <span className="text-slate-700 font-mono tabular-nums text-[11px] whitespace-nowrap">
                            {store.phoneNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa cập nhật</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="text-slate-600 tabular-nums text-[11px] whitespace-nowrap">
                          {store.openHours || '08:00 - 22:00'}
                        </span>
                      </td>

                      <td className="py-3 px-3.5">
                        {store.latitude != null && store.longitude != null ? (
                          <span className="text-[11px] font-mono tabular-nums text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 whitespace-nowrap">
                            {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa có GPS</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isActive ? 'Hoạt động' : 'Tạm ngừng'}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleOpenDetailModal(store)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                            title="Xem chi tiết showroom"
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(store)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                            title="Chỉnh sửa showroom"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(store)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                            title="Xóa showroom"
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
          )}
        </div>

        {/* Pagination Footer */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredStores.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* ========================================================
          MODAL: THÊM MỚI / CHỈNH SỬA SHOWROOM
          ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingStore ? 'Chỉnh sửa Showroom' : 'Thêm Showroom mới'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Điền đầy đủ thông tin để hiển thị chính xác trên bản đồ tìm kiếm
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                {/* Tên Showroom */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tên Showroom <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: NEXOR Flagship Hai Bà Trưng"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition ${
                      formErrors.name ? 'border-rose-400' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>
                  )}
                </div>

                {/* Tỉnh/Thành & Quận/Huyện */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tỉnh / Thành phố <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      placeholder="Hà Nội, TP. Hồ Chí Minh, Đà Nẵng..."
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition ${
                        formErrors.province ? 'border-rose-400' : 'border-slate-200'
                      }`}
                    />
                    {formErrors.province && (
                      <p className="text-[11px] text-rose-500 mt-1">{formErrors.province}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Quận / Huyện
                    </label>
                    <input
                      type="text"
                      value={formData.district || ''}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="Quận 1, Cầu Giấy, Hải Châu..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Địa chỉ chi tiết */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Địa chỉ chi tiết <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Số 123 Đường ABC, Phường XYZ..."
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition ${
                      formErrors.address ? 'border-rose-400' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.address && (
                    <p className="text-[11px] text-rose-500 mt-1">{formErrors.address}</p>
                  )}
                </div>

                {/* SĐT & Giờ mở cửa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="028 3822 6868..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Giờ mở cửa
                    </label>
                    <input
                      type="text"
                      value={formData.openHours || ''}
                      onChange={(e) => setFormData({ ...formData, openHours: e.target.value })}
                      placeholder="08:00 - 22:00"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Tọa độ GPS (Vĩ độ & Kinh độ) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Vĩ độ (Latitude GPS)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          latitude: e.target.value === '' ? undefined : parseFloat(e.target.value),
                        })
                      }
                      placeholder="VD: 21.034870"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                    />
                    {formErrors.latitude && (
                      <p className="text-[11px] text-rose-500 mt-1">{formErrors.latitude}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Kinh độ (Longitude GPS)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          longitude: e.target.value === '' ? undefined : parseFloat(e.target.value),
                        })
                      }
                      placeholder="VD: 105.795230"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                    />
                    {formErrors.longitude && (
                      <p className="text-[11px] text-rose-500 mt-1">{formErrors.longitude}</p>
                    )}
                  </div>
                </div>

                {/* Hình ảnh Showroom */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    URL Hình ảnh Showroom
                  </label>
                  <input
                    type="text"
                    value={formData.imageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://... hoặc /images/showroom.jpg"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                  />
                </div>

                {/* Trạng thái hoạt động */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng thái Showroom
                  </label>
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="ACTIVE"
                        checked={formData.status === 'ACTIVE'}
                        onChange={() => setFormData({ ...formData, status: 'ACTIVE' })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-emerald-700 text-xs">
                        Hoạt động (ACTIVE)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="INACTIVE"
                        checked={formData.status === 'INACTIVE'}
                        onChange={() => setFormData({ ...formData, status: 'INACTIVE' })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-600 text-xs">
                        Tạm ngừng (INACTIVE)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Sticky Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2 shrink-0 sticky bottom-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Đang xử lý...'
                    : editingStore
                      ? 'Lưu thay đổi'
                      : 'Tạo showroom'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XEM CHI TIẾT SHOWROOM */}
      {detailStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Chi tiết Showroom #{detailStore.id}</h3>
              <button
                type="button"
                onClick={() => setDetailStore(null)}
                className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="p-6 space-y-3">
              {detailStore.imageUrl && (
                <img
                  src={detailStore.imageUrl}
                  alt={detailStore.name}
                  className="w-full h-40 object-cover rounded-xl border border-slate-200"
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <span className="text-slate-400 font-semibold block">Tên Showroom</span>
                  <span className="font-bold text-slate-900">{detailStore.name}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-semibold block">Địa chỉ</span>
                  <span className="text-slate-800">{detailStore.address}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Tỉnh / Thành phố</span>
                  <span className="text-slate-800">{detailStore.province}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Quận / Huyện</span>
                  <span className="text-slate-800">{detailStore.district || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Điện thoại</span>
                  <span className="font-mono text-slate-800">{detailStore.phoneNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Giờ mở cửa</span>
                  <span className="text-slate-800">{detailStore.openHours || '08:00 - 22:00'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Tọa độ GPS</span>
                  <span className="font-mono text-slate-700">
                    {detailStore.latitude != null && detailStore.longitude != null
                      ? `${detailStore.latitude}, ${detailStore.longitude}`
                      : 'Chưa cập nhật'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Trạng thái</span>
                  <span className="font-bold text-slate-800">
                    {detailStore.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngừng'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: XÁC NHẬN XÓA SHOWROOM
          ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa showroom</h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa showroom{' '}
                <strong className="text-slate-900">&quot;{deleteTarget.name}&quot;</strong>? Hành động này sẽ
                loại bỏ showroom này khỏi bản đồ tìm kiếm và không thể hoàn tác.
              </p>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xử lý...' : 'Xóa showroom'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStoresPage;
