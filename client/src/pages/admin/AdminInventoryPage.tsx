import React, { useState, useEffect } from 'react';
import {
  Archive,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  MapPin,
  Clock,
  RefreshCw,
} from 'lucide-react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';
import { productService } from '../../api/services/product.service';
import { toSlug } from '../../utils/format';

export interface InventoryItem {
  id: number;
  sku: string;
  productName: string;
  warehouse: string;
  shelfLocation: string;
  quantity: number;
  minStock: number;
  unit: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  lastUpdated: string;
}

const ITEMS_PER_PAGE = 10;

const WAREHOUSE_OPTIONS = [
  'Kho Tổng Miền Bắc (Hà Nội)',
  'Kho Trung Chuyển Đà Nẵng',
  'Kho Tổng Miền Nam (TP.HCM)',
];

export const AdminInventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadRealInventory = async () => {
    setIsLoading(true);
    try {
      const res = await productService.getProducts({ limit: 100 });
      if (res.data && res.data.length > 0) {
        const mapped: InventoryItem[] = res.data.map((p, idx) => {
          const wh = WAREHOUSE_OPTIONS[idx % WAREHOUSE_OPTIONS.length];
          const shelf = `Kệ ${String.fromCharCode(65 + (idx % 4))}${Math.floor(idx / 4) + 1}-0${(idx % 9) + 1}`;
          const qty = typeof p.stock === 'number' ? p.stock : 0;
          const minStock = 5;
          const status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' =
            qty === 0 ? 'OUT_OF_STOCK' : qty <= minStock ? 'LOW_STOCK' : 'IN_STOCK';
          const sku = `SKU-${toSlug(p.name).toUpperCase().substring(0, 10)}-${p.id}`;

          return {
            id: p.id,
            sku,
            productName: p.name,
            warehouse: wh,
            shelfLocation: shelf,
            quantity: qty,
            minStock,
            unit: 'Chiếc',
            status,
            lastUpdated: p.createdAt ? p.createdAt.replace('T', ' ').substring(0, 16) : 'Vừa xong',
          };
        });
        setItems(mapped);
      }
    } catch (e) {
      console.warn('Lỗi khi tải dữ liệu tồn kho từ database:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRealInventory();
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    sku: '',
    productName: '',
    warehouse: WAREHOUSE_OPTIONS[0],
    shelfLocation: '',
    quantity: 20,
    minStock: 5,
    unit: 'Chiếc',
  });

  const [editForm, setEditForm] = useState({
    sku: '',
    productName: '',
    warehouse: '',
    shelfLocation: '',
    quantity: 0,
    minStock: 0,
    unit: 'Chiếc',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add Item Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.sku.trim() || !addForm.productName.trim()) {
      showToast('Vui lòng điền mã SKU và tên sản phẩm!');
      return;
    }

    const qty = Number(addForm.quantity) || 0;
    const minS = Number(addForm.minStock) || 5;
    const status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' =
      qty === 0 ? 'OUT_OF_STOCK' : qty <= minS ? 'LOW_STOCK' : 'IN_STOCK';

    const newItem: InventoryItem = {
      id: Date.now(),
      sku: addForm.sku.trim().toUpperCase(),
      productName: addForm.productName.trim(),
      warehouse: addForm.warehouse,
      shelfLocation: addForm.shelfLocation.trim() || 'Kệ Kho Chính',
      quantity: qty,
      minStock: minS,
      unit: addForm.unit || 'Chiếc',
      status,
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setItems([newItem, ...items]);
    setIsAddOpen(false);
    setAddForm({
      sku: '',
      productName: '',
      warehouse: WAREHOUSE_OPTIONS[0],
      shelfLocation: '',
      quantity: 20,
      minStock: 5,
      unit: 'Chiếc',
    });
    showToast(`Đã nhập kho sản phẩm "${newItem.productName}"`);
  };

  // Open Edit
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      sku: item.sku,
      productName: item.productName,
      warehouse: item.warehouse,
      shelfLocation: item.shelfLocation,
      quantity: item.quantity,
      minStock: item.minStock,
      unit: item.unit,
    });
  };

  // Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const qty = Number(editForm.quantity) || 0;
    const minS = Number(editForm.minStock) || 5;
    const status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' =
      qty === 0 ? 'OUT_OF_STOCK' : qty <= minS ? 'LOW_STOCK' : 'IN_STOCK';

    setItems((prev) =>
      prev.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              sku: editForm.sku.trim().toUpperCase(),
              productName: editForm.productName.trim(),
              warehouse: editForm.warehouse,
              shelfLocation: editForm.shelfLocation.trim(),
              quantity: qty,
              minStock: minS,
              unit: editForm.unit,
              status,
              lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
            }
          : item
      )
    );

    showToast(`Đã cập nhật số lượng tồn kho "${editForm.productName}"!`);
    setEditingItem(null);
  };

  // Delete
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    showToast(`Đã xóa SKU ${deleteTarget.sku} khỏi kho`);
    setDeleteTarget(null);
  };

  // Filter
  const filteredItems = items.filter((item) => {
    if (warehouseFilter !== 'ALL' && item.warehouse !== warehouseFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchName = item.productName.toLowerCase().includes(q);
      const matchLoc = item.shelfLocation.toLowerCase().includes(q);
      const matchWh = item.warehouse.toLowerCase().includes(q);
      return matchSku || matchName || matchLoc || matchWh;
    }
    return true;
  });

  const inStockCount = items.filter((i) => i.status === 'IN_STOCK').length;
  const lowStockCount = items.filter((i) => i.status === 'LOW_STOCK').length;
  const outOfStockCount = items.filter((i) => i.status === 'OUT_OF_STOCK').length;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Archive className="w-6 h-6 text-purple-600" />
            <span>Quản lý tồn kho & Kiểm kê hàng hóa</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {items.length} SKU
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi vị trí lưu trữ, sức chứa kho bãi và cảnh báo lượng hàng tồn an toàn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadRealInventory}
            disabled={isLoading}
            className="p-2 sm:p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-purple-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs flex items-center gap-2 text-xs font-semibold"
            title="Đồng bộ từ Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
            <span>Đồng bộ DB</span>
          </button>
          <Button
            variant="primary"
            size="md"
            className="bg-purple-600 hover:purple-700 text-white border-transparent"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddOpen(true)}
          >
            Nhập kho / Thêm mặt hàng
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tổng thiết bị lưu kho</span>
          <span className="text-lg font-bold text-slate-900">{totalQuantity} chiếc</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Mặt hàng an toàn</span>
          <span className="text-lg font-bold text-emerald-600">{inStockCount} SKU</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Cảnh báo sắp hết</span>
          <span className="text-lg font-bold text-amber-600">{lowStockCount} SKU</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Hết hàng</span>
          <span className="text-lg font-bold text-rose-600">{outOfStockCount} SKU</span>
        </div>
      </div>

      {/* Main Table Card (Dạng bảng) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Search & Filter Toolbar */}
        <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-2xl">
            <div className="w-full sm:w-64">
              <Input
                type="text"
                placeholder="Tìm mã SKU, tên thiết bị, kệ..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            {/* Warehouse select */}
            <select
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="ALL">Tất cả kho ({items.length})</option>
              {WAREHOUSE_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="IN_STOCK">Còn hàng (An toàn)</option>
              <option value="LOW_STOCK">Sắp hết hàng</option>
              <option value="OUT_OF_STOCK">Hết hàng</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Hiển thị <strong>{filteredItems.length}</strong> / {items.length} mặt hàng
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-500 uppercase tracking-wider shadow-2xs">
                <th className="py-2.5 px-3 bg-slate-50/95">Mã SKU</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Tên thiết bị</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Kho & Vị trí kệ</th>
                <th className="py-2.5 px-3 bg-slate-50/95 text-center">Tồn kho</th>
                <th className="py-2.5 px-3 bg-slate-50/95 text-center">Định mức</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Trạng thái kho</th>
                <th className="py-2.5 px-3 bg-slate-50/95">Cập nhật</th>
                <th className="py-2.5 px-3 bg-slate-50/95 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy mặt hàng kho nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition group">
                    {/* SKU */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-xs">
                        {item.sku}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-2 px-3 max-w-[200px]">
                      <span className="font-bold text-slate-900 group-hover:text-purple-600 transition truncate block" title={item.productName}>
                        {item.productName}
                      </span>
                    </td>

                    {/* Warehouse & Shelf */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="text-slate-700 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-purple-500 shrink-0" />
                        <span>{item.warehouse}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-4">
                        Kệ: <strong>{item.shelfLocation}</strong>
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span
                        className={`text-xs font-extrabold ${
                          item.quantity > item.minStock
                            ? 'text-emerald-700'
                            : item.quantity > 0
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {item.quantity}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">{item.unit}</span>
                    </td>

                    {/* Min stock */}
                    <td className="py-2 px-3 text-center whitespace-nowrap text-slate-500 font-medium">
                      {item.minStock} {item.unit}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === 'IN_STOCK'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'LOW_STOCK'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>
                          {item.status === 'IN_STOCK'
                            ? 'An toàn'
                            : item.status === 'LOW_STOCK'
                            ? 'Sắp hết'
                            : 'Hết hàng'}
                        </span>
                      </span>
                    </td>

                    {/* Last updated */}
                    <td className="py-2 px-3 whitespace-nowrap text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.lastUpdated}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                          title="Cập nhật số lượng / kho"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Xóa SKU khỏi kho"
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
        {filteredItems.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-white">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: NHẬP KHO / THÊM MẶT HÀNG MỚI                     */}
      {/* ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Archive className="w-5 h-5 text-purple-600" />
                <span>Nhập kho / Thêm mặt hàng lưu trữ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã SKU thiết bị *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: SKU-IP15-128"
                    value={addForm.sku}
                    onChange={(e) => setAddForm({ ...addForm, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Đơn vị tính</label>
                  <input
                    type="text"
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên sản phẩm thiết bị *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: iPhone 15 Pro Max 256GB..."
                  value={addForm.productName}
                  onChange={(e) => setAddForm({ ...addForm, productName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kho lưu trữ</label>
                  <select
                    value={addForm.warehouse}
                    onChange={(e) => setAddForm({ ...addForm, warehouse: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    {WAREHOUSE_OPTIONS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vị trí kệ hàng</label>
                  <input
                    type="text"
                    placeholder="VD: Kệ A1-05"
                    value={addForm.shelfLocation}
                    onChange={(e) => setAddForm({ ...addForm, shelfLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số lượng nhập kho *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mức tồn an toàn tối thiểu</label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.minStock}
                    onChange={(e) => setAddForm({ ...addForm, minStock: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white border-transparent"
                >
                  Lưu phiếu nhập kho
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CẬP NHẬT TỒN KHO & ĐIỀU CHUYỂN (SỬA)            */}
      {/* ======================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                <span>Cập nhật tồn kho SKU {editingItem.sku}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên sản phẩm thiết bị</label>
                <input
                  type="text"
                  required
                  value={editForm.productName}
                  onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kho lưu trữ</label>
                  <select
                    value={editForm.warehouse}
                    onChange={(e) => setEditForm({ ...editForm, warehouse: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    {WAREHOUSE_OPTIONS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vị trí kệ hàng</label>
                  <input
                    type="text"
                    value={editForm.shelfLocation}
                    onChange={(e) => setEditForm({ ...editForm, shelfLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số lượng tồn kho thực tế *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mức an toàn tối thiểu</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.minStock}
                    onChange={(e) => setEditForm({ ...editForm, minStock: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingItem(null)}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white border-transparent"
                >
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: XÁC NHẬN XÓA SKU KHỎI KHO                        */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4 font-sans text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xóa SKU {deleteTarget.sku}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa bản ghi tồn kho của <strong>{deleteTarget.productName}</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
                onClick={handleDeleteConfirm}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventoryPage;
