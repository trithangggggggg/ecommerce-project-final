import React, { useState, useEffect } from 'react';
import {
  Archive,
  Plus,
  Search,
  Edit,
  X,
  CheckCircle2,
  MapPin,
  Clock,
  RefreshCw,
  FileText,
  Calendar,
  Building2,
  User,
  Trash2,
  Save,
  Package,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';
import { productService } from '../../api/services/product.service';
import { supplierService } from '../../api/services/supplier.service';
import { useAuthStore } from '../../store';
import { toSlug } from '../../utils/format';
import type { ProductVariant } from '../../models/product.model';

export interface ImportReceiptRow {
  productId: number;
  productName: string;
  variantId: number;
  variantTitle: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  currentStock: number;
}

export interface EditVariantStock {
  id: number;
  sku: string;
  title: string;
  stock: number;
  price?: number;
}

export interface InventoryItem {
  id: number;
  sku: string;
  productName: string;
  warehouse: string;
  shelfLocation: string;
  quantity: number;
  minStock: number;
  unit: string;
  status: 'IN_STOCK' | 'OUT_OF_STOCK';
  lastUpdated: string;
  price?: number;
  variants?: ProductVariant[];
}

const ITEMS_PER_PAGE = 10;

const WAREHOUSE_OPTIONS = [
  'Kho Tổng Miền Bắc (Hà Nội)',
  'Kho Trung Chuyển Đà Nẵng',
  'Kho Tổng Miền Nam (TP.HCM)',
];

const LOCATION_STORAGE_KEY = 'inventory_locations_v1';

const getSavedLocationMap = (): Record<number, { warehouse: string; shelfLocation?: string }> => {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLocationMap = (map: Record<number, { warehouse: string; shelfLocation?: string }>) => {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(map));
  } catch {}
};

export const AdminInventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<number, boolean>>({});

  const toggleExpand = (id: number) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadRealInventory = async (isManual = false) => {
    setIsLoading(true);
    try {
      const res = await productService.getProducts({ limit: 100 });
      if (res.data && res.data.length > 0) {
        const locMap = getSavedLocationMap();
        const mapped: InventoryItem[] = res.data.map((p, idx) => {
          const savedLoc = locMap[p.id];
          const wh = savedLoc?.warehouse || WAREHOUSE_OPTIONS[idx % WAREHOUSE_OPTIONS.length];
          const shelf = savedLoc?.shelfLocation || `Kệ ${String.fromCharCode(65 + (idx % 4))}${Math.floor(idx / 4) + 1}-0${(idx % 9) + 1}`;
          const qty = typeof p.stock === 'number' ? p.stock : 0;
          const minStock = 5;
          const status: 'IN_STOCK' | 'OUT_OF_STOCK' = qty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
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
            price: typeof p.price === 'number' ? p.price : 0,
            variants: p.variants || [],
          };
        });
        setItems(mapped);
        if (isManual) {
          showToast(`Đã đồng bộ ${mapped.length} mặt hàng từ cơ sở dữ liệu!`);
        }
      } else {
        setItems([]);
        if (isManual) {
          showToast('Chưa có sản phẩm nào trong cơ sở dữ liệu');
        }
      }
    } catch (err: unknown) {
      console.error('Lỗi khi tải kho hàng:', err);
      showToast('Không thể kết nối đến máy chủ Backend');
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

  const { user } = useAuthStore();
  const [supplierOptions, setSupplierOptions] = useState<string[]>([
    'Apple Vietnam Authorized Distributor',
    'Samsung Electronics Vina Corporation',
    'FPT Synnex Distribution Co., Ltd',
    'DGW - Digiworld Corporation',
    'PSD - Petrosetco Distribution',
    'Vĩnh Xuân Computer (SPC)',
    'Viễn Sơn Distribution (Micro-Star)',
    'KTC Co., Ltd (Khải Thiên)',
    'Mega Technology Group',
    'Logitech Vietnam Representative Office',
    'LG Electronics Vietnam Hải Phòng',
    'Audio Technica & Marshall VN Distro',
  ]);

  const [receiptForm, setReceiptForm] = useState({
    receiptCode: 'PN20261103-001',
    importDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    importerName: '',
    warehouse: '',
    note: 'Nhập hàng theo đơn đặt hàng số #DH123',
  });

  // Mặc định danh sách sản phẩm nhập có 1 dòng trống
  const [importRows, setImportRows] = useState<ImportReceiptRow[]>([
    {
      productId: 0,
      productName: '',
      variantId: 0,
      variantTitle: '',
      sku: '',
      quantity: 1,
      unitPrice: 0,
      currentStock: 0,
    },
  ]);

  useEffect(() => {
    supplierService
      .getSuppliers()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((s) => s.name).filter(Boolean);
          if (names.length > 0) {
            setSupplierOptions(names);
          }
        }
      })
      .catch(() => { });
  }, []);

  const handleOpenAdd = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rand = Math.floor(100 + Math.random() * 900);
    const code = `PN${yyyy}${mm}${dd}-${rand}`;

    setReceiptForm({
      receiptCode: code,
      importDate: new Date().toISOString().split('T')[0],
      supplierName: '',
      importerName: '',
      warehouse: '',
      note: 'Nhập hàng theo đơn đặt hàng số #DH123',
    });

    setImportRows([
      {
        productId: 0,
        productName: '',
        variantId: 0,
        variantTitle: '',
        sku: '',
        quantity: 1,
        unitPrice: 0,
        currentStock: 0,
      },
    ]);

    setIsAddOpen(true);
  };

  const handleAddImportRow = () => {
    setImportRows((prev) => [
      ...prev,
      {
        productId: 0,
        productName: '',
        variantId: 0,
        variantTitle: '',
        sku: '',
        quantity: 1,
        unitPrice: 0,
        currentStock: 0,
      },
    ]);
  };

  const handleRemoveImportRow = (idx: number) => {
    if (importRows.length <= 1) {
      setImportRows([
        {
          productId: 0,
          productName: '',
          variantId: 0,
          variantTitle: '',
          sku: '',
          quantity: 1,
          unitPrice: 0,
          currentStock: 0,
        },
      ]);
    } else {
      setImportRows((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleImportRowChange = (idx: number, updates: Partial<ImportReceiptRow>) => {
    setImportRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...updates } : row))
    );
  };

  // Chọn sản phẩm cho dòng nhập (Không tự động chọn biến thể)
  const handleProductSelect = (rowIdx: number, productIdStr: string) => {
    const prodId = Number(productIdStr);
    const prod = items.find((p) => p.id === prodId);

    if (!prod) {
      handleImportRowChange(rowIdx, {
        productId: 0,
        productName: '',
        variantId: 0,
        variantTitle: '',
        sku: '',
        unitPrice: 0,
        currentStock: 0,
      });
      return;
    }

    // Khi chọn sản phẩm, KHÔNG TỰ ĐỘNG CHỌN BIẾN THỂ
    // Để trống variantId = 0 để người dùng chủ động chọn biến thể mong muốn
    handleImportRowChange(rowIdx, {
      productId: prod.id,
      productName: prod.productName,
      variantId: 0,
      variantTitle: '',
      sku: '',
      unitPrice: 0,
      currentStock: 0,
    });
  };

  // Chọn biến thể cho dòng nhập
  const handleVariantSelect = (rowIdx: number, variantIdStr: string) => {
    const varId = Number(variantIdStr);
    const row = importRows[rowIdx];
    const prod = items.find((p) => p.id === row.productId);
    if (!prod || !prod.variants) return;

    if (!varId || varId === 0) {
      handleImportRowChange(rowIdx, {
        variantId: 0,
        variantTitle: '',
        sku: '',
        unitPrice: 0,
        currentStock: 0,
      });
      return;
    }

    const foundVar = prod.variants.find((v) => v.id === varId);
    if (foundVar) {
      handleImportRowChange(rowIdx, {
        variantId: foundVar.id,
        variantTitle: foundVar.title || foundVar.sku || 'Tiêu chuẩn',
        sku: foundVar.sku,
        unitPrice: foundVar.originalPrice || foundVar.price || 0,
        currentStock: foundVar.stock ?? 0,
      });
    }
  };

  // Thêm dòng biến thể khác cho cùng sản phẩm này
  const handleAddVariantRowForProduct = (rowIdx: number) => {
    const row = importRows[rowIdx];
    const prod = items.find((p) => p.id === row.productId);
    if (!prod) return;

    const newRow: ImportReceiptRow = {
      productId: prod.id,
      productName: prod.productName,
      variantId: 0,
      variantTitle: '',
      sku: '',
      quantity: 1,
      unitPrice: 0,
      currentStock: 0,
    };

    setImportRows((prev) => [
      ...prev.slice(0, rowIdx + 1),
      newRow,
      ...prev.slice(rowIdx + 1),
    ]);

    showToast(`Đã thêm dòng chọn biến thể cho "${prod.productName}"`);
  };

  // State & Handler tạo biến thể mới cho sản phẩm trực tiếp từ popup nhập kho
  const [isNewVariantOpen, setIsNewVariantOpen] = useState(false);
  const [targetProductForVariant, setTargetProductForVariant] = useState<InventoryItem | null>(null);
  const [targetRowIdxForVariant, setTargetRowIdxForVariant] = useState<number | null>(null);
  const [newVariantForm, setNewVariantForm] = useState({
    title: '',
    sku: '',
    price: 0,
    originalPrice: 0,
  });

  const handleOpenCreateVariant = (productId: number, rowIdx: number) => {
    const prod = items.find((p) => p.id === productId);
    if (!prod) return;

    setTargetProductForVariant(prod);
    setTargetRowIdxForVariant(rowIdx);
    const rand = Math.floor(100 + Math.random() * 900);
    const suggestedSku = `SKU-${toSlug(prod.productName).toUpperCase().substring(0, 6)}-VAR-${rand}`;

    setNewVariantForm({
      title: '',
      sku: suggestedSku,
      price: prod.price || 0,
      originalPrice: prod.price || 0,
    });
    setIsNewVariantOpen(true);
  };

  const handleCreateVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductForVariant || targetRowIdxForVariant === null) return;
    if (!newVariantForm.title.trim()) {
      showToast('Vui lòng nhập tên phân loại / biến thể!');
      return;
    }

    try {
      setIsLoading(true);
      const res = await productService.createVariant(targetProductForVariant.id, {
        title: newVariantForm.title.trim(),
        sku: newVariantForm.sku.trim() || undefined,
        price: Number(newVariantForm.price) || targetProductForVariant.price || 0,
        originalPrice: Number(newVariantForm.originalPrice) || undefined,
        stock: 0,
      });

      const newVar: ProductVariant = {
        id: res.id,
        productId: targetProductForVariant.id,
        sku: res.sku,
        title: res.title || newVariantForm.title.trim(),
        price: res.price || newVariantForm.price,
        originalPrice: res.originalPrice || newVariantForm.originalPrice,
        stock: res.stock ?? 0,
        status: true,
      };

      // Cập nhật danh sách biến thể của sản phẩm trong state items
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === targetProductForVariant.id) {
            const currentVars = item.variants || [];
            return {
              ...item,
              variants: [...currentVars, newVar],
            };
          }
          return item;
        })
      );

      // Tự động chọn biến thể mới tạo cho dòng này
      handleImportRowChange(targetRowIdxForVariant, {
        variantId: newVar.id,
        variantTitle: newVar.title || newVar.sku,
        sku: newVar.sku,
        unitPrice: newVar.originalPrice || newVar.price || 0,
        currentStock: 0,
      });

      setIsNewVariantOpen(false);
      showToast(`Đã tạo thành công biến thể "${newVar.title}" cho sản phẩm!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo biến thể mới';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Tiện ích: Thêm nhanh toàn bộ các biến thể của sản phẩm đang chọn
  const handleAddAllVariantsForProduct = (rowIdx: number) => {
    const row = importRows[rowIdx];
    const prod = items.find((p) => p.id === row.productId);
    if (!prod || !prod.variants || prod.variants.length === 0) return;

    const newRows: ImportReceiptRow[] = prod.variants.map((v) => ({
      productId: prod.id,
      productName: prod.productName,
      variantId: v.id,
      variantTitle: v.title || v.sku || 'Tiêu chuẩn',
      sku: v.sku,
      quantity: 1,
      unitPrice: v.originalPrice || v.price || 0,
      currentStock: v.stock ?? 0,
    }));

    setImportRows((prev) => [
      ...prev.slice(0, rowIdx),
      ...newRows,
      ...prev.slice(rowIdx + 1),
    ]);

    showToast(`Đã thêm toàn bộ ${newRows.length} biến thể của "${prod.productName}" vào phiếu nhập`);
  };

  const totalReceiptAmount = importRows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
    0
  );
  const totalReceiptQuantity = importRows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0),
    0
  );

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptForm.receiptCode.trim()) {
      showToast('Vui lòng điền mã phiếu nhập!');
      return;
    }
    if (!receiptForm.supplierName.trim()) {
      showToast('Vui lòng chọn nhà cung cấp!');
      return;
    }
    if (!receiptForm.importerName.trim()) {
      showToast('Vui lòng nhập tên người nhập!');
      return;
    }
    if (!receiptForm.warehouse.trim()) {
      showToast('Vui lòng chọn kho tiếp nhận hàng!');
      return;
    }

    const validRows = importRows.filter((r) => r.productName.trim() && r.quantity > 0);
    if (validRows.length === 0) {
      showToast('Vui lòng chọn ít nhất một sản phẩm cần nhập kho!');
      return;
    }

    // Kiểm tra: nếu sản phẩm có biến thể thì bắt buộc phải chọn biến thể cụ thể
    for (let i = 0; i < importRows.length; i++) {
      const r = importRows[i];
      if (r.productId > 0) {
        const prod = items.find((p) => p.id === r.productId);
        const hasVariants = prod && prod.variants && prod.variants.length > 0;
        if (hasVariants && (!r.variantId || r.variantId === 0)) {
          showToast(`Dòng ${i + 1}: Vui lòng chọn biến thể cho "${r.productName}"!`);
          return;
        }
      }
    }

    try {
      setIsLoading(true);

      // Cập nhật tồn kho từng biến thể trực tiếp vào Database backend (isDelta = true: tăng thêm tồn kho)
      for (const row of validRows) {
        if (row.variantId > 0) {
          try {
            await productService.updateVariantStock(row.variantId, row.quantity, true);
          } catch {
            if (row.productId > 0) {
              const currentProd = items.find((it) => it.id === row.productId);
              await productService.updateProductStock(row.productId, (currentProd?.quantity || 0) + row.quantity);
            }
          }
        } else if (row.productId > 0) {
          const currentProd = items.find((it) => it.id === row.productId);
          await productService.updateProductStock(row.productId, (currentProd?.quantity || 0) + row.quantity);
        }
      }

      // Lưu thông tin kho tiếp nhận cho các sản phẩm vừa nhập
      const locMap = getSavedLocationMap();
      validRows.forEach((r) => {
        if (r.productId > 0) {
          locMap[r.productId] = {
            warehouse: receiptForm.warehouse,
            shelfLocation: locMap[r.productId]?.shelfLocation || 'Kệ A1-01',
          };
        }
      });
      saveLocationMap(locMap);

      await loadRealInventory();
      setIsAddOpen(false);
      showToast(
        `Đã lưu phiếu nhập kho "${receiptForm.receiptCode}" thành công! (${totalReceiptQuantity} chiếc, ${totalReceiptAmount.toLocaleString('vi-VN')} VNĐ)`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu phiếu nhập';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const [editForm, setEditForm] = useState({
    sku: '',
    productName: '',
    warehouse: '',
    shelfLocation: '',
    quantity: 0,
    minStock: 0,
    unit: 'Chiếc',
  });

  const [editVariantRows, setEditVariantRows] = useState<EditVariantStock[]>([]);

  // Open Edit
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    const variantsList: EditVariantStock[] = (item.variants && item.variants.length > 0)
      ? item.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        title: v.title || v.sku || 'Tiêu chuẩn',
        stock: typeof v.stock === 'number' ? v.stock : 0,
        price: v.price,
      }))
      : [];
    setEditVariantRows(variantsList);

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

  const handleEditVariantStockChange = (varId: number, newStock: number) => {
    setEditVariantRows((prev) => {
      const updated = prev.map((v) => (v.id === varId ? { ...v, stock: Math.max(0, newStock) } : v));
      const totalStock = updated.reduce((sum, v) => sum + v.stock, 0);
      setEditForm((f) => ({ ...f, quantity: totalStock }));
      return updated;
    });
  };

  // Edit Submit (Hướng 2: Cập nhật chi tiết theo từng biến thể)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsLoading(true);
    try {
      let finalQty = Number(editForm.quantity) || 0;

      // 1. Nếu sản phẩm có biến thể, gọi API cập nhật tồn kho từng biến thể
      if (editVariantRows.length > 0) {
        await Promise.all(
          editVariantRows.map((v) =>
            productService.updateVariantStock(v.id, v.stock, false)
          )
        );
        finalQty = editVariantRows.reduce((sum, v) => sum + v.stock, 0);
      } else {
        // 2. Nếu là sản phẩm đơn bản không có biến thể con
        await productService.updateProductStock(editingItem.id, finalQty);
      }

      const status: 'IN_STOCK' | 'OUT_OF_STOCK' = finalQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';

      // Lưu thông tin vị trí kho và kệ hàng vào local persistence
      const locMap = getSavedLocationMap();
      locMap[editingItem.id] = {
        warehouse: editForm.warehouse,
        shelfLocation: editForm.shelfLocation.trim(),
      };
      saveLocationMap(locMap);

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== editingItem.id) return item;

          const updatedVariants = item.variants?.map((v) => {
            const found = editVariantRows.find((ev) => ev.id === v.id);
            return found ? { ...v, stock: found.stock } : v;
          });

          return {
            ...item,
            warehouse: editForm.warehouse,
            shelfLocation: editForm.shelfLocation.trim(),
            quantity: finalQty,
            status,
            variants: updatedVariants || item.variants,
            lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
        })
      );

      showToast(`Đã cập nhật tồn kho "${editingItem.productName}" (${finalQty} chiếc) thành công!`);
      setEditingItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật số lượng tồn kho';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsLoading(false);
    }
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
            <Archive className="w-6 h-6 text-blue-600" />
            <span>Quản lý kho</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {items.length} SKU
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi và quản lý hàng hóa trong kho
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadRealInventory(true)}
            disabled={isLoading}
            className="p-2 sm:p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs flex items-center gap-2 text-xs font-semibold"
            title="Đồng bộ từ Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Đồng bộ DB</span>
          </button>
          <Button
            variant="primary"
            size="md"
            className="bg-blue-600 hover:bg-blue-700 text-white border-transparent"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAdd}
          >
            Nhập kho
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tổng thiết bị lưu kho</span>
          <span className="text-lg font-bold text-slate-900">{totalQuantity} chiếc</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Còn hàng</span>
          <span className="text-lg font-bold text-emerald-600">{inStockCount} SKU</span>
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
                setStatusFilter(e.target.value as 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK');
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="IN_STOCK">Còn hàng</option>
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
                <th className="py-2.5 px-3.5 bg-slate-50/95">Mã SKU</th>
                <th className="py-2.5 px-3.5 bg-slate-50/95">Tên thiết bị</th>
                <th className="py-2.5 px-3.5 bg-slate-50/95">Kho & Vị trí kệ</th>
                <th className="py-2.5 px-3.5 bg-slate-50/95 text-center">Tồn kho</th>
                <th className="py-2.5 px-3.5 bg-slate-50/95">Trạng thái kho</th>
                <th className="py-2.5 px-3.5 bg-slate-50/95">Cập nhật</th>
                <th className="py-2.5 px-3.5 bg-slate-50/95 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy mặt hàng kho nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-slate-50/70 transition group">
                      {/* SKU */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-xs">
                          {item.sku}
                        </span>
                      </td>

                      {/* Name & Variants Toggle */}
                      <td className="py-2.5 px-3.5 max-w-[260px]">
                        <div className="flex items-center gap-1.5">
                          {item.variants && item.variants.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(item.id)}
                              className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer shrink-0"
                              title={expandedProductIds[item.id] ? "Thu gọn biến thể" : "Xem chi tiết biến thể"}
                            >
                              {expandedProductIds[item.id] ? (
                                <ChevronDown className="w-3.5 h-3.5 text-purple-600" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-900 group-hover:text-purple-600 transition truncate block text-xs sm:text-[13px]" title={item.productName}>
                              {item.productName}
                            </span>
                            {item.variants && item.variants.length > 0 && (
                              <span className="text-[10px] text-purple-600 font-semibold inline-flex items-center gap-0.5 mt-0.5">
                                <Layers className="w-2.5 h-2.5" /> {item.variants.length} phân loại
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Warehouse & Shelf */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="text-slate-800 font-semibold flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3 text-purple-500 shrink-0" />
                          <span>{item.warehouse}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block ml-4 mt-0.5">
                          Kệ: <strong>{item.shelfLocation}</strong>
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`text-xs font-extrabold ${item.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                        >
                          {item.quantity}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">{item.unit}</span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${item.status === 'IN_STOCK'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{item.status === 'IN_STOCK' ? 'Còn hàng' : 'Hết hàng'}</span>
                        </span>
                      </td>

                      {/* Last updated */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.lastUpdated}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Cập nhật số lượng / kho"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Sub-row: Variant detail list if expanded */}
                    {expandedProductIds[item.id] && item.variants && item.variants.length > 0 && (
                      <tr className="bg-purple-50/25 border-b border-slate-200/60">
                        <td colSpan={7} className="py-2.5 px-4">
                          <div className="pl-6 border-l-2 border-purple-400 space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-purple-600" />
                                <span>Phân loại chi tiết của {item.productName} ({item.variants.length} biến thể):</span>
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Tổng kho: <strong className="text-purple-700 font-mono">{item.quantity}</strong> chiếc
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                              {item.variants.map((v) => (
                                <div
                                  key={v.id}
                                  className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-800 block text-xs truncate">
                                      {v.title || v.sku}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 block truncate">
                                      SKU: {v.sku}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span
                                      className={`text-xs font-black block ${(v.stock ?? 0) > 0 ? 'text-emerald-600' : 'text-rose-600'
                                        }`}
                                    >
                                      {v.stock ?? 0} chiếc
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-semibold">
                                      {v.price ? `${v.price.toLocaleString('vi-VN')} đ` : ''}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
      {/* MODAL 1: NHẬP KHO (PHƯƠNG ÁN 1: TÁCH CỘT BIẾN THỂ)       */}
      {/* ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl sm:max-w-5xl w-full p-4 sm:p-5 shadow-2xl font-sans max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <Package className="w-4 h-4" />
                </div>
                <span>Tạo phiếu nhập kho</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiptSubmit} className="flex-1 min-h-0 flex flex-col text-xs pt-2">
              {/* Form Info Cố định phía trên (Không bị cuộn) */}
              <div className="shrink-0 space-y-2 mb-2">
                {/* Row 1: Mã phiếu nhập & Ngày nhập */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">
                      Mã phiếu nhập <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={receiptForm.receiptCode}
                        onChange={(e) => setReceiptForm({ ...receiptForm, receiptCode: e.target.value })}
                        placeholder="VD: PN20250614-001"
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">
                      Ngày nhập <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="date"
                        required
                        value={receiptForm.importDate}
                        onChange={(e) => setReceiptForm({ ...receiptForm, importDate: e.target.value })}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Nhà cung cấp & Kho tiếp nhận */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">
                      Nhà cung cấp <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <select
                        value={receiptForm.supplierName}
                        onChange={(e) => setReceiptForm({ ...receiptForm, supplierName: e.target.value })}
                        className="w-full pl-8 pr-8 py-1.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs cursor-pointer"
                      >
                        <option value="">-- Chọn nhà cung cấp --</option>
                        {supplierOptions.map((sup) => (
                          <option key={sup} value={sup}>
                            {sup}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">
                      Kho tiếp nhận hàng <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <select
                        value={receiptForm.warehouse}
                        onChange={(e) => setReceiptForm({ ...receiptForm, warehouse: e.target.value })}
                        className="w-full pl-8 pr-8 py-1.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs cursor-pointer text-slate-800"
                      >
                        <option value="">-- Chọn kho tiếp nhận hàng --</option>
                        {WAREHOUSE_OPTIONS.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Row 3: Người nhập & Ghi chú */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">
                      Người nhập <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={receiptForm.importerName}
                        onChange={(e) => setReceiptForm({ ...receiptForm, importerName: e.target.value })}
                        placeholder={user?.fullName || 'Quản trị viên Hệ thống'}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">Ghi chú đơn</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={receiptForm.note}
                        onChange={(e) => setReceiptForm({ ...receiptForm, note: e.target.value })}
                        placeholder="Nhập hàng theo đơn đặt hàng số #DH123"
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Danh sách sản phẩm nhập (Chỉ cuộn ở phần table này) */}
              <div className="flex-1 min-h-0 flex flex-col pt-1">
                <div className="flex items-center justify-between mb-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white shadow-2xs">
                      <Package className="w-2.5 h-2.5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 tracking-wide">
                      Danh sách sản phẩm nhập
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Hỗ trợ chọn chi tiết phân loại (Dung lượng, Màu sắc, ...)
                  </span>
                </div>

                {/* Table Container - CUỘN DUY NHẤT TRONG TABLE NÀY (ĐÃ ẨN THANH SCROLL) */}
                <div className="flex-1 min-h-[160px] max-h-[360px] sm:max-h-[400px] border border-slate-200 rounded-xl overflow-x-auto overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold shadow-2xs">
                      <tr>
                        <th className="py-2.5 px-2 text-center w-10 bg-slate-50">STT</th>
                        <th className="py-2.5 px-3 min-w-[200px] bg-slate-50">Sản phẩm *</th>
                        <th className="py-2.5 px-3 min-w-[230px] bg-slate-50">Biến thể / Phân loại *</th>
                        <th className="py-2.5 px-2 text-center w-24 bg-slate-50">Số lượng *</th>
                        <th className="py-2.5 px-3 text-right w-32 bg-slate-50">Đơn giá (VNĐ)</th>
                        <th className="py-2.5 px-3 text-right w-32 bg-slate-50">Thành tiền (VNĐ)</th>
                        <th className="py-2.5 px-2 text-center w-12 bg-slate-50">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {importRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center">
                              <Package className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
                              <p className="text-xs font-semibold text-slate-600">
                                Danh sách sản phẩm nhập đang để trống
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Nhấn nút{' '}
                                <button
                                  type="button"
                                  onClick={handleAddImportRow}
                                  className="text-blue-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-0.5 mx-1"
                                >
                                  <Plus className="w-3 h-3 inline" /> Thêm sản phẩm
                                </button>{' '}
                                bên dưới để chọn sản phẩm cần nhập kho
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        importRows.map((row, idx) => {
                          const currentProd = items.find((p) => p.id === row.productId);
                          const prodVariants = currentProd?.variants || [];

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition">
                              {/* STT */}
                              <td className="py-2 px-2 text-center font-bold text-slate-600 align-top pt-2.5">
                                {idx + 1}
                              </td>

                              {/* Cột 1: Tên sản phẩm */}
                              <td className="py-2 px-3 align-top">
                                <select
                                  value={row.productId ? String(row.productId) : ''}
                                  onChange={(e) => handleProductSelect(idx, e.target.value)}
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                                >
                                  <option value="">-- Chọn sản phẩm nhập --</option>
                                  {items.map((it) => (
                                    <option key={it.id} value={it.id}>
                                      {it.productName}
                                    </option>
                                  ))}
                                </select>
                                {row.productId > 0 && currentProd && (
                                  <div className="mt-1 text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                    <span>Tổng kho: <strong className="text-slate-700">{currentProd.quantity}</strong> chiếc</span>
                                    {prodVariants.length > 0 && (
                                      <span className="text-purple-600 font-semibold">
                                        ({prodVariants.length} biến thể)
                                      </span>
                                    )}
                                    {receiptForm.warehouse ? (
                                      <span className="text-blue-600 font-medium inline-flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                                        <MapPin className="w-2.5 h-2.5 inline text-blue-500" /> Nhập về: {receiptForm.warehouse}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 font-medium inline-flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                                        <MapPin className="w-2.5 h-2.5 inline text-slate-400" /> Chưa chọn kho nhận
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Cột 2: Biến thể / Phân loại (Cascading dropdown - KHÔNG tự động chọn) */}
                              <td className="py-2 px-3 align-top">
                                {!row.productId ? (
                                  <select
                                    disabled
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-400 outline-none cursor-not-allowed"
                                  >
                                    <option>-- Chọn sản phẩm trước --</option>
                                  </select>
                                ) : (
                                  <div className="space-y-1.5">
                                    <select
                                      value={row.variantId ? String(row.variantId) : ''}
                                      onChange={(e) => {
                                        if (e.target.value === '__CREATE_NEW__') {
                                          handleOpenCreateVariant(row.productId, idx);
                                        } else {
                                          handleVariantSelect(idx, e.target.value);
                                        }
                                      }}
                                      className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition ${!row.variantId
                                        ? 'border-amber-300 bg-amber-50/40 text-amber-900 ring-1 ring-amber-300/40'
                                        : 'border-blue-300 bg-blue-50/20 text-slate-800'
                                        }`}
                                    >
                                      <option value="">-- Chọn biến thể (Dung lượng, Màu sắc...) --</option>
                                      {prodVariants.map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.title || v.sku || 'Tiêu chuẩn'} - [Tồn: {v.stock ?? 0}]
                                        </option>
                                      ))}
                                      <option value="__CREATE_NEW__" className="text-purple-700 font-bold bg-purple-50">
                                        + Thêm biến thể mới cho sản phẩm này...
                                      </option>
                                    </select>

                                    {/* Action toolbar & Status below dropdown */}
                                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 px-0.5">
                                      <div>
                                        {row.variantId > 0 ? (
                                          <span>
                                            SKU: <span className="font-mono font-bold text-purple-700">{row.sku || 'N/A'}</span>
                                            <span className="ml-1 text-slate-400 font-normal">| Hiện có: <strong>{row.currentStock ?? 0}</strong></span>
                                          </span>
                                        ) : (
                                          <span className="text-amber-700 font-medium italic">
                                            * Chưa chọn biến thể
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {/* Nút thêm 1 dòng biến thể khác cho sản phẩm này */}
                                        <button
                                          type="button"
                                          onClick={() => handleAddVariantRowForProduct(idx)}
                                          className="text-emerald-600 hover:text-emerald-800 hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5"
                                          title="Thêm một dòng khác để nhập biến thể tiếp theo của sản phẩm này"
                                        >
                                          <Plus className="w-2.5 h-2.5 inline" /> Thêm biến thể
                                        </button>

                                        {/* Nút tạo biến thể mới */}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenCreateVariant(row.productId, idx)}
                                          className="text-purple-600 hover:text-purple-800 hover:underline font-semibold cursor-pointer"
                                          title="Tạo biến thể mới chưa có trong hệ thống"
                                        >
                                          + Tạo mới
                                        </button>

                                        {/* Nút thêm tất cả biến thể */}
                                        {prodVariants.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleAddAllVariantsForProduct(idx)}
                                            className="text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer"
                                            title="Tự động thêm tất cả biến thể của sản phẩm này vào danh sách nhập"
                                          >
                                            + Cả {prodVariants.length}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Cột 3: Số lượng nhập */}
                              <td className="py-2 px-2 align-top">
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={row.quantity}
                                  onChange={(e) =>
                                    handleImportRowChange(idx, {
                                      quantity: Math.max(1, Number(e.target.value) || 0),
                                    })
                                  }
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                              </td>

                              {/* Cột 4: Đơn giá nhập */}
                              <td className="py-2 px-3 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={row.unitPrice}
                                  onChange={(e) =>
                                    handleImportRowChange(idx, {
                                      unitPrice: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                              </td>

                              {/* Cột 5: Thành tiền */}
                              <td className="py-2 px-3 text-right font-bold text-slate-800 whitespace-nowrap align-top pt-2.5">
                                {(row.quantity * row.unitPrice).toLocaleString('vi-VN')}
                              </td>

                              {/* Cột 6: Thao tác */}
                              <td className="py-2 px-2 text-center align-top pt-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImportRow(idx)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer mx-auto block"
                                  title="Xóa sản phẩm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Below table: Add product button + Total price */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleAddImportRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-400 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold cursor-pointer transition shadow-2xs self-start"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm dòng sản phẩm</span>
                  </button>

                  <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="font-semibold text-slate-600">Tổng tiền nhập:</span>
                    <span className="text-base font-extrabold text-blue-600">
                      {totalReceiptAmount.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2.5 pt-2.5 border-t border-slate-100 shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu phiếu nhập'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL PHỤ: TẠO BIẾN THỂ MỚI CHO SẢN PHẨM               */}
      {/* ======================================================== */}
      {isNewVariantOpen && targetProductForVariant && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Tạo biến thể mới</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Thêm phân loại cho <strong>{targetProductForVariant.productName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewVariantOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVariantSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tên phân loại / Biến thể <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: 512GB / Titan Sa Mạc, hoặc 16GB RAM"
                  value={newVariantForm.title}
                  onChange={(e) => setNewVariantForm({ ...newVariantForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mã SKU <span className="text-slate-400 font-normal">(Tự động hoặc tùy chỉnh)</span>
                </label>
                <input
                  type="text"
                  value={newVariantForm.sku}
                  onChange={(e) => setNewVariantForm({ ...newVariantForm, sku: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giá bán tham chiếu (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newVariantForm.price}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, price: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-right font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giá gốc (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newVariantForm.originalPrice}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, originalPrice: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-right font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewVariantOpen(false)}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white border-transparent"
                >
                  {isLoading ? 'Đang tạo...' : 'Tạo & Chọn biến thể'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CẬP NHẬT TỒN KHO & ĐIỀU CHUYỂN (HƯỚNG 2)         */}
      {/* ======================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 font-sans max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header: Sửa lỗi lặp từ SKU */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Cập nhật tồn kho
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Mã SKU: <span className="text-blue-700 font-bold">{editingItem.sku}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 min-h-0 flex flex-col space-y-3 text-xs overflow-hidden">
              {/* Thông tin sản phẩm (Dạng cố định, tránh hiểu nhầm là sửa tên) */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 shrink-0">
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Sản phẩm thiết bị</span>
                <span className="text-xs font-bold text-slate-900 block truncate" title={editingItem.productName}>
                  {editingItem.productName}
                </span>
              </div>

              {/* Kho lưu trữ & Vị trí kệ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kho lưu trữ</label>
                  <select
                    value={editForm.warehouse}
                    onChange={(e) => setEditForm({ ...editForm, warehouse: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs cursor-pointer font-medium"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-medium"
                  />
                </div>
              </div>

              {/* HƯỚNG 2: Nếu sản phẩm có nhiều biến thể con (Dung lượng, Màu sắc...) */}
              {editVariantRows.length > 1 ? (
                <div className="flex-1 min-h-0 flex flex-col space-y-2 pt-1">
                  <div className="flex items-center justify-between shrink-0">
                    <label className="text-slate-700 font-bold text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Số lượng theo từng phân loại ({editVariantRows.length} biến thể)</span>
                    </label>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Tổng tồn: {editForm.quantity} chiếc
                    </span>
                  </div>

                  <div className="flex-1 min-h-[120px] max-h-56 overflow-y-auto no-scrollbar space-y-2 border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                    {editVariantRows.map((v) => (
                      <div
                        key={v.id}
                        className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-800 block truncate" title={v.title}>
                            {v.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block truncate">
                            SKU: {v.sku}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-[11px] text-slate-500 font-semibold">Tồn kho:</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={v.stock}
                            onChange={(e) => handleEditVariantStockChange(v.id, Number(e.target.value) || 0)}
                            className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Sản phẩm đơn bản */
                <div className="shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">
                      Số lượng tồn kho thực tế <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${Number(editForm.quantity) > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                    >
                      {Number(editForm.quantity) > 0 ? 'Còn hàng' : 'Hết hàng'}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.quantity}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setEditForm({ ...editForm, quantity: val });
                      if (editVariantRows.length === 1) {
                        setEditVariantRows([{ ...editVariantRows[0], stock: val }]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-sm text-slate-800"
                  />
                </div>
              )}

              {/* Footer Buttons: Đồng bộ màu xanh dương */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventoryPage;
