import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  Clock,
  MapPin,
  ShoppingBag,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  CreditCard,
  AlertCircle,
  Truck,
  CheckCircle,
  Gift,
  Copy,
  Check,
  Tag,
  AlertTriangle,
  X,
  Info,
} from 'lucide-react';
import { orderService } from '../../api/services/order.service';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../constants/routes';
import { formatPrice, formatDateTime } from '../../utils/format';
import {
  ORDER_STATUS_CONFIG,
  type OrderResponse,
} from '../../models/order.model';
import Button from '../../components/common/Button/Button';
import OrderDetailModal from './OrderDetailModal';
import CancelOrderModal from './CancelOrderModal';

// 5 Tabs đúng theo yêu cầu: Tất cả / Chờ xử lý / Đang giao / Hoàn thành / Đã hủy
type FilterTab = 'ALL' | 'PENDING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}

export const MyOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<OrderResponse | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCoupon(code);
    showToast(`Đã sao chép mã voucher: ${code}`, 'success');
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  // Nhận newOrderId từ state nếu vừa checkout thành công
  const newOrderId = (location.state as { newOrderId?: number })?.newOrderId;

  // Lấy dữ liệu danh sách đơn hàng đã đặt thành công của người dùng hiện tại
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getMyOrders();
      const userOrders = Array.isArray(data)
        ? data
            .filter((o) => !o.userId || !user?.id || String(o.userId) === String(user.id))
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
        : [];
      setOrders(userOrders);

      // Nếu có newOrderId từ trang Checkout, mở xem chi tiết đơn đó
      if (newOrderId) {
        const found = userOrders.find((o) => o.id === newOrderId);
        if (found) setSelectedOrder(found);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử đơn hàng.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [newOrderId, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { state: { from: ROUTES.MY_ORDERS } });
      return;
    }
    fetchOrders();
  }, [isAuthenticated, navigate, fetchOrders]);

  // Xử lý xác nhận hủy đơn (Có modal xác nhận + Cập nhật tại chỗ + Toast)
  const handleConfirmCancelOrder = async (orderId: number) => {
    setIsCancelling(true);

    try {
      const updated = await orderService.cancelMyOrder(orderId);

      // Cập nhật trạng thái tại chỗ (in-place) trong state orders
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, ...(updated || {}), status: 'CANCELLED' }
            : o
        )
      );

      // Cập nhật modal chi tiết nếu đang mở
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, ...(updated || {}), status: 'CANCELLED' } : null
        );
      }

      // Đóng modal xác nhận
      setOrderToCancel(null);
      showToast(`Đã hủy đơn hàng #${orderId} thành công. Tồn kho đã được hoàn lại!`, 'success');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Hủy đơn hàng thất bại. Vui lòng kiểm tra lại!';
      showToast(msg, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  // Lọc theo 5 tabs
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') {
      return order.status === 'PENDING' || order.status === 'PROCESSING';
    }
    return order.status === activeTab;
  });

  const getTabCount = (key: FilterTab) => {
    if (key === 'ALL') return orders.length;
    if (key === 'PENDING') {
      return orders.filter((o) => o.status === 'PENDING' || o.status === 'PROCESSING').length;
    }
    return orders.filter((o) => o.status === key).length;
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1360px] mx-auto space-y-5">
        {/* Toast Thông Báo */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-[70] text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border animate-fade-in flex items-center justify-between gap-3 min-w-[280px] max-w-md ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-red-950 text-white border-red-700'
                : 'bg-gray-900 text-white border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              {toast.type === 'info' && (
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 text-gray-400 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500">
          <Link to={ROUTES.HOME} className="hover:text-blue-600 transition">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900">Đơn hàng của tôi</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <span>Lịch sử đơn hàng</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {orders.length} đơn
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Theo dõi tình trạng vận chuyển và chi tiết các đơn hàng của bạn
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            className="text-xs text-gray-600 hover:text-blue-600 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer font-semibold py-1.5 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Just Placed Alert */}
        {newOrderId && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center gap-3 text-xs shadow-xs animate-fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold block text-sm">
                Đơn hàng #{newOrderId} đã được tiếp nhận thành công!
              </span>
              <span>
                Nhân viên CSKH của chúng tôi sẽ sớm liên hệ xác nhận và tiến hành giao hàng.
              </span>
            </div>
          </div>
        )}

        {/* Tabs Filter Bar (Tất cả / Chờ xử lý / Đang giao / Hoàn thành / Đã hủy) */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-1.5 flex items-center gap-1.5 overflow-x-auto text-xs">
          {TABS.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-3.5 rounded-lg font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#181a20] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 animate-pulse"
              >
                <div className="h-6 w-1/3 bg-gray-200 rounded" />
                <div className="h-16 w-full bg-gray-100 rounded-xl" />
                <div className="h-10 w-1/4 bg-gray-200 rounded self-end" />
              </div>
            ))}
          </div>
        )}

        {/* Error Alert */}
        {error && !loading && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold block">Không thể tải đơn hàng</span>
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchOrders}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/90 p-12 text-center shadow-xs max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {activeTab === 'ALL'
                ? 'Bạn chưa có đơn hàng nào'
                : `Không có đơn hàng nào ở mục "${
                    TABS.find((t) => t.key === activeTab)?.label
                  }"`}
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Khám phá các sản phẩm công nghệ hot nhất hôm nay và đặt hàng với nhiều ưu đãi!
            </p>
            <Button
              variant="dark"
              size="md"
              onClick={() => navigate(ROUTES.PRODUCTS)}
              leftIcon={<Package className="w-4 h-4" />}
            >
              Khám phá sản phẩm
            </Button>
          </div>
        )}

        {/* Orders List */}
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              // Badge trạng thái có màu
              const statusCfg = ORDER_STATUS_CONFIG[order.status] || {
                label: order.status,
                color: 'text-gray-700',
                bgColor: 'bg-gray-100',
                borderColor: 'border-gray-200',
              };

              const items = order.orderItems || order.items || [];
              const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:border-gray-300 transition overflow-hidden"
                >
                  {/* Order Card Header */}
                  <div className="p-4 sm:p-5 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-extrabold text-gray-900 text-sm">
                        Đơn hàng #{order.id}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatDateTime(order.createdAt)}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600 font-semibold flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        {order.paymentMethod === 'COD'
                          ? 'Thanh toán COD'
                          : order.paymentMethod === 'BANK_TRANSFER'
                          ? 'Chuyển khoản ngân hàng'
                          : order.paymentMethod}
                      </span>
                    </div>

                    {/* Status Badge có màu */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.borderColor}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{statusCfg.label}</span>
                    </div>
                  </div>

                  {/* Order Products List */}
                  <div className="divide-y divide-gray-100 p-4 sm:p-5 space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id || item.productId}
                        className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 p-1.5 shrink-0 flex items-center justify-center">
                            <img
                              src={
                                item.productImageUrl ||
                                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100'
                              }
                              alt={item.productName}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100';
                              }}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/products/${item.productId}`}
                              className="font-bold text-gray-900 hover:text-blue-600 transition truncate block leading-snug"
                            >
                              {item.productName}
                            </Link>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {item.variantName && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {item.variantName}
                                </span>
                              )}
                              {item.sku && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  SKU: {item.sku}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-500 block mt-0.5">
                              Số lượng: {item.quantity} × {formatPrice(item.price)}
                            </span>
                          </div>
                        </div>

                        <span className="font-bold text-gray-900 shrink-0 text-sm">
                          {formatPrice(item.totalPrice || item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order Card Footer */}
                  <div className="p-4 sm:p-5 bg-gray-50/40 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    {/* Shipping quick summary */}
                    <div className="flex items-start gap-2 text-gray-600 max-w-md">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold text-gray-800">{order.receiverName}</span>
                        {' — '}
                        <span>{order.phoneNumber}</span>
                        <p className="text-gray-500 truncate mt-0.5">{order.shippingAddress}</p>
                        {order.carrierName && (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-indigo-700 font-medium">
                            <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{order.carrierName}</span>
                            {order.trackingCode && (
                              <span className="font-mono bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded text-[10px]">
                                {order.trackingCode}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-gray-500 block">
                          Tổng đơn ({totalItemsCount} món):
                        </span>
                        <span className="text-base font-black text-red-600">
                          {formatPrice(order.totalAmount)}
                        </span>
                        {order.discountAmount && order.discountAmount > 0 ? (
                          <div className="text-[10px] font-semibold text-emerald-700 flex items-center justify-start sm:justify-end gap-1 mt-0.5">
                            <Tag className="w-2.5 h-2.5" />
                            <span>Đã giảm {formatPrice(order.discountAmount)}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Thông tin hủy nếu có */}
                      {order.status === 'CANCELLED' && (order.cancelReason || order.compensationCoupon) && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                          <div className="flex items-center gap-1.5 text-rose-800">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="text-[11px]">
                              <strong className="font-bold text-rose-900">Lý do hủy:</strong> "{order.cancelReason || 'Đã hủy đơn'}"
                            </span>
                          </div>
                          {order.compensationCoupon && (
                            <div className="flex items-center gap-1.5 sm:pl-2 sm:border-l sm:border-rose-200">
                              <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="text-[11px] font-bold text-amber-900 whitespace-nowrap">Mã 5%:</span>
                              <button
                                type="button"
                                onClick={() => handleCopyCoupon(order.compensationCoupon!)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-300 font-mono font-bold text-amber-800 hover:bg-amber-100/80 transition cursor-pointer shadow-2xs text-[11px]"
                                title="Sao chép mã"
                              >
                                <span>{order.compensationCoupon}</span>
                                {copiedCoupon === order.compensationCoupon ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-amber-600" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* NÚT "HỦY ĐƠN": CHỈ HIỆN VỚI PENDING */}
                      {order.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => setOrderToCancel(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Hủy đơn</span>
                        </button>
                      )}

                      {/* Nút xem chi tiết đơn hàng */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                        rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        Chi tiết
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal 1: Chi tiết đơn hàng (OrderDetailModal) */}
        <OrderDetailModal
          order={selectedOrder}
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          onCancelClick={(ord) => {
            setOrderToCancel(ord);
          }}
        />

        {/* Modal 2: Xác nhận hủy đơn hàng (CancelOrderModal) */}
        <CancelOrderModal
          order={orderToCancel}
          isOpen={Boolean(orderToCancel)}
          isCancelling={isCancelling}
          onClose={() => setOrderToCancel(null)}
          onConfirm={handleConfirmCancelOrder}
        />
      </div>
    </div>
  );
};

export default MyOrdersPage;
