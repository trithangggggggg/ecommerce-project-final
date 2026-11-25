import React, { useState, useEffect, useCallback } from 'react';
import { categoryApiService } from '../../api/services/category.service';
import type { Category } from '../../models/product.model';
import AdminPagination from '../../components/admin/AdminPagination';

const ITEMS_PER_PAGE = 10;

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatSlug, setNewCatSlug] = useState<string>('');
  const [newCatDescription, setNewCatDescription] = useState<string>('');
  const [newCatOrder, setNewCatOrder] = useState<number>(0);
  const [newCatShowOnHome, setNewCatShowOnHome] = useState<boolean>(true);
  const [newCatStatus, setNewCatStatus] = useState<boolean>(true);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState<string>('');
  const [editCatSlug, setEditCatSlug] = useState<string>('');
  const [editCatDescription, setEditCatDescription] = useState<string>('');
  const [editCatOrder, setEditCatOrder] = useState<number>(0);
  const [editCatShowOnHome, setEditCatShowOnHome] = useState<boolean>(true);
  const [editCatStatus, setEditCatStatus] = useState<boolean>(true);

  const [detailCategory, setDetailCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoryApiService.searchAdminCategories({
        keyword: searchQuery.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        page: currentPage - 1,
        size: ITEMS_PER_PAGE,
      });
      setCategories(res?.content || []);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh mục từ máy chủ';
      showToast('error', msg);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const handleOpenAdd = () => {
    setFormError('');
    setNewCatName('');
    setNewCatSlug('');
    setNewCatDescription('');
    setNewCatOrder(totalElements + 1);
    setNewCatShowOnHome(true);
    setNewCatStatus(true);
    setShowAddModal(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setFormError('');
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatSlug(cat.slug || '');
    setEditCatDescription(cat.description || '');
    setEditCatOrder(cat.displayOrder ?? 0);
    setEditCatShowOnHome(cat.showOnHome !== false);
    setEditCatStatus(cat.status !== false);
  };

  const handleOpenDetail = async (cat: Category) => {
    setDetailCategory(cat);
    try {
      const fresh = await categoryApiService.getAdminCategoryById(cat.id);
      if (fresh) setDetailCategory(fresh);
    } catch {
      // Keep list record on network blip
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setFormError('Vui lòng nhập tên danh mục');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await categoryApiService.createCategory({
        name: newCatName.trim(),
        slug: newCatSlug.trim() || undefined,
        description: newCatDescription.trim() || undefined,
        displayOrder: Number(newCatOrder) || 0,
        showOnHome: newCatShowOnHome,
        status: newCatStatus,
      });
      showToast('success', 'Thêm danh mục mới thành công!');
      setShowAddModal(false);
      await fetchCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi thêm danh mục';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) {
      setFormError('Tên danh mục không được để trống');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await categoryApiService.updateCategory(editingCategory.id, {
        name: editCatName.trim(),
        slug: editCatSlug.trim() || undefined,
        description: editCatDescription.trim() || undefined,
        displayOrder: Number(editCatOrder) || 0,
        showOnHome: editCatShowOnHome,
        status: editCatStatus,
      });
      showToast('success', 'Đã cập nhật danh mục thành công!');
      setEditingCategory(null);
      await fetchCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật danh mục';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    try {
      const nextStatus = cat.status === false;
      await categoryApiService.toggleCategoryStatus(cat.id, nextStatus);
      showToast('success', `Đã ${nextStatus ? 'hiển thị' : 'ẩn'} danh mục "${cat.name}"`);
      await fetchCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đổi trạng thái thất bại';
      showToast('error', msg);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await categoryApiService.deleteCategory(deleteTarget.id);
      showToast('success', `Đã xóa danh mục "${deleteTarget.name}" thành công!`);
      setDeleteTarget(null);
      await fetchCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xóa danh mục';
      showToast('error', msg);
      setDeleteTarget(null);
    } finally {
      setSubmitting(false);
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
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý danh mục (Categories)
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tabular-nums">
              {totalElements} danh mục
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Điều khiển danh mục ngành hàng, thứ tự hiển thị trên Thanh điều hướng và Trang chủ NEXOR
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void fetchCategories()}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition disabled:opacity-60"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition"
          >
            Thêm danh mục
          </button>
        </div>
      </div>

      {/* Category Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <input
              type="text"
              placeholder="Tìm kiếm danh mục theo tên, slug, mô tả..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:max-w-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
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
              <option value="ACTIVE">Đang hiển thị</option>
              <option value="INACTIVE">Đang ẩn</option>
            </select>
            {(searchQuery || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer shrink-0"
              >
                Xóa lọc
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500 font-medium tabular-nums">
            Tổng <strong className="text-slate-800">{totalElements}</strong> danh mục
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50/95 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3.5">ID</th>
                <th className="py-2.5 px-3.5">Tên danh mục</th>
                <th className="py-2.5 px-3.5">Slug</th>
                <th className="py-2.5 px-3.5">Thứ tự</th>
                <th className="py-2.5 px-3.5">Trang chủ</th>
                <th className="py-2.5 px-3.5">Trạng thái</th>
                <th className="py-2.5 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-slate-500">
                    Đang tải danh mục từ hệ thống...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-slate-500">
                    Chưa có danh mục nào phù hợp.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-slate-400 tabular-nums whitespace-nowrap">
                      #{cat.id}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-slate-900">{cat.name}</div>
                      {cat.description && (
                        <div className="text-[11px] text-slate-500 max-w-xs truncate">{cat.description}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {cat.slug}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-700 tabular-nums">
                      #{cat.displayOrder ?? 0}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          cat.showOnHome !== false
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {cat.showOnHome !== false ? 'Có hiển thị' : 'Không'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(cat)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                          cat.status !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {cat.status !== false ? 'Đang bật' : 'Đang ẩn'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleOpenDetail(cat)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 transition cursor-pointer"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 transition cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cat)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition cursor-pointer"
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
      {detailCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chi tiết Danh mục #{detailCategory.id}</h3>
              <button
                type="button"
                onClick={() => setDetailCategory(null)}
                className="px-2.5 py-1 rounded-md font-semibold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 font-semibold block">Tên danh mục</span>
                <span className="font-bold text-slate-900">{detailCategory.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Slug định danh</span>
                <span className="font-mono text-slate-700">{detailCategory.slug}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Thứ tự hiển thị</span>
                <span className="font-mono text-slate-800">#{detailCategory.displayOrder ?? 0}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Số sản phẩm</span>
                <span className="font-bold text-indigo-700">{detailCategory.productCount ?? 0}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Hiển thị Trang chủ</span>
                <span className="font-semibold text-slate-800">
                  {detailCategory.showOnHome !== false ? 'Có' : 'Không'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Trạng thái</span>
                <span className="font-semibold text-slate-800">
                  {detailCategory.status !== false ? 'Đang bật' : 'Đang ẩn'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-semibold block">Mô tả</span>
                <p className="text-slate-700 mt-0.5">{detailCategory.description || 'Chưa có mô tả'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCategory}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4 font-sans text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Thêm Danh Mục Mới</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-2.5 py-1 rounded-md font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {formError}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tên danh mục *</label>
              <input
                type="text"
                required
                placeholder="VD: Smartwatch, Laptop Gaming..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Slug (tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Tự sinh từ tên"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Thứ tự</label>
                <input
                  type="number"
                  min={0}
                  value={newCatOrder}
                  onChange={(e) => setNewCatOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mô tả ngắn</label>
              <textarea
                rows={3}
                value={newCatDescription}
                onChange={(e) => setNewCatDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={newCatShowOnHome}
                  onChange={(e) => setNewCatShowOnHome(e.target.checked)}
                />
                <span>Hiện ở Trang chủ</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={newCatStatus}
                  onChange={(e) => setNewCatStatus(e.target.checked)}
                />
                <span>Kích hoạt ngay</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang tạo...' : 'Tạo Danh Mục'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Edit */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateCategory}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4 font-sans text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 tabular-nums">
                Chỉnh Sửa Danh Mục #{editingCategory.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-2.5 py-1 rounded-md font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {formError}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tên danh mục *</label>
              <input
                type="text"
                required
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Slug định danh</label>
                <input
                  type="text"
                  value={editCatSlug}
                  onChange={(e) => setEditCatSlug(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Thứ tự</label>
                <input
                  type="number"
                  min={0}
                  value={editCatOrder}
                  onChange={(e) => setEditCatOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mô tả</label>
              <textarea
                rows={3}
                value={editCatDescription}
                onChange={(e) => setEditCatDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editCatShowOnHome}
                  onChange={(e) => setEditCatShowOnHome(e.target.checked)}
                />
                <span>Hiện ở Trang chủ</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editCatStatus}
                  onChange={(e) => setEditCatStatus(e.target.checked)}
                />
                <span>Hiển thị trên Store</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 font-sans text-center">
            <h3 className="text-base font-bold text-slate-900">Xóa danh mục này?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Bạn có chắc chắn muốn xóa danh mục <strong className="text-slate-800">{deleteTarget.name}</strong>?
            </p>
            <div className="flex justify-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleDeleteCategory()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesPage;
