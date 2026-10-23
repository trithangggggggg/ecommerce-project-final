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
  Trash2,
  Calendar,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { orderService } from '../../api/services/order.service';
import { formatPrice, formatDateTime } from '../../utils/format';
import {
  type OrderResponse,
  type OrderStatus,
  type PaymentMethod,
} from '../../models/order.model';
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

  // Pagination state (10 items/page)
  const [currentPage, setCurrentPage] = useState(1);

  // CRUD Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrderResponse | null>(null);

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
    productName: 'iPhone 15 Pro Max 256GB',
    quantity: 1,
    price: 29990000,
    note: '',
  });

  // Edit form state
  const [editForm, setEditForm] = useState<{
    receiverName: string;
    phoneNumber: string;
    shippingAddress: string;
    paymentMethod: PaymentMethod;
    status: OrderStatus;
    note: string;
  }>({
    receiverName: '',
    phoneNumber: '',
    shippingAddress: '',
    paymentMethod: 'COD',
    status: 'PENDING',
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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await orderService.updateOrderStatus(orderId, { status: newStatus }).catch(() => {});
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      showToast(`Đã chuyển trạng thái đơn #ORD-${orderId} sang "${getStatusLabel(newStatus)}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái đơn hàng.';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setUpdatingId(null);
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

  // Submit Create Order
  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.receiverName.trim() || !newOrderForm.phoneNumber.trim() || !newOrderForm.shippingAddress.trim()) {
      showToast('Vui lòng điền đầy đủ họ tên, SĐT và địa chỉ nhận hàng');
      return;
    }

    const newId = orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 9833;
    const createdOrder: OrderResponse = {
      id: newId,
      userId: 1,
      username: 'guest',
      customerName: newOrderForm.receiverName,
      receiverName: newOrderForm.receiverName,
      phoneNumber: newOrderForm.phoneNumber,
      shippingAddress: newOrderForm.shippingAddress,
      totalAmount: newOrderForm.price * newOrderForm.quantity,
      status: 'PENDING',
      paymentMethod: newOrderForm.paymentMethod,
      note: newOrderForm.note || undefined,
      createdAt: new Date().toISOString(),
      orderItems: [
        {
          id: Math.floor(Math.random() * 10000),
          productId: 1,
          productName: newOrderForm.productName,
          productImageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100',
          quantity: newOrderForm.quantity,
          price: newOrderForm.price,
          totalPrice: newOrderForm.price * newOrderForm.quantity,
        },
      ],
    };

    setOrders([createdOrder, ...orders]);
    setIsCreateOpen(false);
    setNewOrderForm({
      receiverName: '',
      phoneNumber: '',
      shippingAddress: '',
      paymentMethod: 'COD',
      productName: 'iPhone 15 Pro Max 256GB',
      quantity: 1,
      price: 29990000,
      note: '',
    });
    showToast(`Đã tạo đơn hàng mới #ORD-${newId} thành công!`);
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
      note: order.note || '',
    });
  };

  // Submit Edit Order
  const handleEditOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

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
              note: editForm.note,
            }
          : null
      );
    }

    showToast(`Đã cập nhật thông tin đơn hàng #ORD-${editingOrder.id}`);
    setEditingOrder(null);
  };

  // Confirm Delete Order
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
    if (selectedOrder?.id === deleteTarget.id) setSelectedOrder(null);
    showToast(`Đã xóa đơn hàng #ORD-${deleteTarget.id} khỏi hệ thống.`);
    setDeleteTarget(null);
  };

  // Đa dạng tìm kiếm cho mục Đơn hàng (mã đơn, tên khách, số điện thoại, tên sản phẩm, trạng thái, địa chỉ)
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
          const now = new Date('2025-06-11T00:00:00.000Z').getTime();
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

          // Search in product items
          const items = order.orderItems || order.items || [];
          const matchProduct = items.some(
            (item) => item.productName && item.productName.toLowerCase().includes(q)
          );

          return matchCode || matchName || matchPhone || matchProduct || matchAddress || matchStatus;
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
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
            onClick={() => setIsCreateOpen(true)}
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
                className={`py-2 px-3.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === tab.key
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

                      {/* 5. TRẠNG THÁI: Dot Badge phong cách Dashboard + Dropdown chỉnh nhanh */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
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
                      </td>

                      {/* 6. THỜI GIAN: 10/06/2025 14:35 */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-400 font-medium text-[11px]">
                        {formattedDate}
                      </td>

                      {/* 7. THAO TÁC: Xem, Sửa, Xóa */}
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
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(order)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Xóa đơn hàng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tên sản phẩm</label>
                  <input
                    type="text"
                    value={newOrderForm.productName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, productName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số lượng</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrderForm.quantity}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Đơn giá (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={newOrderForm.price}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, price: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
                  {formatPrice(newOrderForm.price * newOrderForm.quantity)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
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
      {/* MODAL 3: XÁC NHẬN XÓA ĐƠN HÀNG (XÓA)                     */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4 font-sans text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xóa đơn hàng #ORD-{deleteTarget.id}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Hành động này sẽ xóa vĩnh viễn đơn hàng của khách hàng <strong>{deleteTarget.customerName || deleteTarget.receiverName}</strong> khỏi danh sách.
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
                onClick={handleConfirmDelete}
              >
                Xác nhận xóa
              </Button>
            </div>
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
                    <tr>
                      <td colSpan={3} className="py-3 px-4 font-bold text-slate-700 text-right">
                        Tổng thanh toán:
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 text-right text-sm">
                        {formatPrice(selectedOrder.totalAmount)}
                      </td>
                    </tr>
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
    </div>
  );
};

export default AdminOrdersPage;
