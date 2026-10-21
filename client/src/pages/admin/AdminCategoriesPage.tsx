import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle,
  X,
  Layers,
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import type { Category } from '../../models/product.model';

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDescription, setNewCatDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

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
      });
      setMessage('Thêm danh mục mới thành công!');
      setShowAddModal(false);
      setNewCatName('');
      setNewCatDescription('');
      fetchCategories();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(`Lỗi khi tạo danh mục: ${err.message || 'Thất bại'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    try {
      await axiosClient.delete(`${ENDPOINTS.CATEGORIES}/${id}`);
      setMessage('Đã xóa danh mục thành công!');
      fetchCategories();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(`Lỗi khi xóa danh mục: ${err.message || 'Thất bại'}`);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-indigo-600" />
            Quản Lý Danh Mục (Categories)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị danh mục ngành hàng, phân loại sản phẩm cho trang thương mại điện tử
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchCategories}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            Thêm Danh Mục
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Category List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm danh mục..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Tổng cộng: <strong className="text-slate-800">{filteredCategories.length}</strong> danh mục
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Tên danh mục</th>
                <th className="py-3 px-4">Slug định danh</th>
                <th className="py-3 px-4">Mô tả</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Đang tải danh mục...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Chưa có danh mục nào.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-400">#{cat.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Layers className="w-4 h-4" />
                      </div>
                      {cat.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{cat.slug}</td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {cat.description || 'Chưa có mô tả'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Xóa danh mục"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCategory}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
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
                placeholder="VD: Smartwatch, Tai nghe Bluetooth..."
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
                placeholder="Mô tả ngành hàng..."
                value={newCatDescription}
                onChange={(e) => setNewCatDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
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
    </div>
  );
};

export default AdminCategoriesPage;
