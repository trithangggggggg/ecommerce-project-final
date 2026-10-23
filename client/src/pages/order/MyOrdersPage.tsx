import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  Clock,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  X,
  CreditCard,
  FileText,
  AlertCircle,
  Truck,
  CheckCircle,
} from 'lucide-react';
import { orderService } from '../../api/services/order.service';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../constants/routes';
import { formatPrice, formatDateTime } from '../../utils/format';
import {
  ORDER_STATUS_CONFIG,
  type OrderResponse,
  type OrderStatus,
} from '../../models/order.model';
import Button from '../../components/common/Button/Button';

type FilterTab = 'ALL' | OrderStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Tất cả đơn' },
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'PROCESSING', label: 'Đang xử lý' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export const MyOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Nhận newOrderId từ state nếu vừa checkout thành công
  const newOrderId = (location.state as { newOrderId?: number })?.newOrderId;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getMyOrders();
      setOrders(data);

      // Nếu có newOrderId, mở luôn chi tiết hoặc highlight
      if (newOrderId) {
        const found = data.find((o) => o.id === newOrderId);
        if (found) setSelectedOrder(found);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử đơn hàng.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [newOrderId]);

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${orderId}? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    setCancellingId(orderId);
    try {
      await orderService.cancelMyOrder(orderId);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
      fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Hủy đơn hàng thất bại';
      alert(`Lỗi: ${msg}`);
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { state: { from: ROUTES.MY_ORDERS } });
      return;
    }
    fetchOrders();
  }, [isAuthenticated, navigate, fetchOrders]);

  // Lọc theo tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'ALL') return true;
    return order.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-[#f5f6fa] py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1360px] mx-auto space-y-5">
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
              Theo dõi tình trạng vận chuyển và chi tiết các đơn hàng bạn đã đặt
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
                Nhân viên CSKH của NEXOR sẽ sớm liên hệ qua số điện thoại để xác nhận lịch giao hàng.
              </span>
            </div>
          </div>
        )}

        {/* Tabs Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-1.5 flex items-center gap-1.5 overflow-x-auto text-xs">
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
                className={`py-2 px-3.5 rounded-lg font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-[#181a20] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === tab.key
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-200 text-gray-700'
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
                : `Không có đơn hàng nào ở trạng thái "${
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
                        {order.paymentMethod === 'COD' ? 'Thanh toán COD' : order.paymentMethod}
                      </span>
                    </div>

                    {/* Status Badge */}
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
                      </div>
                    </div>

                    {/* Total & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-gray-500 block">
                          Tổng đơn ({totalItemsCount} món):
                        </span>
                        <span className="text-base font-black text-red-600">
                          {formatPrice(order.totalAmount)}
                        </span>
                      </div>

                      {order.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingId === order.id}
                          className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition cursor-pointer disabled:opacity-50"
                        >
                          {cancellingId === order.id ? 'Đang hủy...' : 'Hủy đơn'}
                        </button>
                      )}

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

        {/* Modal: Order Details */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Truck className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Chi tiết đơn hàng #{selectedOrder.id}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Đặt lúc {formatDateTime(selectedOrder.createdAt)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px]">Trạng thái đơn hàng:</span>
                  <span
                    className={`font-bold inline-flex items-center gap-1.5 mt-0.5 ${
                      ORDER_STATUS_CONFIG[selectedOrder.status]?.color || 'text-gray-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {ORDER_STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-gray-500 block text-[11px]">Phương thức:</span>
                  <span className="font-bold text-gray-800 mt-0.5 block">
                    {selectedOrder.paymentMethod === 'COD' ? 'Thanh toán COD' : selectedOrder.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Delivery Information Box */}
              <div className="space-y-2 text-xs bg-gray-50/60 p-4 rounded-xl border border-gray-200/80">
                <h4 className="font-bold text-gray-900 uppercase tracking-wide text-[11px]">
                  Địa chỉ nhận hàng
                </h4>
                <div className="space-y-1 text-gray-600">
                  <p className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-semibold text-gray-900">
                      {selectedOrder.receiverName}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{selectedOrder.phoneNumber}</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span>{selectedOrder.shippingAddress}</span>
                  </p>
                  {selectedOrder.note && (
                    <p className="flex items-start gap-2 pt-1 border-t border-gray-200 text-gray-500">
                      <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>Ghi chú: {selectedOrder.note}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 uppercase tracking-wide text-[11px]">
                  Danh sách sản phẩm
                </h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 text-xs">
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
                          className="w-10 h-10 object-contain rounded-md bg-gray-50 border border-gray-100 p-1"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 truncate">{item.productName}</p>
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
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900">
                        {formatPrice(item.totalPrice || item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-emerald-600">Miễn phí</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
                  <span className="font-bold text-sm text-gray-900">Tổng tiền đã thanh toán</span>
                  <span className="text-lg font-black text-red-600">
                    {formatPrice(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                {selectedOrder.status === 'PENDING' ? (
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    disabled={cancellingId === selectedOrder.id}
                    className="px-4 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition cursor-pointer disabled:opacity-50"
                  >
                    {cancellingId === selectedOrder.id ? 'Đang hủy...' : 'Hủy đơn hàng này'}
                  </button>
                ) : (
                  <div />
                )}
                <Button variant="dark" size="sm" onClick={() => setSelectedOrder(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
