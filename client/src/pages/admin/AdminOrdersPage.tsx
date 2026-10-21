import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Clock,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Phone,
  MapPin,
} from 'lucide-react';
import { orderService } from '../../api/services/order.service';
import type { Order, OrderStatus } from '../../models/order.model';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await orderService.getAllOrders();
      setOrders(data);
    } catch (err) {
      console.error('Không thể tải đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const updated = await orderService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: updated.status } : ord))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
      setActionSuccess(`Đã cập nhật đơn hàng #${orderId} sang trạng thái: ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật trạng thái đơn hàng: ${err.message || 'Thao tác thất bại'}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        selectedStatus === 'ALL' || order.status === selectedStatus;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        `#ord-${order.id}`.includes(query) ||
        (order.customerName && order.customerName.toLowerCase().includes(query)) ||
        (order.receiverName && order.receiverName.toLowerCase().includes(query)) ||
        (order.phoneNumber && order.phoneNumber.includes(query)) ||
        (order.shippingAddress && order.shippingAddress.toLowerCase().includes(query));

      return matchesStatus && matchesQuery;
    });
  }, [orders, selectedStatus, searchQuery]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: orders.length,
      PENDING: 0,
      PROCESSING: 0,
      SHIPPING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });
    return counts;
  }, [orders]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price || 0);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Chờ xử lý
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Package className="w-3 h-3" /> Đang đóng gói
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Truck className="w-3 h-3" /> Đang giao hàng
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" /> Đã hủy
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-600" />
            Quản Lý Đơn Hàng (Orders)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi, phân loại và cập nhật tiến độ giao hàng thời gian thực từ cơ sở dữ liệu
          </p>
        </div>
        <button
          type="button"
          onClick={fetchOrders}
          disabled={loading}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'PENDING', label: 'Chờ xử lý' },
          { key: 'PROCESSING', label: 'Đang chuẩn bị' },
          { key: 'SHIPPING', label: 'Đang giao' },
          { key: 'COMPLETED', label: 'Hoàn thành' },
          { key: 'CANCELLED', label: 'Đã hủy' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedStatus === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {countByStatus[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Table Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn (#ORD-...), tên khách, SĐT, địa chỉ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
            Hiển thị <span className="font-bold text-slate-800">{filteredOrders.length}</span> đơn hàng
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã đơn</th>
                <th className="py-3 px-4">Người nhận</th>
                <th className="py-3 px-4">Liên hệ</th>
                <th className="py-3 px-4">Tổng tiền</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Hành động</th>
                <th className="py-3 px-4">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Đang tải danh sách đơn hàng...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-indigo-600">
                      #ORD-{order.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">
                        {order.receiverName || order.customerName || 'Khách hàng'}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px] block" title={order.shippingAddress}>
                        {order.shippingAddress || 'Chưa cung cấp'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {order.phoneNumber || '---'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatPrice(order.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {/* Status Change Selector */}
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value as OrderStatus)
                          }
                          className="bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 py-1 px-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value="PENDING">Chờ xử lý</option>
                          <option value="PROCESSING">Đang chuẩn bị</option>
                          <option value="SHIPPING">Đang giao</option>
                          <option value="COMPLETED">Hoàn thành</option>
                          <option value="CANCELLED">Hủy đơn</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '---'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Chi Tiết Đơn Hàng #ORD-{selectedOrder.id}
                </h3>
                <span className="text-xs text-slate-400">
                  Ngày đặt: {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('vi-VN') : '---'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Người nhận hàng:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {selectedOrder.receiverName || selectedOrder.customerName || 'N/A'}
                </span>
                <span className="text-slate-600 flex items-center gap-1.5 mt-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  {selectedOrder.phoneNumber || 'Chưa cung cấp'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Địa chỉ giao:</span>
                <span className="text-slate-700 flex items-start gap-1.5 mt-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  {selectedOrder.shippingAddress || 'Chưa cung cấp'}
                </span>
                <span className="text-slate-400 block mt-2">
                  Phương thức: <span className="font-semibold text-slate-700">{selectedOrder.paymentMethod || 'COD'}</span>
                </span>
              </div>
            </div>

            {/* Item List */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">
                Danh sách sản phẩm ({selectedOrder.orderItems?.length || 0})
              </h4>
              <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 ? (
                  selectedOrder.orderItems.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        {item.productImage && (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                          />
                        )}
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            {item.productName}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {formatPrice(item.price)} x {item.quantity}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">
                        {formatPrice(item.subtotal || item.price * item.quantity)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Chi tiết sản phẩm đã được lưu trữ trong cơ sở dữ liệu.
                  </div>
                )}
              </div>
            </div>

            {/* Total and Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs text-slate-400 block">Tổng thanh toán:</span>
                <span className="text-lg font-black text-rose-600 block">
                  {formatPrice(selectedOrder.totalAmount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Trạng thái:</span>
                {getStatusBadge(selectedOrder.status)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
