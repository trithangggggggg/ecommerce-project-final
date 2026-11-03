import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  User,
  X,
  Truck,
  Plus,
  Edit,
  Calendar,
  ArrowUpDown,
  RotateCcw,
  Package,
  Copy,
  Check,
  PackageCheck,
} from 'lucide-react';
import { orderService } from '../../api/services/order.service';
import { productService } from '../../api/services/product.service';
import { shippingService } from '../../api/services/shipping.service';
import type { ShippingCarrier } from './AdminShippingPage';
import { formatPrice, formatDateTime } from '../../utils/format';
import {
  type OrderResponse,
  type OrderStatus,
  type PaymentMethod,
  type UpdateOrderStatusRequest,
} from '../../models/order.model';
import { type Product, type ProductVariant } from '../../models/product.model';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';

type FilterTab = 'ALL' | OrderStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Tất cả đơn' },
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'PROCESSING', label: 'Đang xử lý' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'COMPLETED', label: 'Đã giao' },
  { key: 'CANCELLED', label: 'Hủy' },
];

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'COMPLETED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Hủy' },
];

const ITEMS_PER_PAGE = 10;

// Dữ liệu đơn hàng chuyển từ "Đơn hàng gần đây" (Dashboard) sang mục Đơn hàng
// Đầy đủ thông tin sản phẩm thực tế, khách hàng, số điện thoại, thời gian
export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'price-desc' | 'price-asc'>('latest');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | 'month'>('all');

  // Selected Order for View Detail
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Dispatch Modal state (Xuất kho & Gán đơn vị vận chuyển)
  const [dispatchOrder, setDispatchOrder] = useState<OrderResponse | null>(null);
  const [dispatchCarrierId, setDispatchCarrierId] = useState<number | ''>('');
  const [dispatchTrackingCode, setDispatchTrackingCode] = useState<string>('');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState<boolean>(false);

  // Pagination state (10 items/page)
  const [currentPage, setCurrentPage] = useState(1);

  // CRUD Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderResponse | null>(null);

  // Product Selection & Variant State for Create Order
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [isLoadingProductDetail, setIsLoadingProductDetail] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  // Create form state
  const [newOrderForm, setNewOrderForm] = useState<{
    receiverName: string;
    phoneNumber: string;
    shippingAddress: string;
    paymentMethod: PaymentMethod;
    productName: string;
    quantity: number;
    price: number;
    note: string;
  }>({
    receiverName: '',
    phoneNumber: '',
    shippingAddress: '',
    paymentMethod: 'COD',
    productName: '',
    quantity: 1,
    price: 0,
    note: '',
  });

  // Edit form state
  const [editForm, setEditForm] = useState<{
    receiverName: string;
    phoneNumber: string;
    shippingAddress: string;
    paymentMethod: PaymentMethod;
    status: OrderStatus;
    carrierId?: number;
    trackingCode?: string;
    note: string;
  }>({
    receiverName: '',
    phoneNumber: '',
    shippingAddress: '',
    paymentMethod: 'COD',
    status: 'PENDING',
    carrierId: undefined,
    trackingCode: '',
    note: '',
  });

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await orderService.getAllOrders();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAvailableProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await productService.getProducts({ limit: 100 });
      const active = (res.data || []).filter((p) => p.status !== false);
      setAvailableProducts(active);
    } catch {
      setAvailableProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const fetchCarriers = useCallback(async () => {
    try {
      const data = await shippingService.getCarriers();
      if (Array.isArray(data)) {
        setCarriers(data);
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchCarriers();
    fetchAvailableProducts();
  }, [fetchOrders, fetchCarriers, fetchAvailableProducts]);

  // Match current combination of options with backend variants
  const matchedVariant: ProductVariant | null = useMemo(() => {
    if (!selectedProductDetail) return null;
    const variants = selectedProductDetail.variants;
    if (!variants || variants.length === 0) return null;

    // If product has no options, return the first variant
    if (!selectedProductDetail.options || selectedProductDetail.options.length === 0) {
      return variants[0];
    }

    // Match all selected options
    const found = variants.find((variant) => {
      if (!variant.optionValues) return false;
      return Object.entries(selectedOptions).every(([optName, optVal]) => {
        const varVal = variant.optionValues?.[optName];
        return varVal && varVal.trim().toLowerCase() === optVal.trim().toLowerCase();
      });
    });

    return found || variants[0] || null;
  }, [selectedProductDetail, selectedOptions]);

  // Keep price updated with matched variant
  useEffect(() => {
    if (matchedVariant) {
      setNewOrderForm((prev) => ({
        ...prev,
        price: matchedVariant.price,
      }));
    }
  }, [matchedVariant]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Đã sao chép mã vận đơn: ${code}`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const openDispatchModal = (order: OrderResponse) => {
    setDispatchOrder(order);
    const activeCarriers = carriers.filter((c) => c.status === 'ACTIVE');
    const defaultCarrier = activeCarriers.length > 0 ? activeCarriers[0] : (carriers[0] || null);
    const selectedId = order.carrierId || defaultCarrier?.id || '';
    setDispatchCarrierId(selectedId);

    if (order.trackingCode) {
      setDispatchTrackingCode(order.trackingCode);
    } else {
      const carrierObj = carriers.find((c) => c.id === selectedId);
      const codePrefix = carrierObj ? carrierObj.code.toUpperCase() : 'VN';
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      setDispatchTrackingCode(`${codePrefix}${Date.now().toString().slice(-6)}${randomSuffix}`);
    }
  };

  const handleCarrierSelectChange = (carrierId: number) => {
    setDispatchCarrierId(carrierId);
    const carrierObj = carriers.find((c) => c.id === carrierId);
    const codePrefix = carrierObj ? carrierObj.code.toUpperCase() : 'VN';
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    setDispatchTrackingCode(`${codePrefix}${Date.now().toString().slice(-6)}${randomSuffix}`);
  };

  const handleStatusChange = async (
    orderId: number,
    newStatus: OrderStatus,
    extra?: { carrierId?: number; trackingCode?: string }
  ) => {
    // If switching to SHIPPING and not having carrier info yet, open dispatch modal!
    if (newStatus === 'SHIPPING' && !extra?.carrierId) {
      const order = orders.find((o) => o.id === orderId) || (selectedOrder?.id === orderId ? selectedOrder : null);
      if (order) {
        openDispatchModal(order);
        return;
      }
    }

    setUpdatingId(orderId);
    try {
      const payload: UpdateOrderStatusRequest = {
        status: newStatus,
        carrierId: extra?.carrierId,
        trackingCode: extra?.trackingCode,
      };
      const updated = await orderService.updateOrderStatus(orderId, payload);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? (updated?.id ? updated : { ...o, ...payload }) : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? (updated?.id ? updated : { ...prev, ...payload }) : null));
      }
      showToast(`Đã chuyển trạng thái đơn #ORD-${orderId} sang "${getStatusLabel(newStatus)}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái đơn hàng.';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Submit dispatch modal
  const handleConfirmDispatch = async () => {
    if (!dispatchOrder) return;
    setIsSubmittingDispatch(true);
    try {
      const carrierId = typeof dispatchCarrierId === 'number' ? dispatchCarrierId : undefined;
      const trackingCode = dispatchTrackingCode.trim() || undefined;
      const carrierObj = carriers.find((c) => c.id === carrierId);

      const updated = await orderService.updateOrderStatus(dispatchOrder.id, {
        status: 'SHIPPING',
        carrierId,
        trackingCode,
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === dispatchOrder.id
            ? {
                ...o,
                status: 'SHIPPING',
                carrierId,
                carrierName: carrierObj?.name || o.carrierName,
                carrierCode: carrierObj?.code || o.carrierCode,
                trackingCode: updated?.trackingCode || trackingCode || o.trackingCode,
              }
            : o
        )
      );

      if (selectedOrder && selectedOrder.id === dispatchOrder.id) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                status: 'SHIPPING',
                carrierId,
                carrierName: carrierObj?.name || prev.carrierName,
                carrierCode: carrierObj?.code || prev.carrierCode,
                trackingCode: updated?.trackingCode || trackingCode || prev.trackingCode,
              }
            : null
        );
      }

      setDispatchOrder(null);
      showToast(`Đã xuất kho & gán đơn vị vận chuyển cho đơn #ORD-${dispatchOrder.id} thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xuất kho đơn hàng.';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  // Helper for Status Label
  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'Đã giao';
      case 'SHIPPING':
        return 'Đang giao';
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'PENDING':
        return 'Chờ xử lý';
      case 'CANCELLED':
        return 'Hủy';
      default:
        return status;
    }
  };

  // Handler when user selects a product from the dropdown
  const handleProductChange = async (productIdStr: string) => {
    if (!productIdStr) {
      setSelectedProductId('');
      setSelectedProductDetail(null);
      setSelectedOptions({});
      setNewOrderForm((prev) => ({
        ...prev,
        productName: '',
        price: 0,
        quantity: 1,
      }));
      return;
    }

    const pId = Number(productIdStr);
    setSelectedProductId(pId);
    setIsLoadingProductDetail(true);

    try {
      const detail = await productService.getProductById(pId);
      setSelectedProductDetail(detail);

      // Initialize selected options with the first value of each option
      const initialOptions: Record<string, string> = {};
      if (detail.options && detail.options.length > 0) {
        detail.options.forEach((opt) => {
          if (opt.values && opt.values.length > 0) {
            initialOptions[opt.name] = opt.values[0].value;
          }
        });
        setSelectedOptions(initialOptions);
      } else {
        setSelectedOptions({});
      }

      // Initial matched variant
      let initialVariant: ProductVariant | null = null;
      if (detail.variants && detail.variants.length > 0) {
        if (detail.options && detail.options.length > 0) {
          initialVariant =
            detail.variants.find((v) => {
              if (!v.optionValues) return false;
              return Object.entries(initialOptions).every(([k, val]) => {
                const varVal = v.optionValues?.[k];
                return varVal && varVal.trim().toLowerCase() === val.trim().toLowerCase();
              });
            }) || detail.variants[0];
        } else {
          initialVariant = detail.variants[0];
        }
      }

      const initialPrice = initialVariant?.price ?? detail.minPrice ?? detail.price ?? 0;
      setNewOrderForm((prev) => ({
        ...prev,
        productName: detail.name,
        price: initialPrice,
        quantity: 1,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải chi tiết sản phẩm.';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsLoadingProductDetail(false);
    }
  };

  // Handler when user changes a variant option (e.g. Color, Storage)
  const handleOptionChange = (optionName: string, optionValue: string) => {
    const updatedOptions = { ...selectedOptions, [optionName]: optionValue };
    setSelectedOptions(updatedOptions);

    if (selectedProductDetail?.variants && selectedProductDetail.variants.length > 0) {
      const matched =
        selectedProductDetail.variants.find((v) => {
          if (!v.optionValues) return false;
          return Object.entries(updatedOptions).every(([k, val]) => {
            const varVal = v.optionValues?.[k];
            return varVal && varVal.trim().toLowerCase() === val.trim().toLowerCase();
          });
        }) || selectedProductDetail.variants[0];

      if (matched) {
        setNewOrderForm((prev) => ({
          ...prev,
          price: matched.price,
        }));
      }
    }
  };

  // Handler when selecting variant directly (if no options but multiple variants)
  const handleVariantSelect = (variantId: number) => {
    const v = selectedProductDetail?.variants?.find((item) => item.id === variantId);
    if (v) {
      setNewOrderForm((prev) => ({
        ...prev,
        price: v.price,
      }));
    }
  };

  // Open Create Order Modal
  const handleOpenCreateModal = () => {
    setSelectedProductId('');
    setSelectedProductDetail(null);
    setSelectedOptions({});
    setNewOrderForm({
      receiverName: '',
      phoneNumber: '',
      shippingAddress: '',
      paymentMethod: 'COD',
      productName: '',
      quantity: 1,
      price: 0,
      note: '',
    });
    setIsCreateOpen(true);
    if (availableProducts.length === 0) {
      fetchAvailableProducts();
    }
  };

  // Submit Create Order
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.receiverName.trim() || !newOrderForm.phoneNumber.trim() || !newOrderForm.shippingAddress.trim()) {
      showToast('Vui lòng điền đầy đủ họ tên, SĐT và địa chỉ nhận hàng');
      return;
    }

    if (!selectedProductId) {
      showToast('Vui lòng chọn sản phẩm cần đặt hàng');
      return;
    }

    const orderQuantity = Number(newOrderForm.quantity) || 1;
    if (orderQuantity < 1) {
      showToast('Số lượng đặt hàng tối thiểu là 1');
      return;
    }

    if (matchedVariant?.stock != null && matchedVariant.stock < orderQuantity) {
      showToast(`Số lượng tồn kho không đủ (Hiện còn: ${matchedVariant.stock})`);
      return;
    }

    setIsCreating(true);
    try {
      const created = await orderService.checkout({
        receiverName: newOrderForm.receiverName.trim(),
        phoneNumber: newOrderForm.phoneNumber.trim(),
        shippingAddress: newOrderForm.shippingAddress.trim(),
        paymentMethod: newOrderForm.paymentMethod,
        note: newOrderForm.note?.trim() || undefined,
        items: [
          {
            productId: Number(selectedProductId),
            variantId: matchedVariant?.id,
            quantity: orderQuantity,
          },
        ],
      });

      setOrders([created, ...orders]);
      setIsCreateOpen(false);
      setSelectedProductId('');
      setSelectedProductDetail(null);
      setSelectedOptions({});
      setNewOrderForm({
        receiverName: '',
        phoneNumber: '',
        shippingAddress: '',
        paymentMethod: 'COD',
        productName: '',
        quantity: 1,
        price: 0,
        note: '',
      });
      showToast(`Đã tạo đơn hàng mới #ORD-${created.id} trên Database thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo đơn hàng mới trên hệ thống';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (order: OrderResponse) => {
    setEditingOrder(order);
    setEditForm({
      receiverName: order.receiverName || order.customerName || '',
      phoneNumber: order.phoneNumber || '',
      shippingAddress: order.shippingAddress || '',
      paymentMethod: order.paymentMethod || 'COD',
      status: order.status,
      carrierId: order.carrierId,
      trackingCode: order.trackingCode || '',
      note: order.note || '',
    });
  };

  // Submit Edit Order
  const handleEditOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      const carrierObj = carriers.find((c) => c.id === editForm.carrierId);
      const isStatusOrShippingChanged =
        editForm.status !== editingOrder.status ||
        editForm.carrierId !== editingOrder.carrierId ||
        editForm.trackingCode !== editingOrder.trackingCode;

      if (isStatusOrShippingChanged) {
        await orderService.updateOrderStatus(editingOrder.id, {
          status: editForm.status,
          carrierId: editForm.carrierId,
          trackingCode: editForm.trackingCode?.trim() || undefined,
        });
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingOrder.id
            ? {
                ...o,
                receiverName: editForm.receiverName,
                customerName: editForm.receiverName,
                phoneNumber: editForm.phoneNumber,
                shippingAddress: editForm.shippingAddress,
                paymentMethod: editForm.paymentMethod,
                status: editForm.status,
                carrierId: editForm.carrierId,
                carrierName: carrierObj?.name || o.carrierName,
                carrierCode: carrierObj?.code || o.carrierCode,
                trackingCode: editForm.trackingCode?.trim() || o.trackingCode,
                note: editForm.note,
              }
            : o
        )
      );

      if (selectedOrder && selectedOrder.id === editingOrder.id) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                receiverName: editForm.receiverName,
                customerName: editForm.receiverName,
                phoneNumber: editForm.phoneNumber,
                shippingAddress: editForm.shippingAddress,
                paymentMethod: editForm.paymentMethod,
                status: editForm.status,
                carrierId: editForm.carrierId,
                carrierName: carrierObj?.name || prev.carrierName,
                carrierCode: carrierObj?.code || prev.carrierCode,
                trackingCode: editForm.trackingCode?.trim() || prev.trackingCode,
                note: editForm.note,
              }
            : null
        );
      }

      setEditingOrder(null);
      showToast(`Đã cập nhật đơn hàng #ORD-${editingOrder.id} thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật thông tin đơn hàng.';
      showToast(`Lỗi: ${msg}`);
    }
  };


  // Đa dạng tìm kiếm cho mục Đơn hàng (mã đơn, tên khách, số điện thoại, tên sản phẩm, trạng thái, địa chỉ, mã vận đơn, đơn vị vận chuyển)
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Tab filter
        if (activeTab !== 'ALL' && order.status !== activeTab) {
          return false;
        }

        // Date filter
        if (dateFilter !== 'all') {
          const orderDate = new Date(order.createdAt).getTime();
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          if (dateFilter === 'today' && now - orderDate > oneDay) return false;
          if (dateFilter === '7days' && now - orderDate > 7 * oneDay) return false;
          if (dateFilter === 'month' && now - orderDate > 30 * oneDay) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const orderCode = `#ord-${order.id}`.toLowerCase();
          const orderIdStr = order.id.toString();
          const matchCode = orderCode.includes(q) || orderIdStr.includes(q);
          const matchName =
            (order.receiverName && order.receiverName.toLowerCase().includes(q)) ||
            (order.customerName && order.customerName.toLowerCase().includes(q)) ||
            false;
          const matchPhone = order.phoneNumber ? order.phoneNumber.toLowerCase().includes(q) : false;
          const matchAddress = order.shippingAddress
            ? order.shippingAddress.toLowerCase().includes(q)
            : false;
          const matchStatus = getStatusLabel(order.status).toLowerCase().includes(q);
          const matchTracking = order.trackingCode ? order.trackingCode.toLowerCase().includes(q) : false;
          const matchCarrier = order.carrierName ? order.carrierName.toLowerCase().includes(q) : false;

          // Search in product items
          const items = order.orderItems || order.items || [];
          const matchProduct = items.some(
            (item) => item.productName && item.productName.toLowerCase().includes(q)
          );

          return matchCode || matchName || matchPhone || matchProduct || matchAddress || matchStatus || matchTracking || matchCarrier;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'latest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'price-desc') {
          return b.totalAmount - a.totalAmount;
        }
        if (sortBy === 'price-asc') {
          return a.totalAmount - b.totalAmount;
        }
        return 0;
      });
  }, [orders, activeTab, dateFilter, searchQuery, sortBy]);

  // Calculate pagination (10 rows/page)
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredOrders, currentPage]);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveTab('ALL');
    setDateFilter('all');
    setSortBy('latest');
    setCurrentPage(1);
  };

  // Render Status Badge matching exact screenshot aesthetic
  const renderStatusBadge = (order: OrderResponse) => {
    if (updatingId === order.id) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 animate-pulse border border-blue-100">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
          Đang cập nhật...
        </span>
      );
    }

    if (order.status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Đã giao
        </span>
      );
    }
    if (order.status === 'SHIPPING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Đang giao
        </span>
      );
    }
    if (order.status === 'PROCESSING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Đang xử lý
        </span>
      );
    }
    if (order.status === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Chờ xử lý
        </span>
      );
    }
    if (order.status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Hủy
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
        {order.status}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Quản lý đơn hàng</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {orders.length} đơn
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách đơn hàng toàn hệ thống với đầy đủ thông tin sản phẩm, khách hàng và trạng thái vận chuyển
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchOrders}
            disabled={isLoading}
            className="p-2 sm:p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs flex items-center gap-2 text-xs font-semibold"
            title="Làm mới dữ liệu từ máy chủ"
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
            Tạo đơn hàng mới
          </Button>
        </div>
      </div>

      {/* Main Container Card - Chiếm toàn bộ không gian còn lại, không cuộn cả trang */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Status Tabs Bar */}
        <div className="border-b border-slate-100 p-2 sm:px-4 flex items-center gap-1.5 overflow-x-auto bg-slate-50/50 text-xs shrink-0 no-scrollbar">
          {TABS.map((tab) => {
            const count =
              tab.key === 'ALL'
                ? orders.length
                : orders.filter((o) => o.status === tab.key).length;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`py-2 px-3.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === tab.key
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-700'
                      }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Enhanced Multi-Field Search Toolbar */}
        <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Main Search Input */}
          <div className="flex-1 max-w-lg">
            <Input
              type="text"
              placeholder="Tìm kiếm theo mã đơn (#ORD-9832), tên khách, sản phẩm, SĐT..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Quick Filters: Date & Sorting */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Date filter dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer text-xs"
              >
                <option value="all">Mọi thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="7days">7 ngày qua</option>
                <option value="month">Tháng này</option>
              </select>
            </div>

            {/* Sort by dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer text-xs"
              >
                <option value="latest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="price-desc">Tổng tiền cao nhất</option>
                <option value="price-asc">Tổng tiền thấp nhất</option>
              </select>
            </div>

            {/* Reset Button when filtering */}
            {(searchQuery || activeTab !== 'ALL' || dateFilter !== 'all' || sortBy !== 'latest') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer text-xs font-semibold"
                title="Đặt lại bộ lọc"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}

            <div className="text-xs text-slate-400 font-medium hidden sm:block pl-1">
              Hiển thị <strong>{filteredOrders.length}</strong> / {orders.length}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold block">Lỗi kết nối</span>
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchOrders}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Đang tải danh sách đơn hàng...</p>
          </div>
        )}

        {/* Empty Search Result State */}
        {!isLoading && !error && filteredOrders.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <ShoppingCart className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Không tìm thấy đơn hàng phù hợp
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {searchQuery
                ? `Không có kết quả khớp với từ khóa "${searchQuery}". Vui lòng thử tìm với từ khóa khác.`
                : 'Chưa có đơn hàng nào trong phân loại này.'}
            </p>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Xem tất cả đơn hàng
            </Button>
          </div>
        )}

        {/* Table View — Đúng bố cục cột như Dashboard: MÃ ĐƠN | KHÁCH HÀNG | SẢN PHẨM | TỔNG TIỀN | TRẠNG THÁI | THỜI GIAN */}
        {!isLoading && !error && filteredOrders.length > 0 && (
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-500 uppercase tracking-wider shadow-2xs">
                  <th className="py-2.5 px-4 bg-slate-50/95">MÃ ĐƠN</th>
                  <th className="py-2.5 px-4 bg-slate-50/95">KHÁCH HÀNG</th>
                  <th className="py-2.5 px-4 bg-slate-50/95">SẢN PHẨM</th>
                  <th className="py-2.5 px-4 bg-slate-50/95">TỔNG TIỀN</th>
                  <th className="py-2.5 px-4 bg-slate-50/95">TRẠNG THÁI</th>
                  <th className="py-2.5 px-4 bg-slate-50/95">THỜI GIAN</th>
                  <th className="py-2.5 px-4 bg-slate-50/95 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedOrders.map((order) => {
                  const items = order.orderItems || order.items || [];
                  const mainProduct = items[0];
                  const remainingCount = items.length > 1 ? items.length - 1 : 0;
                  const isUpdating = updatingId === order.id;

                  // Format order time e.g. 10/06/2025 14:35
                  const orderDate = new Date(order.createdAt);
                  const formattedDate = !isNaN(orderDate.getTime())
                    ? `${orderDate.toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })} ${orderDate.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                    : order.createdAt;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition group"
                    >
                      {/* 1. MÃ ĐƠN: #ORD-9832 */}
                      <td className="py-2.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        #ORD-{order.id}
                      </td>

                      {/* 2. KHÁCH HÀNG: Tên khách hàng & SĐT */}
                      <td className="py-2.5 px-4 max-w-[170px]">
                        <div
                          className="font-medium text-slate-700 truncate"
                          title={order.customerName || order.receiverName}
                        >
                          {order.customerName || order.receiverName || 'Khách hàng'}
                        </div>
                        {order.phoneNumber && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 shrink-0" />
                            <span>{order.phoneNumber}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. SẢN PHẨM: Hiển thị tên sản phẩm trực tiếp như Dashboard */}
                      <td className="py-2.5 px-4 max-w-[220px]">
                        {mainProduct ? (
                          <div className="flex items-center gap-2 min-w-0">
                            {mainProduct.productImageUrl ? (
                              <img
                                src={mainProduct.productImageUrl}
                                alt={mainProduct.productName}
                                className="w-7 h-7 rounded-md object-cover ring-1 ring-slate-100 shrink-0 bg-slate-50"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <ShoppingCart className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span
                                className="text-slate-600 block truncate font-medium"
                                title={mainProduct.productName}
                              >
                                {mainProduct.productName}
                              </span>
                              {remainingCount > 0 && (
                                <span className="text-[10px] text-blue-600 font-semibold">
                                  +{remainingCount} sản phẩm khác
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có sản phẩm</span>
                        )}
                      </td>

                      {/* 4. TỔNG TIỀN: 18.990.000 ₫ */}
                      <td className="py-2.5 px-4 whitespace-nowrap font-bold text-slate-900">
                        {formatPrice(order.totalAmount)}
                      </td>

                      {/* 5. TRẠNG THÁI: Dot Badge phong cách Dashboard + Dropdown chỉnh nhanh + Vận chuyển */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="relative inline-flex items-center">
                            {renderStatusBadge(order)}
                            <select
                              value={order.status}
                              disabled={isUpdating}
                              onChange={(e) =>
                                handleStatusChange(order.id, e.target.value as OrderStatus)
                              }
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              title="Bấm để đổi nhanh trạng thái đơn hàng"
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Thông tin vận chuyển nếu có */}
                          {(order.carrierName || order.trackingCode) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {order.carrierName && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                  <Truck className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                  <span className="max-w-[95px] truncate">{order.carrierName}</span>
                                </span>
                              )}
                              {order.trackingCode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyTrackingCode(order.trackingCode!);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-200 transition cursor-pointer"
                                  title="Nhấn để sao chép mã vận đơn"
                                >
                                  <span>{order.trackingCode}</span>
                                  {copiedCode === order.trackingCode ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 text-slate-400" />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. THỜI GIAN: 10/06/2025 14:35 */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-400 font-medium text-[11px]">
                        {formattedDate}
                      </td>

                      {/* 7. THAO TÁC: Xem, Sửa */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Xem chi tiết đơn hàng"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(order)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Chỉnh sửa đơn hàng"
                          >
                            <Edit className="w-3.5 h-3.5" />
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

        {/* Phân trang: Chuẩn 10 dòng mỗi trang - Cố định ở đáy card */}
        {!isLoading && !error && filteredOrders.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-white">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredOrders.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: TẠO ĐƠN HÀNG MỚI (THÊM)                         */}
      {/* ======================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span>Tạo đơn hàng thủ công mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tên khách hàng / người nhận *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={newOrderForm.receiverName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, receiverName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={newOrderForm.phoneNumber}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Địa chỉ nhận hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Số 123 Đường Cầu Giấy, Quận Cầu Giấy, Hà Nội"
                  value={newOrderForm.shippingAddress}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, shippingAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Box Select: Tên sản phẩm từ Database */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Sản phẩm đặt hàng *
                  </label>
                  <select
                    required
                    value={selectedProductId}
                    disabled={isLoadingProducts}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium truncate"
                  >
                    <option value="">-- Chọn sản phẩm có sẵn --</option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.brand ? `(${p.brand})` : ''}
                      </option>
                    ))}
                  </select>
                  {isLoadingProducts && (
                    <p className="text-[11px] text-blue-600 mt-1 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang tải danh sách sản phẩm...
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phương thức thanh toán</label>
                  <select
                    value={newOrderForm.paymentMethod}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  >
                    <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                    <option value="ONLINE">Thanh toán trực tuyến (ONLINE / VNPAY)</option>
                  </select>
                </div>
              </div>

              {/* Biến thể sản phẩm (Dung lượng, Màu sắc...) */}
              {isLoadingProductDetail && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/70 flex items-center gap-2 text-blue-700 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải thông tin biến thể từ Database...</span>
                </div>
              )}

              {!isLoadingProductDetail && selectedProductDetail && (
                <>
                  {selectedProductDetail.options && selectedProductDetail.options.length > 0 ? (
                    <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-blue-600" />
                          Biến thể sản phẩm ({selectedProductDetail.options.length} tùy chọn)
                        </span>
                        {matchedVariant && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            SKU: <span className="font-mono font-bold text-slate-700">{matchedVariant.sku}</span>
                            {matchedVariant.stock != null && ` • Còn ${matchedVariant.stock} trong kho`}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedProductDetail.options.map((opt) => (
                          <div key={opt.id || opt.name}>
                            <label className="block text-slate-600 font-semibold mb-1">
                              {opt.name} *
                            </label>
                            <select
                              value={selectedOptions[opt.name] || ''}
                              onChange={(e) => handleOptionChange(opt.name, e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-semibold"
                            >
                              {opt.values.map((v) => (
                                <option key={v.id || v.value} value={v.value}>
                                  {v.value}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedProductDetail.variants && selectedProductDetail.variants.length > 1 ? (
                    <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-1.5">
                      <label className="block text-slate-700 font-semibold mb-1">
                        Chọn biến thể *
                      </label>
                      <select
                        value={matchedVariant?.id || ''}
                        onChange={(e) => handleVariantSelect(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      >
                        {selectedProductDetail.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.title || v.sku} - {formatPrice(v.price)} (Còn {v.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Sản phẩm tiêu chuẩn (Không có biến thể phụ)
                      </span>
                      {matchedVariant?.stock != null && (
                        <span className="text-slate-500 text-[11px]">
                          Tồn kho: <strong>{matchedVariant.stock}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Số lượng & Đơn giá (Tự động điền & Readonly/Disabled) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Số lượng * {matchedVariant?.stock != null && (
                      <span className="text-slate-400 font-normal text-[11px]">
                        (Tối đa: {matchedVariant.stock})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={matchedVariant?.stock && matchedVariant.stock > 0 ? matchedVariant.stock : undefined}
                    required
                    value={newOrderForm.quantity}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, quantity: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Đơn giá (VNĐ) <span className="text-slate-400 font-normal text-[11px]">(Cố định từ Database)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={newOrderForm.price > 0 ? formatPrice(newOrderForm.price) : '0 ₫'}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-800 font-bold rounded-xl cursor-not-allowed outline-none select-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ghi chú giao hàng</label>
                <textarea
                  rows={2}
                  placeholder="Giao giờ hành chính, gọi trước khi đến..."
                  value={newOrderForm.note}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center font-bold">
                <span className="text-slate-600">Tổng thanh toán:</span>
                <span className="text-base text-blue-600">
                  {selectedProductId ? formatPrice(newOrderForm.price * newOrderForm.quantity) : '0 ₫'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isCreating}>
                  Lưu đơn hàng
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CHỈNH SỬA THÔNG TIN ĐƠN HÀNG (SỬA)              */}
      {/* ======================================================== */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                <span>Chỉnh sửa đơn hàng #ORD-{editingOrder.id}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditOrderSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Người nhận</label>
                  <input
                    type="text"
                    required
                    value={editForm.receiverName}
                    onChange={(e) => setEditForm({ ...editForm, receiverName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Địa chỉ nhận hàng</label>
                <input
                  type="text"
                  required
                  value={editForm.shippingAddress}
                  onChange={(e) => setEditForm({ ...editForm, shippingAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phương thức thanh toán</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  >
                    <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                    <option value="ONLINE">Thanh toán trực tuyến (ONLINE / VNPAY)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Trạng thái đơn hàng</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as OrderStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Đối tác vận chuyển</label>
                  <select
                    value={editForm.carrierId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      setEditForm({ ...editForm, carrierId: val });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  >
                    <option value="">-- Chưa chỉ định đối tác --</option>
                    {carriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã vận đơn</label>
                  <input
                    type="text"
                    value={editForm.trackingCode || ''}
                    placeholder="VD: GHN839210..."
                    onChange={(e) => setEditForm({ ...editForm, trackingCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingOrder(null)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Cập nhật đơn hàng
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* MODAL 4: XEM CHI TIẾT ĐƠN HÀNG                           */}
      {/* ======================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6 font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Chi tiết đơn hàng #ORD-{selectedOrder.id}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Thời gian đặt: {formatDateTime(selectedOrder.createdAt)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Change Control in Modal */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] mb-1">
                  Trạng thái đơn hàng:
                </span>
                <select
                  value={selectedOrder.status}
                  disabled={updatingId === selectedOrder.id}
                  onChange={(e) =>
                    handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)
                  }
                  className="font-bold py-1.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-right">
                <span className="text-slate-500 block text-[11px] mb-1">
                  Phương thức thanh toán:
                </span>
                <span className="font-bold text-slate-800 uppercase px-2.5 py-1 bg-white border border-slate-200 rounded-md">
                  {selectedOrder.paymentMethod === 'COD' ? 'Thanh toán COD' : 'Thanh toán ONLINE'}
                </span>
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-xs">
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Thông tin khách hàng
                </span>
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{selectedOrder.customerName || selectedOrder.receiverName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{selectedOrder.phoneNumber}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Địa chỉ giao nhận
                </span>
                <div className="flex items-start gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{selectedOrder.shippingAddress}</span>
                </div>
                {selectedOrder.note && (
                  <div className="text-slate-500 italic mt-1 bg-white p-2 rounded border border-slate-200">
                    <strong>Ghi chú:</strong> {selectedOrder.note}
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Carrier & Tracking Section */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Thông tin vận chuyển & Vận đơn
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Liên kết đối tác giao nhận hàng hóa
                    </p>
                  </div>
                </div>

                {/* Quick Dispatch / Update Carrier Button */}
                {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => openDispatchModal(selectedOrder)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100/80 hover:bg-indigo-200 rounded-lg transition cursor-pointer"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>{selectedOrder.carrierId ? 'Đổi đơn vị / Mã vận đơn' : 'Xuất kho & Giao hàng'}</span>
                  </button>
                )}
              </div>

              {/* Carrier details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Đối tác vận chuyển
                  </span>
                  {selectedOrder.carrierName ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-900 text-sm">
                        {selectedOrder.carrierName}
                      </span>
                      {selectedOrder.carrierCode && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                          {selectedOrder.carrierCode}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Chưa chỉ định đơn vị vận chuyển</span>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Mã vận đơn (Tracking Code)
                  </span>
                  {selectedOrder.trackingCode ? (
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {selectedOrder.trackingCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTrackingCode(selectedOrder.trackingCode!)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition cursor-pointer"
                      >
                        {copiedCode === selectedOrder.trackingCode ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Chưa phát hành mã vận đơn</span>
                  )}
                </div>
              </div>

              {/* Order Shipping Progress Stepper */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                  <span>Tiến trình giao hàng:</span>
                  <span className="text-indigo-600 font-bold">{getStatusLabel(selectedOrder.status)}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className={`p-2 rounded-lg border ${selectedOrder.status === 'PENDING' ? 'bg-amber-50 border-amber-300 font-bold text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    1. Tiếp nhận
                  </div>
                  <div className={`p-2 rounded-lg border ${selectedOrder.status === 'PROCESSING' ? 'bg-blue-50 border-blue-300 font-bold text-blue-800' : (['SHIPPING', 'COMPLETED'].includes(selectedOrder.status) ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600')}`}>
                    2. Đang đóng gói
                  </div>
                  <div className={`p-2 rounded-lg border ${selectedOrder.status === 'SHIPPING' ? 'bg-indigo-50 border-indigo-400 font-bold text-indigo-800 ring-2 ring-indigo-200' : (selectedOrder.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600')}`}>
                    3. Đang giao hàng
                  </div>
                  <div className={`p-2 rounded-lg border ${selectedOrder.status === 'COMPLETED' ? 'bg-emerald-100 border-emerald-400 font-bold text-emerald-900 ring-2 ring-emerald-200' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    4. Hoàn tất giao
                  </div>
                </div>
              </div>
            </div>

            {/* Products Table in Modal */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                Danh sách mặt hàng ({selectedOrder.orderItems?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Sản phẩm</th>
                      <th className="py-2.5 px-3 text-center">Số lượng</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá</th>
                      <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedOrder.orderItems || []).map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            {item.productImageUrl && (
                              <img
                                src={item.productImageUrl}
                                alt={item.productName}
                                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-100 bg-slate-50 shrink-0"
                              />
                            )}
                            <div>
                              <span className="font-semibold text-slate-800 block">
                                {item.productName}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {item.variantName && (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {item.variantName}
                                  </span>
                                )}
                                {item.sku && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    SKU: {item.sku}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          x{item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {formatPrice(item.price)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatPrice(item.totalPrice || item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/75 border-t border-slate-200">
                    {(() => {
                      const shippingFee = selectedOrder.shippingFee != null ? selectedOrder.shippingFee : 0;
                      const discount = selectedOrder.discountAmount || 0;
                      const shippingDiscount = selectedOrder.shippingDiscount || 0;
                      const subtotal = selectedOrder.totalAmount - shippingFee + discount;

                      return (
                        <>
                          <tr>
                            <td colSpan={3} className="py-1.5 px-4 text-slate-500 text-right">
                              Tạm tính tiền hàng:
                            </td>
                            <td className="py-1.5 px-4 font-semibold text-slate-700 text-right">
                              {formatPrice(subtotal)}
                            </td>
                          </tr>
                          {discount > 0 && (
                            <tr>
                              <td colSpan={3} className="py-1.5 px-4 text-emerald-600 text-right">
                                Giảm giá voucher đơn hàng {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}:
                              </td>
                              <td className="py-1.5 px-4 font-semibold text-emerald-600 text-right">
                                -{formatPrice(discount)}
                              </td>
                            </tr>
                          )}
                          {shippingDiscount > 0 && (
                            <tr>
                              <td colSpan={3} className="py-1.5 px-4 text-indigo-600 text-right">
                                Voucher Freeship {selectedOrder.shippingCouponCode ? `(${selectedOrder.shippingCouponCode})` : ''}:
                              </td>
                              <td className="py-1.5 px-4 font-semibold text-indigo-600 text-right">
                                -{formatPrice(shippingDiscount)}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td colSpan={3} className="py-1.5 px-4 text-slate-500 text-right">
                              Phí vận chuyển thanh toán:
                            </td>
                            <td className="py-1.5 px-4 font-semibold text-right">
                              {shippingFee === 0 ? (
                                <span className="text-emerald-600 font-bold">Miễn phí (0₫)</span>
                              ) : (
                                <span className="text-slate-700">{formatPrice(shippingFee)}</span>
                              )}
                            </td>
                          </tr>
                          <tr className="border-t border-slate-200">
                            <td colSpan={3} className="py-2.5 px-4 font-bold text-slate-900 text-right">
                              Tổng thanh toán:
                            </td>
                            <td className="py-2.5 px-4 font-black text-rose-600 text-right text-sm">
                              {formatPrice(selectedOrder.totalAmount)}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: XUẤT KHO & GÁN ĐƠN VỊ VẬN CHUYỂN               */}
      {/* ======================================================== */}
      {dispatchOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Xuất kho & Gán đơn vị vận chuyển
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Đơn hàng #ORD-{dispatchOrder.id} • {dispatchOrder.receiverName || dispatchOrder.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Order mini summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Khách nhận:</span>
                  <span className="font-semibold text-slate-900">{dispatchOrder.receiverName} ({dispatchOrder.phoneNumber})</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Địa chỉ nhận:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[280px]" title={dispatchOrder.shippingAddress}>
                    {dispatchOrder.shippingAddress}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền thu hộ (COD):</span>
                  <span className="font-bold text-indigo-600">{formatPrice(dispatchOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Carrier select */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Chọn đối tác vận chuyển <span className="text-rose-500">*</span>
                </label>
                <select
                  value={dispatchCarrierId}
                  onChange={(e) => handleCarrierSelectChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-semibold text-slate-800"
                >
                  {carriers.length === 0 ? (
                    <option value="">Đang tải danh sách nhà vận chuyển...</option>
                  ) : (
                    carriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code}) - {c.serviceType} (Hotline: {c.hotline})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Dữ liệu đồng bộ trực tiếp với danh mục Đối tác vận chuyển trong hệ thống.
                </p>
              </div>

              {/* Tracking code input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">
                    Mã vận đơn (Waybill Tracking Code) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const carrierObj = carriers.find((c) => c.id === dispatchCarrierId);
                      const prefix = carrierObj ? carrierObj.code.toUpperCase() : 'VN';
                      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
                      setDispatchTrackingCode(`${prefix}${Date.now().toString().slice(-6)}${rand}`);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    🔄 Tạo mã ngẫu nhiên
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={dispatchTrackingCode}
                  onChange={(e) => setDispatchTrackingCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: GHN839210..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono font-bold text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Mã này sẽ hiển thị cho khách hàng và tài xế để tra cứu tiến độ bưu kiện.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDispatchOrder(null)}
                  disabled={isSubmittingDispatch}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmDispatch}
                  disabled={isSubmittingDispatch || !dispatchCarrierId}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmittingDispatch ? 'Đang xuất kho...' : 'Xác nhận xuất kho & Giao hàng'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
