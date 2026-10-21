import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  RefreshCw,
  Trash2,
  Tag,
  CheckCircle,
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import type { Product } from '../../models/product.model';

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await productService.getProducts({ limit: 100 });
      setProducts(response.data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm #${id}?`)) return;
    try {
      await axiosClient.delete(`${ENDPOINTS.ADMIN_PRODUCTS}/${id}`);
      setMessage('Xóa sản phẩm thành công!');
      fetchProducts();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(`Lỗi khi xóa sản phẩm: ${err.message || 'Thao tác thất bại'}`);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price || 0);
  };

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      !query ||
      p.name.toLowerCase().includes(query) ||
      (p.brand && p.brand.toLowerCase().includes(query)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-600" />
            Quản Lý Sản Phẩm (Products)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách toàn bộ sản phẩm và công cụ quản trị cập nhật kho hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchProducts}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Product List Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Lọc theo tên sản phẩm, thương hiệu, danh mục..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Tổng cộng: <strong className="text-slate-800">{filteredProducts.length}</strong> sản phẩm
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Sản phẩm</th>
                <th className="py-3 px-4">Danh mục</th>
                <th className="py-3 px-4">Thương hiệu</th>
                <th className="py-3 px-4">Đơn giá</th>
                <th className="py-3 px-4">Kho</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                    Đang tải danh sách sản phẩm...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Không tìm thấy sản phẩm nào.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-11 h-11 object-cover rounded-xl border border-slate-200 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block line-clamp-1 max-w-sm">
                            {prod.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            ID: #{prod.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {prod.category?.name || 'Khác'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {prod.brand || '---'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatPrice(prod.price)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          prod.stock > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {prod.stock > 0 ? `${prod.stock} cái` : 'Hết hàng'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Xóa sản phẩm"
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
    </div>
  );
};

export default AdminProductsPage;
