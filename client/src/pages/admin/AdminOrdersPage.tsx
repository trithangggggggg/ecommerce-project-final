import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  User,
  X,
  FileText,
  Truck,
} from 'lucide-react';
import { orderService } from '../../api/services/order.service';
import { formatPrice, formatDateTime } from '../../utils/format';
import {
  ORDER_STATUS_CONFIG,
  type OrderResponse,
  type OrderStatus,
} from '../../models/order.model';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

type FilterTab = 'ALL' | OrderStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Tất cả đơn' },
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'PROCESSING', label: 'Đang xử lý' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPING', label: 'Đang giao hàng' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await orderService.getAllOrders();
      setOrders(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getNextValidStatuses = (current: OrderStatus): OrderStatus[] => {
    switch (current) {
      case 'PENDING':
        return ['PENDING', 'PROCESSING', 'CANCELLED'];
      case 'PROCESSING':
        return ['PROCESSING', 'SHIPPING', 'CANCELLED'];
      case 'SHIPPING':
        return ['SHIPPING', 'COMPLETED', 'CANCELLED'];
      case 'COMPLETED':
        return ['COMPLETED'];
      case 'CANCELLED':
        return ['CANCELLED'];
      default:
        return ['PENDING', 'PROCESSING', 'SHIPPING', 'COMPLETED', 'CANCELLED'];
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder) {
      const allowed = getNextValidStatuses(targetOrder.status);
      if (!allowed.includes(newStatus)) {
        showToast(
          `Không thể chuyển từ "${ORDER_STATUS_CONFIG[targetOrder.status]?.label}" sang "${ORDER_STATUS_CONFIG[newStatus]?.label}". Vui lòng tuân thủ quy trình.`
        );
        return;
      }
    }

    setUpdatingId(orderId);
    try {
      const updated = await orderService.updateOrderStatus(orderId, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: updated.status || newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: updated.status || newStatus } : null
        );
      }
      showToast(`Đã cập nhật trạng thái đơn #${orderId} sang "${ORDER_STATUS_CONFIG[newStatus]?.label || newStatus}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái đơn hàng.';
      showToast(`Lỗi: ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Lọc theo search và tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab !== 'ALL' && order.status !== activeTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toString().includes(q);
      const matchName = order.receiverName?.toLowerCase().includes(q) || false;
      const matchPhone = order.phoneNumber?.toLowerCase().includes(q) || false;
      const matchCustomer = order.customerName?.toLowerCase().includes(q) || false;
      return matchId || matchName || matchPhone || matchCustomer;
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-0.5">
            Quản lý bán hàng
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Quản lý đơn hàng</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {orders.length} đơn
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi, xử lý và cập nhật tiến độ giao vận các đơn hàng trong hệ thống
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          disabled={isLoading}
          className="p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs flex items-center gap-2 text-xs font-semibold"
          title="Làm mới dữ liệu từ máy chủ"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Status Tabs Bar */}
        <div className="border-b border-slate-100 p-2 sm:px-4 flex items-center gap-1.5 overflow-x-auto bg-slate-50/50 text-xs">
          {TABS.map((tab) => {
            const count =
              tab.key === 'ALL'
                ? orders.length
                : orders.filter((o) => o.status === tab.key).length;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
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

        {/* Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Tìm kiếm theo mã đơn, họ tên, số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Hiển thị <strong>{filteredOrders.length}</strong> / {orders.length} đơn hàng
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
            <p className="text-xs text-slate-500">Đang tải danh sách đơn hàng từ máy chủ...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredOrders.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <ShoppingCart className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Không có đơn hàng nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `Không tìm thấy đơn hàng nào khớp với từ khóa "${searchQuery}"`
                : 'Chưa có đơn hàng nào trong phân loại này.'}
            </p>
          </div>
        )}

        {/* Table View */}
        {!isLoading && !error && filteredOrders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Mã đơn</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Địa chỉ giao</th>
                  <th className="py-3 px-4">Sản phẩm</th>
                  <th className="py-3 px-4">Tổng tiền</th>
                  <th className="py-3 px-4">Ngày đặt</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const statusCfg = ORDER_STATUS_CONFIG[order.status] || {
                    label: order.status,
                    color: 'text-slate-700',
                    bgColor: 'bg-slate-100',
                    borderColor: 'border-slate-200',
                  };
                  const items = order.orderItems || order.items || [];
                  const isUpdating = updatingId === order.id;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/60 transition group"
                    >
                      {/* Order ID */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                        #OD-{order.id}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4 min-w-44">
                        <div className="font-bold text-slate-800 truncate">
                          {order.receiverName || order.customerName || 'Khách vãng lai'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{order.phoneNumber}</span>
                        </div>
                      </td>

                      {/* Shipping Address */}
                      <td className="py-3.5 px-4 max-w-xs truncate" title={order.shippingAddress}>
                        <span className="text-slate-600 truncate block">
                          {order.shippingAddress}
                        </span>
                      </td>

                      {/* Items Count */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {items.reduce((s, i) => s + i.quantity, 0)} món
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({items.length} loại)
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-black text-slate-900 block">
                          {formatPrice(order.totalAmount)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {order.paymentMethod === 'COD' ? 'Thanh toán COD' : order.paymentMethod}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {formatDateTime(order.createdAt)}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="relative inline-block">
                          <select
                            value={order.status}
                            disabled={isUpdating || order.status === 'COMPLETED' || order.status === 'CANCELLED'}
                            onChange={(e) =>
                              handleStatusChange(order.id, e.target.value as OrderStatus)
                            }
                            className={`text-xs font-bold py-1 pl-2.5 pr-7 rounded-lg border appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                              statusCfg.bgColor
                            } ${statusCfg.color} ${statusCfg.borderColor} ${
                              order.status === 'COMPLETED' || order.status === 'CANCELLED'
                                ? 'opacity-90 cursor-default'
                                : 'cursor-pointer hover:shadow-xs'
                            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={
                              order.status === 'COMPLETED' || order.status === 'CANCELLED'
                                ? 'Đơn hàng ở trạng thái kết thúc'
                                : 'Cập nhật trạng thái đơn hàng'
                            }
                          >
                            {STATUS_OPTIONS.map((opt) => {
                              const isAllowed = getNextValidStatuses(order.status).includes(opt.value);
                              return (
                                <option key={opt.value} value={opt.value} disabled={!isAllowed}>
                                  {opt.label} {!isAllowed ? '(Không hợp lệ)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="w-3 h-3 text-current absolute right-2 top-2.5 pointer-events-none opacity-60" />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Xem chi tiết đơn hàng"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
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
                    Chi tiết đơn hàng #OD-{selectedOrder.id}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Đặt lúc {formatDateTime(selectedOrder.createdAt)}
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
                <span className="text-slate-500 block text-[11px]">Hình thức thanh toán:</span>
                <span className="font-bold text-slate-800 mt-1 block">
                  {selectedOrder.paymentMethod === 'COD' ? 'Thanh toán COD' : selectedOrder.paymentMethod}
                </span>
              </div>
            </div>

            {/* Customer & Shipping Information */}
            <div className="space-y-2 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
                Thông tin nhận hàng
              </h4>
              <div className="space-y-1 text-slate-600">
                <p className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-900">
                    {selectedOrder.receiverName}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedOrder.phoneNumber}</span>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{selectedOrder.shippingAddress}</span>
                </p>
                {selectedOrder.note && (
                  <p className="flex items-start gap-2 pt-1 border-t border-slate-200 text-slate-500">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>Ghi chú: {selectedOrder.note}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
                Sản phẩm trong đơn
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                {(selectedOrder.orderItems || selectedOrder.items || []).map((item) => (
                  <div
                    key={item.id || item.productId}
                    className="p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={
                          item.productImageUrl ||
                          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=80'
                        }
                        alt={item.productName}
                        className="w-10 h-10 object-contain rounded-md bg-slate-50 border border-slate-100 p-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                        <p className="text-[11px] text-slate-500">
                          {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">
                      {formatPrice(item.totalPrice || item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Calculation */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                <span className="font-semibold text-emerald-600">Miễn phí</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                <span className="font-bold text-sm text-slate-900">Tổng tiền đơn hàng</span>
                <span className="text-lg font-black text-red-600">
                  {formatPrice(selectedOrder.totalAmount)}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <Button variant="dark" size="sm" onClick={() => setSelectedOrder(null)}>
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
