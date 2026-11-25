import React, { useState, useEffect, useCallback } from 'react';
import AdminPagination from '../../components/admin/AdminPagination';
import { brandService, type BrandItem } from '../../api/services/brand.service';

const ITEMS_PER_PAGE = 10;

export const AdminBrandsPage: React.FC = () => {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [detailBrand, setDetailBrand] = useState<BrandItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrandItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formStatus, setFormStatus] = useState(true);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await brandService.searchAdminBrands({
        keyword: searchQuery.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        page: currentPage - 1,
        size: ITEMS_PER_PAGE,
      });
      setBrands(res?.content || []);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách thương hiệu';
      showToast('error', msg);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage]);

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);

  const handleOpenAdd = () => {
    setEditingBrand(null);
    setFormName('');
    setFormSlug('');
    setFormCountry('');
    setFormLogoUrl('');
    setFormWebsiteUrl('');
    setFormDescription('');
    setFormDisplayOrder(totalElements + 1);
    setFormStatus(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (brand: BrandItem) => {
    setEditingBrand(brand);
    setFormName(brand.name);
    setFormSlug(brand.slug || '');
    setFormCountry(brand.country || '');
    setFormLogoUrl(brand.logoUrl || '');
    setFormWebsiteUrl(brand.websiteUrl || '');
    setFormDescription(brand.description || '');
    setFormDisplayOrder(brand.displayOrder ?? 0);
    setFormStatus(Boolean(brand.status));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenDetail = async (brand: BrandItem) => {
    setDetailBrand(brand);
    try {
      const fresh = await brandService.getAdminBrandById(brand.id);
      if (fresh) setDetailBrand(fresh);
    } catch {
      // Keep row data
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Vui lòng nhập tên thương hiệu');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const payload = {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        country: formCountry.trim() || undefined,
        logoUrl: formLogoUrl.trim() || undefined,
        websiteUrl: formWebsiteUrl.trim() || undefined,
        description: formDescription.trim() || undefined,
        displayOrder: Number(formDisplayOrder) || 0,
        status: formStatus,
      };
      if (editingBrand) {
        await brandService.updateBrand(editingBrand.id, payload);
        showToast('success', `Đã cập nhật thương hiệu "${payload.name}"`);
      } else {
        await brandService.createBrand(payload);
        showToast('success', `Đã tạo thương hiệu "${payload.name}"`);
      }
      setIsModalOpen(false);
      await fetchBrands();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu thương hiệu thất bại';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (brand: BrandItem) => {
    try {
      await brandService.toggleBrandStatus(brand.id, !brand.status);
      showToast('success', `Đã ${brand.status ? 'ẩn' : 'kích hoạt'} thương hiệu "${brand.name}"`);
      await fetchBrands();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đổi trạng thái thất bại';
      showToast('error', msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await brandService.deleteBrand(deleteTarget.id);
      showToast('success', `Đã xóa thương hiệu "${deleteTarget.name}"`);
      setDeleteTarget(null);
      await fetchBrands();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa thương hiệu thất bại';
      showToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans overflow-hidden">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý Thương hiệu (Brands)
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tabular-nums">
              {totalElements} thương hiệu
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị danh sách hãng công nghệ hiển thị trên bộ lọc trang sản phẩm và thông tin thương hiệu
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void fetchBrands()}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Thêm thương hiệu
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Tìm theo tên thương hiệu, slug, quốc gia..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:max-w-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Đang ẩn</option>
            </select>
          </div>
          <span className="text-xs text-slate-500 font-medium tabular-nums">
            Tổng <strong className="text-slate-800">{totalElements}</strong> thương hiệu
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50/95 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3.5">ID</th>
                <th className="py-3 px-3.5">Thương hiệu</th>
                <th className="py-3 px-3.5">Slug</th>
                <th className="py-3 px-3.5">Quốc gia</th>
                <th className="py-3 px-3.5">Thứ tự</th>
                <th className="py-3 px-3.5">Trạng thái</th>
                <th className="py-3 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Đang tải danh sách thương hiệu...
                  </td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Không tìm thấy thương hiệu phù hợp.
                  </td>
                </tr>
              ) : (
                brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-slate-400 tabular-nums">#{brand.id}</td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {brand.logoUrl ? (
                          <img
                            src={brand.logoUrl}
                            alt={brand.name}
                            className="w-7 h-7 rounded-md object-contain border border-slate-200 bg-white shrink-0"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-extrabold text-slate-600 flex items-center justify-center shrink-0">
                            {brand.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span>{brand.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px]">{brand.slug}</td>
                    <td className="py-2.5 px-3.5 text-slate-600">{brand.country || '—'}</td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-700 tabular-nums">#{brand.displayOrder}</td>
                    <td className="py-2.5 px-3.5">
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(brand)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                          brand.status
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {brand.status ? 'Đang bật' : 'Đang ẩn'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleOpenDetail(brand)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 cursor-pointer"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(brand)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(brand)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 cursor-pointer"
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

        <div className="shrink-0 bg-white">
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalElements}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* View Detail Modal */}
      {detailBrand && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chi tiết Thương hiệu #{detailBrand.id}</h3>
              <button
                type="button"
                onClick={() => setDetailBrand(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Tên thương hiệu</span>
                <span className="font-bold text-slate-900">{detailBrand.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Slug</span>
                <span className="font-mono text-slate-700">{detailBrand.slug}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Quốc gia</span>
                <span className="text-slate-800">{detailBrand.country || 'Chưa cập nhật'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Thứ tự hiển thị</span>
                <span className="font-mono text-slate-800">#{detailBrand.displayOrder}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-semibold block">Website chính thức</span>
                <span className="text-blue-700 break-all">{detailBrand.websiteUrl || 'Chưa cập nhật'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-semibold block">Mô tả</span>
                <p className="text-slate-700 mt-0.5">{detailBrand.description || 'Chưa có mô tả'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingBrand ? `Cập nhật Thương hiệu #${editingBrand.id}` : 'Thêm Thương hiệu Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên thương hiệu *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Slug (tùy chọn)</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="Tự sinh nếu để trống"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quốc gia</label>
                <input
                  type="text"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  placeholder="VD: USA, Hàn Quốc, Đài Loan..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Thứ tự hiển thị</label>
                <input
                  type="number"
                  min={0}
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">URL Logo thương hiệu</label>
                <input
                  type="text"
                  value={formLogoUrl}
                  onChange={(e) => setFormLogoUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Website hãng</label>
                <input
                  type="text"
                  value={formWebsiteUrl}
                  onChange={(e) => setFormWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formStatus}
                    onChange={(e) => setFormStatus(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Hiển thị thương hiệu trên bộ lọc cửa hàng</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-60"
              >
                {isSaving ? 'Đang lưu...' : editingBrand ? 'Lưu thay đổi' : 'Tạo thương hiệu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa Thương hiệu</h3>
            <p className="text-xs text-slate-500">
              Bạn chắc chắn muốn xóa thương hiệu <strong className="text-slate-800">{deleteTarget.name}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDeleteConfirm()}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBrandsPage;

