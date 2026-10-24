import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  X,
  Layers,
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import type { Category } from '../../models/product.model';
import AdminPagination from '../../components/admin/AdminPagination';

const ITEMS_PER_PAGE = 10;

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Create Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDescription, setNewCatDescription] = useState<string>('');
  
  // Edit Modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState<string>('');
  const [editCatSlug, setEditCatSlug] = useState<string>('');
  const [editCatDescription, setEditCatDescription] = useState<string>('');

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await productService.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Lỗi khi tải danh mục:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSubmitting(true);
    try {
      await axiosClient.post(ENDPOINTS.CATEGORIES, {
        name: newCatName.trim(),
        description: newCatDescription.trim() || undefined,
        status: true,
      });
      setMessage('Thêm danh mục mới thành công!');
      setShowAddModal(false);
      setNewCatName('');
      setNewCatDescription('');
      fetchCategories();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(`Lỗi khi thêm danh mục: ${err.response?.data?.message || err.message || 'Thất bại'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;

    setSubmitting(true);
    try {
      await axiosClient.put(`${ENDPOINTS.CATEGORIES}/${editingCategory.id}`, {
        name: editCatName.trim(),
        description: editCatDescription.trim() || undefined,
        status: true,
      });

      setMessage('Đã cập nhật danh mục thành công!');
      setEditingCategory(null);
      fetchCategories();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật danh mục: ${err.response?.data?.message || err.message || 'Thất bại'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      await axiosClient.delete(`${ENDPOINTS.CATEGORIES}/${deleteTarget.id}`);
      setMessage(`Đã xóa danh mục "${deleteTarget.name}" thành công!`);
      setDeleteTarget(null);
      fetchCategories();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(`Lỗi khi xóa danh mục: ${err.response?.data?.message || err.message || 'Thất bại'}`);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      !query ||
      cat.name.toLowerCase().includes(query) ||
      (cat.slug && cat.slug.toLowerCase().includes(query)) ||
      (cat.description && cat.description.toLowerCase().includes(query))
    );
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE) || 1;
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 font-sans select-none overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderTree className="w-6 h-6 text-indigo-600" />
            <span>Quản lý danh mục (Categories)</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {categories.length} danh mục
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị danh mục ngành hàng, phân loại sản phẩm cho trang thương mại điện tử NEXOR
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchCategories}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            Thêm danh mục
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in shrink-0">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Category List Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm danh mục theo tên, slug, mô tả..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Hiển thị <strong>{filteredCategories.length}</strong> / {categories.length} danh mục
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] tracking-wider shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 bg-slate-50">ID</th>
                <th className="py-2.5 px-3 bg-slate-50">Tên danh mục</th>
                <th className="py-2.5 px-3 bg-slate-50">Slug định danh</th>
                <th className="py-2.5 px-3 bg-slate-50">Mô tả</th>
                <th className="py-2.5 px-3 bg-slate-50 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-indigo-500" />
                    Đang tải danh mục từ hệ thống...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Chưa có danh mục nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2 px-3 font-bold text-slate-400">#{cat.id}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{cat.slug}</td>
                    <td className="py-2 px-3 text-slate-500 max-w-xs truncate text-xs">
                      {cat.description || 'Chưa có mô tả'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditCatName(cat.name);
                            setEditCatSlug(cat.slug || '');
                            setEditCatDescription(cat.description || '');
                          }}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                          title="Chỉnh sửa danh mục"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cat)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - 10 rows per page - Pinned to bottom */}
        {!loading && filteredCategories.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-white">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCategories.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: THÊM DANH MỤC MỚI                                 */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleCreateCategory}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 font-sans"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Thêm Danh Mục Mới</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tên danh mục *
              </label>
              <input
                type="text"
                required
                placeholder="VD: Smartwatch, Phụ kiện, Laptop Gaming..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mô tả ngắn
              </label>
              <textarea
                rows={3}
                placeholder="Mô tả ngành hàng, phân loại sản phẩm..."
                value={newCatDescription}
                onChange={(e) => setNewCatDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang tạo...' : 'Tạo Danh Mục'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CHỈNH SỬA DANH MỤC (SỬA)                          */}
      {/* ======================================================== */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleUpdateCategory}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 font-sans"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                Chỉnh Sửa Danh Mục #{editingCategory.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tên danh mục *
              </label>
              <input
                type="text"
                required
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Slug định danh
              </label>
              <input
                type="text"
                value={editCatSlug}
                onChange={(e) => setEditCatSlug(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mô tả
              </label>
              <textarea
                rows={3}
                value={editCatDescription}
                onChange={(e) => setEditCatDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: XÁC NHẬN XÓA DANH MỤC                             */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4 font-sans text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xóa danh mục này?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa danh mục <strong>{deleteTarget.name}</strong>? Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
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

export default AdminCategoriesPage;
