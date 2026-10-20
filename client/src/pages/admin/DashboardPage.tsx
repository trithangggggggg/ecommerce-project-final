import React from 'react';
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const stats = [
    {
      title: 'Tổng doanh thu',
      value: '128.450.000 ₫',
      change: '+14.5% tuần này',
      icon: DollarSign,
      color: 'bg-emerald-500',
    },
    {
      title: 'Đơn hàng mới',
      value: '42 đơn',
      change: '+8 đơn hôm nay',
      icon: ShoppingCart,
      color: 'bg-indigo-500',
    },
    {
      title: 'Sản phẩm đang bán',
      value: '156 món',
      change: '12 danh mục',
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: 'Khách hàng',
      value: '1.240 người',
      change: '+32 thành viên mới',
      icon: Users,
      color: 'bg-amber-500',
    },
  ];

  const recentOrders = [
    { id: '#ORD-9821', customer: 'Trần Văn Hoàng', total: '1.850.000 ₫', status: 'COMPLETED', date: 'Vừa xong' },
    { id: '#ORD-9820', customer: 'Nguyễn Thị Mai', total: '420.000 ₫', status: 'PENDING', date: '15 phút trước' },
    { id: '#ORD-9819', customer: 'Lê Quốc Bảo', total: '2.300.000 ₫', status: 'SHIPPING', date: '1 giờ trước' },
    { id: '#ORD-9818', customer: 'Phạm Hương Ly', total: '950.000 ₫', status: 'COMPLETED', date: '3 giờ trước' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-900 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-semibold uppercase tracking-wider">
            Admin Dashboard
          </span>
          <h1 className="text-2xl font-bold mt-2">Tổng Quan Hệ Thống Bán Hàng</h1>
          <p className="text-xs text-indigo-200 mt-1">
            Chào mừng bạn quay trở lại trang quản trị. Dưới đây là thống kê tình hình kinh doanh hôm nay.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1.5 rounded-xl font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> Hệ thống hoạt động tốt
          </span>
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
                  {stat.value}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium block mt-1">
                  {stat.change}
                </span>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-white shadow-md`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Đơn Hàng Gần Đây</h2>
            <p className="text-xs text-slate-500">Các đơn hàng vừa được khách đặt qua hệ thống</p>
          </div>
          <span className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer">
            Xem tất cả đơn hàng
          </span>
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
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{order.id}</td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{order.customer}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{order.total}</td>
                  <td className="py-3.5 px-4">
                    {order.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3" /> Hoàn thành
                      </span>
                    )}
                    {order.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                        <Clock className="w-3 h-3" /> Đang chờ
                      </span>
                    )}
                    {order.status === 'SHIPPING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                        <Package className="w-3 h-3" /> Đang giao
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
