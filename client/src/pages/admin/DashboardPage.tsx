import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { orderService } from '../../api/services/order.service';
import { productService } from '../../api/services/product.service';
import { ROUTES } from '../../constants/routes';
import type { Order, OrderStatus } from '../../models/order.model';

export const DashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [categoriesCount, setCategoriesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orderList, prodRes, catList] = await Promise.all([
        orderService.getAllOrders(),
        productService.getProducts({ limit: 1 }),
        productService.getCategories(),
      ]);
      setOrders(orderList);
      setProductsCount(prodRes.total || prodRes.data.length);
      setCategoriesCount(catList.length);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalRevenue = orders.reduce((sum, ord) => {
    if (ord.status !== 'CANCELLED') {
      return sum + (Number(ord.totalAmount) || 0);
    }
    return sum;
  }, 0);

  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;

  const uniqueCustomers = new Set(
    orders
      .map((o) => o.customerName || o.receiverName || o.username)
      .filter(Boolean)
  ).size;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price || 0);
  };

  const stats = [
    {
      title: 'Tổng doanh thu',
      value: formatPrice(totalRevenue),
      change: orders.length > 0 ? `${orders.length} đơn hàng ghi nhận` : 'Chưa có phát sinh',
      icon: DollarSign,
      color: 'bg-emerald-500',
    },
    {
      title: 'Tổng đơn hàng',
      value: `${orders.length} đơn`,
      change: `${pendingOrdersCount} đơn đang chờ xử lý`,
      icon: ShoppingCart,
      color: 'bg-indigo-500',
    },
    {
      title: 'Sản phẩm đang bán',
      value: `${productsCount} món`,
      change: `${categoriesCount} danh mục ngành hàng`,
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: 'Khách hàng',
      value: `${uniqueCustomers || 1} người`,
      change: 'Dữ liệu thời gian thực',
      icon: Users,
      color: 'bg-amber-500',
    },
  ];

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" /> Đang chờ
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
            <Package className="w-3 h-3" /> Chuẩn bị
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
            <Truck className="w-3 h-3" /> Đang giao
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" /> Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
            <XCircle className="w-3 h-3" /> Đã hủy
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const recentOrders = orders.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-900 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-semibold uppercase tracking-wider">
            NEXOR Admin Portal
          </span>
          <h1 className="text-2xl font-bold mt-2">Tổng Quan Hệ Thống Bán Hàng</h1>
          <p className="text-xs text-indigo-200 mt-1">
            Chào mừng bạn quay trở lại trang quản trị. Dữ liệu bán hàng & đơn hàng được đồng bộ tự động từ Backend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl font-medium cursor-pointer transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Đồng bộ dữ liệu
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {stat.title}
                </span>
                <span className="text-xl font-extrabold text-slate-800 block mt-1">
                  {loading ? '...' : stat.value}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium block mt-1">
                  {stat.change}
                </span>
              </div>
              <div
                className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-white shadow-md`}
              >
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Đơn Hàng Mới Nhất</h2>
            <p className="text-xs text-slate-500">Các đơn hàng phát sinh trực tiếp từ khách mua sắm</p>
          </div>
          <Link
            to={ROUTES.ADMIN_ORDERS}
            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
          >
            Xem tất cả đơn hàng <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Mã đơn</th>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Tổng tiền</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Đang đồng bộ đơn hàng...
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Chưa có đơn hàng nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-indigo-600">#ORD-{order.id}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {order.receiverName || order.customerName || 'Khách vãng lai'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {formatPrice(order.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '---'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
