import React from 'react';
import { Package, Plus, Search } from 'lucide-react';

export const AdminProductsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quản Lý Sản Phẩm</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách toàn bộ sản phẩm và công cụ quản trị thêm/sửa/xóa
          </p>
        </div>
        <button
          type="button"
          onClick={() => alert('Chức năng thêm sản phẩm sẽ mở modal CRUD!')}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Thêm Sản Phẩm Mới
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Lọc theo tên sản phẩm..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">Khung Quản Trị Sản Phẩm Sẵn Sàng</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Giao diện kết nối API Sản Phẩm (`/api/admin/products`) của Backend đã được cấu hình sẵn.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminProductsPage;
