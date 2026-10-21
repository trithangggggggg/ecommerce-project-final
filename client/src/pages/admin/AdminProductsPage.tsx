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
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import { formatPrice } from '../../utils/format';
import type { Product, Category } from '../../models/product.model';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsAndCategories();
  }, [fetchProductsAndCategories]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteProduct = (productId: number, productName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}"?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast(`Đã xóa sản phẩm "${productName}"`);
    }
  };

  // Lọc sản phẩm theo tìm kiếm và danh mục
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
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
            Danh sách toàn bộ sản phẩm công nghệ đang được bày bán trong hệ thống E-ShopTECH
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
            onClick={() => alert('Chức năng thêm mới sản phẩm đang được cập nhật form modal!')}
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
              <option value="ALL">Tất cả danh mục</option>
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
            <p className="text-xs text-slate-500">Đang tải danh sách 12 sản phẩm từ hệ thống...</p>
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
                          <span>{p.rating || 4.9}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({p.reviewCount || 42})
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
                            onClick={() => alert(`Chỉnh sửa sản phẩm: ${p.name}`)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
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

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chi tiết sản phẩm #{selectedProduct.id}</h3>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
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
                <p className="text-xs font-semibold text-emerald-600">Tồn kho: {selectedProduct.stock ?? 15} sản phẩm</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold block text-slate-800">Mô tả tóm tắt:</span>
              <p className="line-clamp-3">{selectedProduct.description || 'Sản phẩm công nghệ chính hãng E-ShopTECH.'}</p>
            </div>

            <div className="flex justify-end pt-2">
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
