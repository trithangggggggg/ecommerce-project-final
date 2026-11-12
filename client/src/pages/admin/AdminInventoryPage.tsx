import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';
import AdminSummaryStrip from '../../components/admin/AdminSummaryStrip';
import { productService } from '../../api/services/product.service';
import { supplierService } from '../../api/services/supplier.service';
import { inventoryService, type ImportReceiptDto } from '../../api/services/inventory.service';
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
  unitPrice: number;    // Giá nhập từ nhà cung cấp (giá vốn đợt này)
  sellingPrice: number; // Giá bán lẻ niêm yết cho khách hàng
  currentStock: number;
}

export interface EditVariantStock {
  id: number;
  sku: string;
  title: string;
  stock: number;
  price?: number;
}

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItem {
  id: number;
  sku: string;
  productName: string;
  warehouse: string;
  shelfLocation: string;
  quantity: number;
  minStock: number;
  unit: string;
  status: InventoryStatus;
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

const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return 'Vừa xong';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.replace('T', ' ').substring(0, 16);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return dateStr.replace('T', ' ').substring(0, 16);
  }
};

const calculateStatus = (qty: number, minStock = 5): InventoryStatus => {
  if (qty <= 0) return 'OUT_OF_STOCK';
  if (qty <= minStock) return 'LOW_STOCK';
  return 'IN_STOCK';
};

export const AdminInventoryPage: React.FC = () => {
  // Tabs: INVENTORY = Danh sách tồn kho, RECEIPTS = Lịch sử phiếu nhập
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'RECEIPTS'>('INVENTORY');

  // Inventory State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<number, boolean>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Receipts State
  const [receipts, setReceipts] = useState<ImportReceiptDto[]>([]);
  const [isReceiptsLoading, setIsReceiptsLoading] = useState<boolean>(false);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [receiptCurrentPage, setReceiptCurrentPage] = useState<number>(1);
  const [receiptTotalItems, setReceiptTotalItems] = useState<number>(0);
  const [receiptTotalPages, setReceiptTotalPages] = useState<number>(1);
  const [selectedReceipt, setSelectedReceipt] = useState<ImportReceiptDto | null>(null);
  const [isReceiptDetailOpen, setIsReceiptDetailOpen] = useState(false);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
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

  const [importRows, setImportRows] = useState<ImportReceiptRow[]>([
    {
      productId: 0,
      productName: '',
      variantId: 0,
      variantTitle: '',
      sku: '',
      quantity: 1,
      unitPrice: 0,
      sellingPrice: 0,
      currentStock: 0,
    },
  ]);

  const toggleExpand = (id: number) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Inventory from Database
  const loadRealInventory = async (isManual = false) => {
    setIsLoading(true);
    try {
      const res = await productService.getAdminProducts({ page: 1, limit: 100 });
      if (res.data && res.data.length > 0) {
        const mapped: InventoryItem[] = res.data.map((p) => {
          const variantWithWarehouse = p.variants?.find((v) => v.warehouse && v.warehouse.trim());
          const variantWithShelf = p.variants?.find((v) => v.shelfLocation && v.shelfLocation.trim());
          const wh = variantWithWarehouse?.warehouse?.trim() || WAREHOUSE_OPTIONS[0];
          const shelf = variantWithShelf?.shelfLocation?.trim() || 'Chưa phân kệ';
          const qty = typeof p.stock === 'number' ? p.stock : 0;
          const minStock = 5;
          const status = calculateStatus(qty, minStock);
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
            lastUpdated: formatDateTime(p.updatedAt || p.createdAt),
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

  // Load Receipts from Database
  const loadReceipts = async (keyword = receiptSearchQuery, page = receiptCurrentPage) => {
    setIsReceiptsLoading(true);
    try {
      const res = await inventoryService.getReceipts({
        page,
        limit: ITEMS_PER_PAGE,
        keyword,
      });
      setReceipts(res.data || []);
      setReceiptTotalItems(res.total || 0);
      setReceiptTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Lỗi khi tải danh sách phiếu nhập:', err);
    } finally {
      setIsReceiptsLoading(false);
    }
  };

  useEffect(() => {
    loadRealInventory();
    loadReceipts();
  }, []);

  useEffect(() => {
    if (activeTab === 'RECEIPTS') {
      loadReceipts(receiptSearchQuery, receiptCurrentPage);
    }
  }, [activeTab, receiptCurrentPage]);

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

  // Open Create Receipt
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
      importerName: user?.fullName || 'Quản trị viên Hệ thống',
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
        sellingPrice: 0,
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
        sellingPrice: 0,
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
          sellingPrice: 0,
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

  // Chọn sản phẩm cho dòng nhập
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
        sellingPrice: 0,
        currentStock: 0,
      });
      return;
    }

    handleImportRowChange(rowIdx, {
      productId: prod.id,
      productName: prod.productName,
      variantId: 0,
      variantTitle: '',
      sku: '',
      unitPrice: prod.price || 0,
      sellingPrice: prod.price || 0,
      currentStock: prod.quantity,
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
        unitPrice: prod.price || 0,
        sellingPrice: prod.price || 0,
        currentStock: prod.quantity,
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
        sellingPrice: foundVar.price || 0,
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
      sellingPrice: prod.price || 0,
      currentStock: 0,
    };

    setImportRows((prev) => [
      ...prev.slice(0, rowIdx + 1),
      newRow,
      ...prev.slice(rowIdx + 1),
    ]);

    showToast(`Đã thêm dòng chọn biến thể cho "${prod.productName}"`);
  };

  // Modal tạo biến thể mới
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

      handleImportRowChange(targetRowIdxForVariant, {
        variantId: newVar.id,
        variantTitle: newVar.title || newVar.sku,
        sku: newVar.sku,
        unitPrice: newVar.originalPrice || newVar.price || 0,
        sellingPrice: newVar.price || 0,
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
      sellingPrice: v.price || 0,
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

  // Submit Lưu Phiếu Nhập Kho: Lưu phiếu, tăng tồn kho, cập nhật giá nhập và giá bán mới
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

      const payloadItems = validRows.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        variantId: r.variantId > 0 ? r.variantId : undefined,
        variantTitle: r.variantTitle || undefined,
        sku: r.sku || undefined,
        quantity: r.quantity,
        unitPrice: r.unitPrice || 0,
        sellingPrice: r.sellingPrice > 0 ? r.sellingPrice : undefined,
      }));

      // Gọi API lưu phiếu nhập kho chính thức vào MySQL
      const createdReceipt = await inventoryService.createReceipt({
        receiptCode: receiptForm.receiptCode.trim(),
        importDate: receiptForm.importDate,
        supplierName: receiptForm.supplierName,
        importerName: receiptForm.importerName || user?.fullName || 'Quản trị viên Hệ thống',
        warehouse: receiptForm.warehouse,
        note: receiptForm.note,
        items: payloadItems,
      });

      // Lưu vị trí kho tiếp nhận cho các biến thể vào Database
      const variantIdsToLocate = validRows
        .filter((r) => r.variantId > 0)
        .map((r) => r.variantId);
      if (variantIdsToLocate.length > 0 && receiptForm.warehouse) {
        await Promise.all(
          variantIdsToLocate.map((vid) =>
            productService.updateVariantLocation(vid, receiptForm.warehouse, undefined)
          )
        );
      }

      // Đồng bộ lại danh sách tồn kho và phiếu nhập
      await loadRealInventory();
      await loadReceipts();

      setIsAddOpen(false);
      showToast(
        `Đã lưu phiếu "${createdReceipt.receiptCode}" thành công! (${totalReceiptQuantity} chiếc, ${totalReceiptAmount.toLocaleString('vi-VN')} VNĐ) - Đã cập nhật tồn kho và giá bán mới.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu phiếu nhập';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Edit Stock Modal (Cho phép sửa cả Tồn kho lẫn Giá bán)
  const [editForm, setEditForm] = useState({
    sku: '',
    productName: '',
    warehouse: '',
    shelfLocation: '',
    quantity: 0,
    price: 0,
    minStock: 0,
    unit: 'Chiếc',
  });

  const [editVariantRows, setEditVariantRows] = useState<EditVariantStock[]>([]);

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    const variantsList: EditVariantStock[] = (item.variants && item.variants.length > 0)
      ? item.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        title: v.title || v.sku || 'Tiêu chuẩn',
        stock: typeof v.stock === 'number' ? v.stock : 0,
        price: v.price || item.price || 0,
      }))
      : [];
    setEditVariantRows(variantsList);

    setEditForm({
      sku: item.sku,
      productName: item.productName,
      warehouse: item.warehouse,
      shelfLocation: item.shelfLocation,
      quantity: item.quantity,
      price: item.price || 0,
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

  const handleEditVariantPriceChange = (varId: number, newPrice: number) => {
    setEditVariantRows((prev) => {
      const updated = prev.map((v) => (v.id === varId ? { ...v, price: Math.max(0, newPrice) } : v));
      return updated;
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsLoading(true);
    try {
      let finalQty = Number(editForm.quantity) || 0;

      if (editVariantRows.length > 0) {
        await Promise.all(
          editVariantRows.map((v) =>
            productService.updateVariantStock(
              v.id,
              v.stock,
              false,
              v.price,
              editForm.warehouse,
              editForm.shelfLocation.trim()
            )
          )
        );
        finalQty = editVariantRows.reduce((sum, v) => sum + v.stock, 0);
      } else {
        await productService.updateProductStock(editingItem.id, finalQty, editForm.price);
      }

      const status = calculateStatus(finalQty, editingItem.minStock);

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== editingItem.id) return item;

          const updatedVariants = item.variants?.map((v) => {
            const found = editVariantRows.find((ev) => ev.id === v.id);
            return found
              ? {
                  ...v,
                  stock: found.stock,
                  price: found.price ?? v.price ?? 0,
                  warehouse: editForm.warehouse,
                  shelfLocation: editForm.shelfLocation.trim(),
                }
              : v;
          });

          const representativePrice = updatedVariants && updatedVariants.length > 0
            ? (updatedVariants[0].price || item.price)
            : (editForm.price || item.price);

          return {
            ...item,
            warehouse: editForm.warehouse,
            shelfLocation: editForm.shelfLocation.trim(),
            quantity: finalQty,
            price: representativePrice,
            status,
            variants: updatedVariants || item.variants,
            lastUpdated: formatDateTime(new Date().toISOString()),
          };
        })
      );

      showToast(`Đã cập nhật tồn kho & giá bán "${editingItem.productName}" thành công!`);
      setEditingItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật số lượng tồn kho';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // View Receipt Detail
  const handleOpenReceiptDetail = (receipt: ImportReceiptDto) => {
    setSelectedReceipt(receipt);
    setIsReceiptDetailOpen(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Filtering Inventory Items
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

  // Pagination calculation for Inventory
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats for Receipts
  const totalReceiptItemsSum = receipts.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);
  const totalReceiptAmountSum = receipts.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white text-xs font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý kho
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
              {items.length} SKU
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tồn kho hàng hóa, điều chỉnh giá bán và xem lịch sử các phiếu nhập
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => {
              if (activeTab === 'INVENTORY') {
                loadRealInventory(true);
              } else {
                loadReceipts();
                showToast('Đã làm mới danh sách phiếu nhập kho!');
              }
            }}
            disabled={isLoading || isReceiptsLoading}
            title="Đồng bộ từ Database"
          >
            {(isLoading || isReceiptsLoading) ? 'Đang tải...' : 'Đồng bộ DB'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
          >
            Nhập kho
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 shrink-0 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('INVENTORY')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'INVENTORY'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Danh sách tồn kho</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums ${
              activeTab === 'INVENTORY' ? 'bg-blue-700/80 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {items.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('RECEIPTS');
            loadReceipts();
          }}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeTab === 'RECEIPTS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Lịch sử phiếu nhập kho</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums ${
              activeTab === 'RECEIPTS' ? 'bg-blue-700/80 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {receiptTotalItems}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DANH SÁCH TỒN KHO                                */}
      {/* ======================================================== */}
      {activeTab === 'INVENTORY' && (
        <>
          {/* Compact Inventory Stats Strip */}
          <AdminSummaryStrip
            items={[
              {
                label: 'Lưu kho',
                value: `${totalQuantity} chiếc`,
                subValue: `${items.length} SP`,
              },
              {
                label: 'Còn hàng',
                value: `${inStockCount} SKU`,
                valueClassName: 'text-emerald-600',
              },
              {
                label: 'Sắp hết (≤ 5)',
                value: `${lowStockCount} SKU`,
                valueClassName: 'text-amber-600',
                active: statusFilter === 'LOW_STOCK',
                title: 'Nhấn để lọc nhanh SKU sắp hết hàng (<= 5)',
                onClick: () => {
                  setStatusFilter(statusFilter === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK');
                  setCurrentPage(1);
                },
              },
              {
                label: 'Hết hàng',
                value: `${outOfStockCount} SKU`,
                valueClassName: 'text-rose-600',
              },
            ]}
          />

          {/* Main Table Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search & Filter Toolbar */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-3xl">
                <div className="w-full sm:w-64">
                  <Input
                    type="text"
                    placeholder="Tìm mã SKU, tên thiết bị, kệ..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {/* Warehouse select */}
                <select
                  value={warehouseFilter}
                  onChange={(e) => {
                    setWarehouseFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
                    setStatusFilter(e.target.value as 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK');
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="IN_STOCK">Còn hàng</option>
                  <option value="LOW_STOCK">Chỉ sắp hết hàng (&le; 5)</option>
                  <option value="OUT_OF_STOCK">Hết hàng</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium self-end lg:self-center tabular-nums">
                Hiển thị <strong className="text-slate-800">{filteredItems.length}</strong> / {items.length} mặt hàng
              </div>
            </div>

            {/* Table View */}
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5">Mã SKU</th>
                    <th className="py-2.5 px-3.5">Tên thiết bị</th>
                    <th className="py-2.5 px-3.5 text-right">Giá bán niêm yết</th>
                    <th className="py-2.5 px-3.5">Kho & Vị trí kệ</th>
                    <th className="py-2.5 px-3.5 text-center">Tồn kho</th>
                    <th className="py-2.5 px-3.5">Trạng thái kho</th>
                    <th className="py-2.5 px-3.5">Cập nhật</th>
                    <th className="py-2.5 px-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 px-4 text-center">
                        <p className="text-sm font-semibold text-slate-600">
                          {isLoading
                            ? 'Đang tải danh sách tồn kho từ cơ sở dữ liệu...'
                            : 'Không tìm thấy mặt hàng kho nào phù hợp.'}
                        </p>
                        {!isLoading && (
                          <p className="text-xs text-slate-400 mt-1">
                            Thử thay đổi bộ lọc kho, trạng thái hoặc từ khóa tìm kiếm.
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-slate-50/70 transition group">
                          {/* SKU */}
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-xs tabular-nums">
                              {item.sku}
                            </span>
                          </td>

                          {/* Name & Variants Toggle */}
                          <td className="py-2.5 px-3.5 max-w-[260px]">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate block text-xs sm:text-[13px]"
                                title={item.productName}
                              >
                                {item.productName}
                              </span>
                              {item.variants && item.variants.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(item.id)}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap border transition cursor-pointer shrink-0 tabular-nums ${
                                    expandedProductIds[item.id]
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  }`}
                                  title={expandedProductIds[item.id] ? 'Thu gọn biến thể' : 'Xem chi tiết biến thể'}
                                >
                                  {expandedProductIds[item.id] ? 'Thu gọn' : `${item.variants.length} phân loại`}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Giá bán niêm yết */}
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900 text-xs tabular-nums">
                              {item.price ? `${item.price.toLocaleString('vi-VN')} đ` : 'Chưa đặt giá'}
                            </span>
                          </td>

                          {/* Warehouse & Shelf */}
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <div className="text-slate-800 font-semibold text-xs">
                              {item.warehouse}
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Kệ: <strong className="text-slate-700">{item.shelfLocation}</strong>
                            </span>
                          </td>

                          {/* Quantity */}
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap tabular-nums">
                            <span
                              className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                                item.quantity > 5
                                  ? 'text-emerald-700 bg-emerald-50/70'
                                  : 'text-rose-700 bg-rose-50 border border-rose-200 font-black'
                              }`}
                            >
                              {item.quantity}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">{item.unit}</span>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            {item.status === 'IN_STOCK' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Còn hàng</span>
                              </span>
                            ) : item.status === 'LOW_STOCK' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>Sắp hết hàng (&le; 5)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-rose-100 text-rose-800 border-rose-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                <span>Hết hàng</span>
                              </span>
                            )}
                          </td>

                          {/* Last updated */}
                          <td className="py-2.5 px-3.5 whitespace-nowrap text-[11px] text-slate-500">
                            <span className="font-mono tabular-nums">{item.lastUpdated}</span>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailItem(item)}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                                title="Xem chi tiết tồn kho và phân loại"
                              >
                                Xem
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                                title="Sửa số lượng tồn kho & Giá bán"
                              >
                                Sửa kho & giá
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Sub-row: Variant detail list if expanded */}
                        {expandedProductIds[item.id] && item.variants && item.variants.length > 0 && (
                          <tr className="bg-blue-50/20 border-b border-slate-200/60">
                            <td colSpan={8} className="py-3 px-4">
                              <div className="pl-4 border-l-2 border-blue-400 space-y-2">
                                <div className="text-[11px] font-bold text-slate-700 flex flex-wrap items-center justify-between gap-2">
                                  <span>
                                    Phân loại chi tiết của {item.productName} ({item.variants.length} biến thể):
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium tabular-nums">
                                    Tổng kho: <strong className="text-blue-700 font-mono">{item.quantity}</strong> chiếc
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
                                      <div className="text-right shrink-0 tabular-nums">
                                        <span
                                          className={`text-xs font-black block ${
                                            (v.stock ?? 0) > 5
                                              ? 'text-emerald-600'
                                              : 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200'
                                          }`}
                                        >
                                          {v.stock ?? 0} chiếc
                                        </span>
                                        <span className="text-[11px] text-blue-700 font-bold block mt-0.5">
                                          {v.price ? `${v.price.toLocaleString('vi-VN')} đ` : '0 đ'}
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

            {/* Pagination Controls */}
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: LỊCH SỬ PHIẾU NHẬP KHO (XEM LẠI PHIẾU NHẬP)        */}
      {/* ======================================================== */}
      {activeTab === 'RECEIPTS' && (
        <>
          {/* Compact Receipts Stats Strip */}
          <AdminSummaryStrip
            items={[
              {
                label: 'Tổng phiếu nhập',
                value: `${receiptTotalItems} phiếu`,
              },
              {
                label: 'Số lượng (trang)',
                value: `${totalReceiptItemsSum} chiếc`,
                valueClassName: 'text-blue-600',
              },
              {
                label: 'Giá trị nhập (trang)',
                value: `${totalReceiptAmountSum.toLocaleString('vi-VN')} VNĐ`,
                valueClassName: 'text-emerald-600',
              },
            ]}
          />

          {/* Receipts Table Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search Toolbar */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="w-full sm:w-80">
                <Input
                  type="text"
                  placeholder="Tìm mã phiếu, NCC, người nhập..."
                  value={receiptSearchQuery}
                  onChange={(e) => {
                    setReceiptSearchQuery(e.target.value);
                    setReceiptCurrentPage(1);
                    loadReceipts(e.target.value, 1);
                  }}
                />
              </div>

              <div className="text-xs text-slate-500 font-medium tabular-nums">
                Tìm thấy <strong className="text-slate-800">{receiptTotalItems}</strong> phiếu nhập kho
              </div>
            </div>

            {/* Table View */}
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5">Mã phiếu</th>
                    <th className="py-2.5 px-3.5">Ngày nhập</th>
                    <th className="py-2.5 px-3.5">Nhà cung cấp</th>
                    <th className="py-2.5 px-3.5">Kho nhận hàng</th>
                    <th className="py-2.5 px-3.5">Người lập</th>
                    <th className="py-2.5 px-3.5 text-center">Số lượng</th>
                    <th className="py-2.5 px-3.5 text-right">Tổng tiền nhập</th>
                    <th className="py-2.5 px-3.5 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 px-4 text-center">
                        <p className="text-sm font-semibold text-slate-600">
                          {isReceiptsLoading
                            ? 'Đang tải danh sách phiếu nhập kho...'
                            : 'Chưa có phiếu nhập kho nào được lưu'}
                        </p>
                        {!isReceiptsLoading && (
                          <p className="text-xs text-slate-400 mt-1">
                            Nhấn nút "Nhập kho" phía trên để tạo phiếu nhập đầu tiên.
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    receipts.map((rc) => (
                      <tr key={rc.id} className="hover:bg-slate-50/70 transition group">
                        {/* Receipt Code */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenReceiptDetail(rc)}
                            className="font-mono font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 text-xs transition cursor-pointer text-left tabular-nums"
                            title="Bấm để xem lại chi tiết phiếu nhập này"
                          >
                            {rc.receiptCode}
                          </button>
                        </td>

                        {/* Import Date */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-800 font-medium tabular-nums">
                          {rc.importDate}
                        </td>

                        {/* Supplier */}
                        <td className="py-2.5 px-3.5 max-w-[200px]">
                          <span className="font-semibold text-slate-800 block truncate" title={rc.supplierName}>
                            {rc.supplierName || 'Chưa xác định'}
                          </span>
                        </td>

                        {/* Warehouse */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-700 font-medium">
                          {rc.warehouse || 'Kho chính'}
                        </td>

                        {/* Importer */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-600">
                          {rc.importerName || 'Quản trị viên'}
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          <span className="font-extrabold text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-200/70 tabular-nums">
                            {rc.totalQuantity} chiếc
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-bold text-slate-900 tabular-nums">
                          {Number(rc.totalAmount || 0).toLocaleString('vi-VN')} VNĐ
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenReceiptDetail(rc)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                            title="Xem chi tiết phiếu nhập"
                          >
                            Xem
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Receipts */}
            <AdminPagination
              currentPage={receiptCurrentPage}
              totalPages={receiptTotalPages}
              totalItems={receiptTotalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(page) => {
                setReceiptCurrentPage(page);
                loadReceipts(receiptSearchQuery, page);
              }}
            />
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: NHẬP KHO (TÁCH BIỆT: ĐƠN GIÁ NHẬP & GIÁ BÁN MỚI) */}
      {/* ======================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-5xl sm:max-w-6xl w-full shadow-2xl font-sans max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Tạo phiếu nhập kho
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Nhập hàng theo lô và cập nhật trực tiếp đơn giá nhập cùng giá bán niêm yết
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleReceiptSubmit} className="flex-1 min-h-0 flex flex-col text-xs overflow-hidden">
              <div className="flex-1 min-h-0 flex flex-col p-5 space-y-4 overflow-hidden">
                {/* Form Info Cố định phía trên */}
                <div className="shrink-0 space-y-3">
                  {/* Row 1: Mã phiếu nhập & Ngày nhập */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                        Mã phiếu nhập <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={receiptForm.receiptCode}
                        onChange={(e) => setReceiptForm({ ...receiptForm, receiptCode: e.target.value })}
                        placeholder="VD: PN20261105-001"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                        Ngày nhập <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={receiptForm.importDate}
                        onChange={(e) => setReceiptForm({ ...receiptForm, importDate: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* Row 2: Nhà cung cấp & Kho tiếp nhận */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                        Nhà cung cấp <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={receiptForm.supplierName}
                        onChange={(e) => setReceiptForm({ ...receiptForm, supplierName: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs cursor-pointer"
                      >
                        <option value="">-- Chọn nhà cung cấp --</option>
                        {supplierOptions.map((sup) => (
                          <option key={sup} value={sup}>
                            {sup}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                        Kho tiếp nhận hàng <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={receiptForm.warehouse}
                        onChange={(e) => setReceiptForm({ ...receiptForm, warehouse: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs cursor-pointer text-slate-800"
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

                  {/* Row 3: Người nhập & Ghi chú */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                        Người nhập <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={receiptForm.importerName}
                        onChange={(e) => setReceiptForm({ ...receiptForm, importerName: e.target.value })}
                        placeholder={user?.fullName || 'Quản trị viên Hệ thống'}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Ghi chú đơn</label>
                      <input
                        type="text"
                        value={receiptForm.note}
                        onChange={(e) => setReceiptForm({ ...receiptForm, note: e.target.value })}
                        placeholder="Nhập hàng theo đơn đặt hàng số #DH123"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Danh sách sản phẩm nhập */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
                    <h4 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      Danh sách sản phẩm nhập
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Nhập giá mua từ NCC và điều chỉnh trực tiếp giá bán lẻ cho khách hàng
                    </span>
                  </div>

                  {/* Table Container: Cột riêng cho Đơn giá nhập và Giá bán mới */}
                  <div className="flex-1 min-h-[160px] border border-slate-200 rounded-xl overflow-auto shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[880px]">
                      <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                        <tr>
                          <th className="py-2.5 px-2 text-center w-10">STT</th>
                          <th className="py-2.5 px-3 min-w-[190px]">Sản phẩm *</th>
                          <th className="py-2.5 px-3 min-w-[210px]">Biến thể / Phân loại *</th>
                          <th className="py-2.5 px-2 text-center w-20">Số lượng *</th>
                          <th className="py-2.5 px-3 text-right w-32">Đơn giá nhập (VNĐ)</th>
                          <th className="py-2.5 px-3 text-right w-32">Giá bán mới (VNĐ)</th>
                          <th className="py-2.5 px-3 text-right w-32">Thành tiền nhập</th>
                          <th className="py-2.5 px-2 text-center w-16">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {importRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 px-4 text-center">
                              <p className="text-xs font-semibold text-slate-600">
                                Danh sách sản phẩm nhập đang để trống
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Nhấn nút{' '}
                                <button
                                  type="button"
                                  onClick={handleAddImportRow}
                                  className="text-blue-600 font-bold hover:underline cursor-pointer mx-0.5"
                                >
                                  Thêm dòng sản phẩm
                                </button>{' '}
                                bên dưới để chọn sản phẩm cần nhập kho.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          importRows.map((row, idx) => {
                            const currentProd = items.find((p) => p.id === row.productId);
                            const prodVariants = currentProd?.variants || [];

                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 transition">
                                {/* STT */}
                                <td className="py-2.5 px-2 text-center font-bold text-slate-600 align-top tabular-nums">
                                  {idx + 1}
                                </td>

                                {/* Sản phẩm */}
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
                                    <div className="mt-1 text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap tabular-nums">
                                      <span>
                                        Tổng kho: <strong className="text-slate-700">{currentProd.quantity}</strong> chiếc
                                      </span>
                                      {prodVariants.length > 0 && (
                                        <span className="text-blue-600 font-semibold">
                                          ({prodVariants.length} biến thể)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Biến thể */}
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
                                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition ${
                                          !row.variantId
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
                                          Tạo biến thể mới cho sản phẩm này...
                                        </option>
                                      </select>

                                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 px-0.5">
                                        <div>
                                          {row.variantId > 0 ? (
                                            <span className="tabular-nums">
                                              SKU: <span className="font-mono font-bold text-blue-700">{row.sku || 'N/A'}</span>
                                              <span className="ml-1 text-slate-400 font-normal">
                                                | Hiện có: <strong>{row.currentStock ?? 0}</strong>
                                              </span>
                                            </span>
                                          ) : (
                                            <span className="text-amber-700 font-medium italic">
                                              * Chưa chọn biến thể
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleAddVariantRowForProduct(idx)}
                                            className="text-emerald-600 hover:text-emerald-800 hover:underline font-bold cursor-pointer"
                                            title="Thêm một dòng khác để nhập biến thể tiếp theo của sản phẩm này"
                                          >
                                            Thêm biến thể
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => handleOpenCreateVariant(row.productId, idx)}
                                            className="text-purple-600 hover:text-purple-800 hover:underline font-semibold cursor-pointer"
                                            title="Tạo biến thể mới chưa có trong hệ thống"
                                          >
                                            Tạo mới
                                          </button>

                                          {prodVariants.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleAddAllVariantsForProduct(idx)}
                                              className="text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer tabular-nums"
                                              title="Tự động thêm tất cả biến thể của sản phẩm này vào danh sách nhập"
                                            >
                                              Chọn cả {prodVariants.length}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </td>

                                {/* Số lượng */}
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
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                  />
                                </td>

                                {/* Cột 1: ĐƠN GIÁ NHẬP (Giá mua vào từ NCC) */}
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
                                    placeholder="Giá nhập"
                                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-right font-semibold tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 bg-slate-50/50"
                                    title="Đơn giá mua từ nhà cung cấp"
                                  />
                                </td>

                                {/* Cột 2: GIÁ BÁN MỚI (Giá bán lẻ cho khách hàng) */}
                                <td className="py-2 px-3 align-top">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={row.sellingPrice}
                                    onChange={(e) =>
                                      handleImportRowChange(idx, {
                                        sellingPrice: Math.max(0, Number(e.target.value) || 0),
                                      })
                                    }
                                    placeholder="Giá bán lẻ"
                                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-right font-bold tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 bg-white"
                                    title="Giá bán lẻ niêm yết mới cho khách hàng"
                                  />
                                </td>

                                {/* Thành tiền nhập */}
                                <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap align-top tabular-nums">
                                  {(row.quantity * row.unitPrice).toLocaleString('vi-VN')}
                                </td>

                                {/* Thao tác */}
                                <td className="py-2 px-2 text-center align-top">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImportRow(idx)}
                                    className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                                    title="Xóa sản phẩm"
                                  >
                                    Xóa
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Nút thêm dòng & Tổng tiền */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 shrink-0">
                    <button
                      type="button"
                      onClick={handleAddImportRow}
                      className="px-3 py-1.5 border border-blue-400 text-blue-700 bg-blue-50/50 hover:bg-blue-50 rounded-lg text-xs font-semibold cursor-pointer transition shadow-2xs self-start whitespace-nowrap"
                    >
                      Thêm dòng sản phẩm
                    </button>

                    <div className="flex items-center justify-end gap-2 text-xs tabular-nums">
                      <span className="font-semibold text-slate-600">Tổng tiền nhập:</span>
                      <span className="text-base font-extrabold text-blue-600">
                        {totalReceiptAmount.toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isLoading ? 'Đang xử lý...' : 'Lưu phiếu nhập'}
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
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl font-sans max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Tạo biến thể mới</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Thêm phân loại cho <strong>{targetProductForVariant.productName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewVariantOpen(false)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateVariantSubmit} className="flex-1 min-h-0 flex flex-col text-xs">
              <div className="p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0">
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
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Giá bán tham chiếu (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={newVariantForm.price}
                      onChange={(e) => setNewVariantForm({ ...newVariantForm, price: Number(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-right font-bold tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-right font-bold tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewVariantOpen(false)}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang xử lý...' : 'Tạo & Chọn biến thể'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CẬP NHẬT TỒN KHO & ĐIỀU CHỈNH GIÁ BÁN           */}
      {/* ======================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full shadow-2xl font-sans max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Cập nhật tồn kho & Giá bán
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5 tabular-nums">
                  Mã SKU: <span className="text-blue-700 font-bold">{editingItem.sku}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 min-h-0 flex flex-col text-xs overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Sản phẩm thiết bị</span>
                  <span className="text-xs font-bold text-slate-900 block truncate" title={editingItem.productName}>
                    {editingItem.productName}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Kho lưu trữ</label>
                    <select
                      value={editForm.warehouse}
                      onChange={(e) => setEditForm({ ...editForm, warehouse: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs cursor-pointer font-medium"
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
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Sản phẩm có nhiều biến thể con: sửa cả Giá bán lẫn Tồn kho */}
                {editVariantRows.length > 1 ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-slate-700 font-bold text-xs">
                        Số lượng & Giá bán theo từng phân loại ({editVariantRows.length} biến thể)
                      </label>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 tabular-nums">
                        Tổng tồn: {editForm.quantity} chiếc
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                      {editVariantRows.map((v) => (
                        <div
                          key={v.id}
                          className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-800 block truncate" title={v.title}>
                              {v.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              SKU: {v.sku}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                            {/* Sửa giá bán lẻ của biến thể */}
                            <div className="flex items-center gap-1">
                              <label className="text-[11px] text-slate-500 font-semibold">Giá bán:</label>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={v.price ?? 0}
                                onChange={(e) => handleEditVariantPriceChange(v.id, Number(e.target.value) || 0)}
                                className="w-28 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-right font-bold tabular-nums text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                              />
                              <span className="text-[10px] text-slate-400 font-semibold">đ</span>
                            </div>

                            {/* Sửa tồn kho */}
                            <div className="flex items-center gap-1">
                              <label className="text-[11px] text-slate-500 font-semibold">Tồn:</label>
                              <input
                                type="number"
                                min="0"
                                required
                                value={v.stock}
                                onChange={(e) => handleEditVariantStockChange(v.id, Number(e.target.value) || 0)}
                                className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold tabular-nums text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Sản phẩm đơn bản: sửa cả Tồn kho lẫn Giá bán */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Giá bán niêm yết (VNĐ) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-sm text-slate-800 bg-white text-right tabular-nums"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-semibold">
                          Số lượng tồn kho <span className="text-rose-500">*</span>
                        </label>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            Number(editForm.quantity) > 5
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : Number(editForm.quantity) > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {Number(editForm.quantity) > 5 ? 'Còn hàng' : Number(editForm.quantity) > 0 ? 'Sắp hết hàng' : 'Hết hàng'}
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
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-sm text-slate-800 tabular-nums"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isLoading ? 'Đang xử lý...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: XEM CHI TIẾT PHIẾU NHẬP KHO (XEM LẠI PHIẾU)      */}
      {/* ======================================================== */}
      {isReceiptDetailOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl font-sans max-h-[92vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Chi tiết phiếu nhập kho
                </h3>
                <p className="text-xs font-mono font-bold text-blue-700 mt-0.5 tabular-nums">
                  {selectedReceipt.receiptCode}
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden shrink-0">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 transition cursor-pointer"
                  title="In phiếu nhập kho"
                >
                  In phiếu
                </button>
                <button
                  type="button"
                  onClick={() => setIsReceiptDetailOpen(false)}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Receipt Summary Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Ngày nhập
                  </span>
                  <span className="font-bold text-slate-800 tabular-nums mt-0.5 block">
                    {selectedReceipt.importDate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Nhà cung cấp
                  </span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5" title={selectedReceipt.supplierName}>
                    {selectedReceipt.supplierName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Kho tiếp nhận
                  </span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5" title={selectedReceipt.warehouse}>
                    {selectedReceipt.warehouse || 'Kho chính'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Người lập phiếu
                  </span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5">
                    {selectedReceipt.importerName || 'Quản trị viên'}
                  </span>
                </div>
                {selectedReceipt.note && (
                  <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Ghi chú
                    </span>
                    <span className="text-slate-700 italic mt-0.5 block">{selectedReceipt.note}</span>
                  </div>
                )}
              </div>

              {/* Receipt Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-auto shadow-2xs max-h-[350px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-2.5 text-center w-12">STT</th>
                      <th className="py-2.5 px-3">Tên sản phẩm</th>
                      <th className="py-2.5 px-3">Phân loại / Biến thể</th>
                      <th className="py-2.5 px-2.5">Mã SKU</th>
                      <th className="py-2.5 px-2.5 text-center">Số lượng</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá nhập</th>
                      <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                      selectedReceipt.items.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-2.5 text-center font-bold text-slate-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{it.productName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{it.variantTitle || 'Tiêu chuẩn'}</td>
                          <td className="py-2.5 px-2.5 font-mono text-[11px] text-blue-700 tabular-nums">
                            {it.sku || 'N/A'}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-extrabold text-blue-700 tabular-nums">
                            {it.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 font-medium tabular-nums">
                            {Number(it.unitPrice || 0).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                            {Number(it.totalPrice || 0).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 px-4 text-center text-slate-400">
                          Không có mặt hàng nào trong phiếu nhập.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Summary */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs">
              <div className="flex flex-wrap items-center gap-4 tabular-nums">
                <div className="text-slate-600">
                  Tổng số lượng: <strong className="text-slate-900 font-mono text-sm">{selectedReceipt.totalQuantity}</strong> chiếc
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Tổng tiền thanh toán:</span>
                  <span className="text-base font-black text-blue-600">
                    {Number(selectedReceipt.totalAmount || 0).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsReceiptDetailOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer print:hidden self-end sm:self-auto"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: XEM CHI TIẾT TỒN KHO & PHÂN LOẠI SẢN PHẨM       */}
      {/* ======================================================== */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl font-sans max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {detailItem.productName}
                </h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                  ID #{detailItem.id} · Mã: {detailItem.sku}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Kho lưu trữ
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{detailItem.warehouse}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Vị trí kệ hàng
                  </span>
                  <span className="font-mono font-bold text-indigo-700 mt-0.5 block">
                    {detailItem.shelfLocation}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Tổng tồn kho
                  </span>
                  <span className="font-mono font-bold text-blue-700 mt-0.5 block tabular-nums">
                    {detailItem.quantity} {detailItem.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Giá bán tham chiếu
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block tabular-nums">
                    {(detailItem.price ?? 0).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Trạng thái kho
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {detailItem.status === 'IN_STOCK'
                      ? 'Còn hàng'
                      : detailItem.status === 'LOW_STOCK'
                        ? 'Sắp hết hàng'
                        : 'Hết hàng'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Cập nhật lần cuối
                  </span>
                  <span className="font-mono text-slate-600 mt-0.5 block tabular-nums">
                    {detailItem.lastUpdated}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  Danh sách biến thể & vị trí ({detailItem.variants?.length || 0})
                </h4>
                {detailItem.variants && detailItem.variants.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-auto max-h-64">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="py-2 px-3">Biến thể</th>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3">Kho / Kệ</th>
                          <th className="py-2 px-3 text-right">Tồn kho</th>
                          <th className="py-2 px-3 text-right">Giá bán</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {detailItem.variants.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {v.title || v.sku || 'Tiêu chuẩn'}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{v.sku}</td>
                            <td className="py-2 px-3 text-[11px] text-slate-600">
                              {(v.warehouse || detailItem.warehouse)}
                              {v.shelfLocation ? ` · ${v.shelfLocation}` : ''}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                              {v.stock ?? 0}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-blue-700 tabular-nums">
                              {Number(v.price || 0).toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    Sản phẩm đơn (chưa chia biến thể riêng).
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = detailItem;
                  setDetailItem(null);
                  handleOpenEdit(target);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer"
              >
                Chỉnh sửa kho & giá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventoryPage;
