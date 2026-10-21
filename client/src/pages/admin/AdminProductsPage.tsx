import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle2,
  ExternalLink,
  X,
  Star,
  Sparkles,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import { aiService } from '../../api/services/ai.service';
import { formatPrice } from '../../utils/format';
import type { Product, Category, ProductPayload } from '../../models/product.model';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

interface FormState {
  name: string;
  categoryId: number;
  price: string;
  stock: string;
  imageUrl: string;
  description: string;
  status: boolean;
}

const INITIAL_FORM_STATE: FormState = {
  name: '',
  categoryId: 1,
  price: '',
  stock: '20',
  imageUrl: '',
  description: '',
  status: true,
};

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');

  // Detail Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form Modal (Create / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchProductsAndCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        productService.getProducts({ limit: 100 }),
        productService.getCategories(),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes || []);
    } catch (err) {
      console.warn('Lỗi khi tải danh sách sản phẩm admin:', err);
      showToast('Không thể kết nối đến máy chủ để tải sản phẩm', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsAndCategories();
  }, [fetchProductsAndCategories]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const defaultCatId = categories.length > 0 ? categories[0].id : 1;
    setFormData({
      ...INITIAL_FORM_STATE,
      categoryId: defaultCatId,
    });
    setFormErrors({});
    setModalError(null);
    setAiMessage(null);
    setFormMode('create');
    setEditingId(null);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p: Product) => {
    setFormData({
      name: p.name,
      categoryId: p.categoryId || 1,
      price: p.price.toString(),
      stock: (p.stock ?? 0).toString(),
      imageUrl: p.imageUrl || '',
      description: p.description || '',
      status: true,
    });
    setFormErrors({});
    setModalError(null);
    setAiMessage(null);
    setFormMode('edit');
    setEditingId(p.id);
    setIsFormOpen(true);
  };

  // Call AI Description Generator
  const handleGenerateAiDescription = async () => {
    if (!formData.name.trim()) {
      setFormErrors((prev) => ({
        ...prev,
        name: 'Vui lòng nhập tên sản phẩm trước khi tạo mô tả bằng AI',
      }));
      return;
    }

    setFormErrors((prev) => {
      const copy = { ...prev };
      delete copy.name;
      return copy;
    });

    setIsGeneratingAi(true);
    setAiMessage(null);

    try {
      const targetCat = categories.find((c) => c.id === formData.categoryId);
      const catName = targetCat ? targetCat.name : 'Thiết bị công nghệ';
      const aiDesc = await aiService.generateProductDescription(formData.name.trim(), catName);

      setFormData((prev) => ({
        ...prev,
        description: aiDesc,
      }));
      setAiMessage('✨ AI đã tạo xong đoạn mô tả chuẩn SEO chuyên nghiệp!');
      setTimeout(() => setAiMessage(null), 4000);
    } catch (err) {
      console.error('Lỗi khi sinh mô tả AI:', err);
      setAiMessage('⚠️ Có lỗi khi kết nối AI, vui lòng thử lại.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Validate and Submit Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      errors.name = 'Tên sản phẩm không được để trống';
    }
    const numPrice = parseFloat(formData.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      errors.price = 'Giá bán phải là số lớn hơn 0';
    }
    const numStock = parseInt(formData.stock, 10);
    if (isNaN(numStock) || numStock < 0) {
      errors.stock = 'Số lượng tồn kho không được âm';
    }
    if (!formData.categoryId) {
      errors.categoryId = 'Vui lòng chọn danh mục';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const payload: ProductPayload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: numPrice,
      stock: numStock,
      imageUrl:
        formData.imageUrl.trim() ||
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
      categoryId: formData.categoryId,
      status: formData.status,
    };

    try {
      if (formMode === 'create') {
        const newProduct = await productService.createProduct(payload);
        setProducts((prev) => [newProduct, ...prev]);
        showToast(`Đã thêm mới sản phẩm "${newProduct.name}" thành công!`);
      } else if (formMode === 'edit' && editingId !== null) {
        const updated = await productService.updateProduct(editingId, payload);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        showToast(`Đã cập nhật sản phẩm "${updated.name}" thành công!`);
      }
      setIsFormOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu sản phẩm';
      setModalError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Product
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      await productService.deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`Đã xóa sản phẩm "${deleteTarget.name}" khỏi hệ thống!`);
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa sản phẩm';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchBrand = p.brand?.toLowerCase().includes(q) || false;
      const matchId = p.id.toString().includes(q);
      return matchName || matchBrand || matchId;
    }
    return true;
  });

  const totalInStock = products.filter((p) => (p.stock || 0) > 0).length;
  const totalOutOfStock = products.filter((p) => (p.stock || 0) === 0).length;

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification - High z-index to always stay above modals */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-[9999] text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-md pointer-events-auto border backdrop-blur-md transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-slate-900/95 border-slate-700'
              : 'bg-rose-600/95 border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-white shrink-0" />
          )}
          <span className="font-medium flex-1">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white transition cursor-pointer shrink-0"
            title="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-0.5">Quản lý bán hàng</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Quản lý sản phẩm</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {products.length} sản phẩm
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách toàn bộ sản phẩm công nghệ đang được bày bán trong hệ thống NEXOR
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchProductsAndCategories}
            disabled={isLoading}
            className="p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs flex items-center gap-2 text-xs font-semibold"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
          >
            Thêm sản phẩm mới
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Tổng sản phẩm</span>
          <span className="text-xl font-bold text-slate-900">{products.length}</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Còn hàng</span>
          <span className="text-xl font-bold text-emerald-600">{totalInStock}</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Hết hàng</span>
          <span className="text-xl font-bold text-rose-600">{totalOutOfStock}</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Danh mục</span>
          <span className="text-xl font-bold text-blue-600">{categories.length || 6}</span>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-xl">
            <div className="w-full sm:w-72">
              <Input
                type="text"
                placeholder="Tìm tên, thương hiệu, mã..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            {/* Category Filter Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val === 'ALL' ? 'ALL' : Number(val));
              }}
              className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
            >
              <option value="ALL">Tất cả danh mục ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Hiển thị <strong>{filteredProducts.length}</strong> / {products.length} sản phẩm
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Đang đồng bộ danh sách sản phẩm từ hệ thống...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Package className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy sản phẩm</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `Không có sản phẩm nào khớp với "${searchQuery}"`
                : 'Chưa có sản phẩm nào trong danh mục đã chọn.'}
            </p>
          </div>
        )}

        {/* Products Table */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Sản phẩm</th>
                  <th className="py-3 px-4">Danh mục</th>
                  <th className="py-3 px-4">Giá bán</th>
                  <th className="py-3 px-4">Tồn kho</th>
                  <th className="py-3 px-4">Đánh giá</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const stock = p.stock ?? 15;
                  const isInStock = stock > 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition group">
                      {/* Product Thumbnail & Name */}
                      <td className="py-3.5 px-4 min-w-64">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/70 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={
                                p.imageUrl ||
                                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100'
                              }
                              alt={p.name}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100';
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate max-w-xs">
                              {p.name}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              Mã: #{p.id} {p.brand ? `• ${p.brand}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.category?.name || 'Công nghệ'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block text-sm">
                          {formatPrice(p.price)}
                        </span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {formatPrice(p.originalPrice)}
                          </span>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            stock > 10
                              ? 'text-emerald-700'
                              : stock > 0
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {stock} chiếc
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{p.rating || 5.0}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({p.reviewCount || 48})
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isInStock
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{isInStock ? 'Đang kinh doanh' : 'Hết hàng'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: FORM THÊM MỚI / CHỈNH SỬA SẢN PHẨM (KÈM NÚT AI)  */}
      {/* ======================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span>
                    {formMode === 'create'
                      ? 'Thêm sản phẩm công nghệ mới'
                      : `Chỉnh sửa sản phẩm #${editingId}`}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Điền các thông số kỹ thuật và gọi AI tự động sinh mô tả chuẩn SEO
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* In-Modal Error Alert Banner */}
              {modalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 animate-fade-in shadow-xs">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-rose-900">Không thể lưu thông tin sản phẩm</p>
                    <p className="mt-1 leading-relaxed text-rose-700 font-medium">{modalError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalError(null)}
                    className="p-1 hover:bg-rose-100 rounded text-rose-500 hover:text-rose-700 transition cursor-pointer"
                    title="Ẩn thông báo lỗi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Product Name */}
              <div>
                <Input
                  label="Tên sản phẩm *"
                  type="text"
                  placeholder="Ví dụ: Apple iPhone 16 Pro Max 256GB"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) {
                      setFormErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.name;
                        return copy;
                      });
                    }
                  }}
                  error={formErrors.name}
                  required
                />
              </div>

              {/* Category & Price Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Danh mục ngành hàng *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: Number(e.target.value) })
                    }
                    className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-xs font-semibold text-gray-800 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <Input
                    label="Giá bán (VNĐ) *"
                    type="number"
                    min="1000"
                    step="1000"
                    placeholder="30990000"
                    value={formData.price}
                    onChange={(e) => {
                      setFormData({ ...formData, price: e.target.value });
                      if (formErrors.price) {
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.price;
                          return copy;
                        });
                      }
                    }}
                    error={formErrors.price}
                    required
                  />
                </div>
              </div>

              {/* Stock & Image URL Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stock */}
                <div>
                  <Input
                    label="Số lượng tồn kho *"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="15"
                    value={formData.stock}
                    onChange={(e) => {
                      setFormData({ ...formData, stock: e.target.value });
                      if (formErrors.stock) {
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.stock;
                          return copy;
                        });
                      }
                    }}
                    error={formErrors.stock}
                    required
                  />
                </div>

                {/* Image URL */}
                <div>
                  <Input
                    label="Đường dẫn ảnh sản phẩm (URL)"
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    leftIcon={<ImageIcon className="w-4 h-4 text-slate-400" />}
                  />
                </div>
              </div>

              {/* Image Live Preview */}
              {formData.imageUrl && (
                <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100';
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-slate-700 block">Xem trước ảnh sản phẩm</span>
                    <span className="text-[10px] text-slate-400 truncate block">{formData.imageUrl}</span>
                  </div>
                </div>
              )}

              {/* AI Description Generator Section */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Mô tả & Thông số kỹ thuật
                  </label>

                  {/* NÚT AI SINH MÔ TẢ THEO YÊU CẦU CARD [09] / CARD [05] */}
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={isGeneratingAi}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-60"
                    title="Gọi AI tự động tạo đoạn mô tả chuẩn SEO dựa trên tên và danh mục sản phẩm"
                  >
                    {isGeneratingAi ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI đang soạn thảo mô tả...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                        <span>✨ Tạo mô tả bằng AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Notification Alert */}
                {aiMessage && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{aiMessage}</span>
                  </div>
                )}

                <textarea
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nhập mô tả tóm tắt, tính năng nổi bật hoặc nhấn '✨ Tạo mô tả bằng AI' để hệ thống tự động soạn thảo..."
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition resize-y font-mono leading-relaxed"
                />
              </div>

              {/* Status Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Kích hoạt hiển thị và cho phép khách hàng đặt mua (Status = Active)
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  {formMode === 'create' ? 'Tạo mới sản phẩm' : 'Lưu cập nhật'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: XÁC NHẬN XÓA SẢN PHẨM (GỌI API DELETE SERVER)   */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa sản phẩm</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm:
                <br />
                <strong className="text-slate-800 font-bold">"{deleteTarget.name}"</strong> (#{deleteTarget.id})?
                <br />
                <span className="text-rose-600 text-[11px] font-semibold mt-1 block">
                  Hành động này sẽ gửi yêu cầu DELETE lên máy chủ và không thể hoàn tác.
                </span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                isLoading={isDeleting}
                onClick={handleConfirmDelete}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: XEM CHI TIẾT SẢN PHẨM                           */}
      {/* ======================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chi tiết sản phẩm #{selectedProduct.id}</h3>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-4 items-center">
              <div className="w-24 h-24 rounded-xl bg-slate-50 border border-slate-200 p-2 shrink-0 flex items-center justify-center">
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{selectedProduct.name}</h4>
                <p className="text-xs text-slate-500">Danh mục: {selectedProduct.category?.name || 'Công nghệ'}</p>
                <p className="text-base font-black text-blue-600">{formatPrice(selectedProduct.price)}</p>
                <p className="text-xs font-semibold text-emerald-600">
                  Tồn kho: {selectedProduct.stock ?? 15} sản phẩm
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 max-h-48 overflow-y-auto font-mono leading-relaxed whitespace-pre-line">
              <span className="font-bold block text-slate-800 font-sans">Mô tả chi tiết:</span>
              <p>{selectedProduct.description || 'Sản phẩm công nghệ chính hãng NEXOR.'}</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit className="w-3.5 h-3.5" />}
                onClick={() => {
                  const p = selectedProduct;
                  setSelectedProduct(null);
                  handleOpenEditModal(p);
                }}
              >
                Chỉnh sửa
              </Button>
              <Button variant="dark" size="sm" onClick={() => setSelectedProduct(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsPage;
