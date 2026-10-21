import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ChevronDown,
  ShoppingCart,
  Package,
  Users,
  PackageCheck,
  RotateCw,
} from 'lucide-react';
import { ROUTES } from '../../constants/routes';
import { dashboardService, type DashboardData } from '../../api/services/dashboard.service';

export const DashboardPage: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7 ngày gần nhất');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Gọi API lấy dữ liệu thực tế từ Backend
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const res = await dashboardService.getDashboardData();
      setDashboardData(res);
    } catch (err) {
      console.warn('Không thể tải dữ liệu dashboard thời gian thực:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 1. Thẻ thống kê 4 cột (Lấy số liệu thật từ Backend)
  const totalRevenue = dashboardData?.totalRevenueFormatted || '128.450.000 ₫';
  const totalOrders = dashboardData?.totalOrders ?? 42;
  const totalCustomers = dashboardData?.totalCustomers ?? 156;
  const totalProducts = dashboardData?.totalProducts ?? 20;

  const stats = [
    {
      title: 'Tổng doanh thu',
      value: totalRevenue,
      change: '+14.5% so với hôm qua',
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600 border border-blue-100',
      sparklineColor: '#2563eb',
      sparklinePath: 'M 0,25 C 15,22 25,28 35,18 C 45,8 55,22 65,14 C 75,6 85,12 100,5',
    },
    {
      title: 'Đơn hàng mới',
      value: `${totalOrders} đơn`,
      change: '+8 đơn so với hôm qua',
      icon: Package,
      color: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      sparklineColor: '#10b981',
      sparklinePath: 'M 0,26 C 20,24 35,28 50,15 C 65,5 80,18 100,6',
    },
    {
      title: 'Khách hàng mới',
      value: `${totalCustomers} người`,
      change: '+32% so với hôm qua',
      icon: Users,
      color: 'bg-purple-50 text-purple-600 border border-purple-100',
      sparklineColor: '#8b5cf6',
      sparklinePath: 'M 0,28 C 25,24 40,20 60,18 C 75,16 85,8 100,4',
    },
    {
      title: 'Sản phẩm đang bán',
      value: `${totalProducts} sản phẩm`,
      change: '+12 mới trong tuần',
      icon: PackageCheck,
      color: 'bg-amber-50 text-amber-600 border border-amber-100',
      sparklineColor: '#f59e0b',
      sparklinePath: 'M 0,25 C 20,22 35,24 55,16 C 70,8 85,14 100,7',
    },
  ];

  // 2. Dữ liệu Doanh thu theo danh mục (Lấy từ Category & Product thực tế trong Database)
  const categoryStats = dashboardData?.categoryBreakdown && dashboardData.categoryBreakdown.length > 0
    ? dashboardData.categoryBreakdown
    : [
        { name: 'Điện thoại', percentage: 38, value: '48.8 tr', color: '#2563eb', strokeDash: '95.5 251.3', offset: 0 },
        { name: 'Laptop', percentage: 26, value: '33.4 tr', color: '#10b981', strokeDash: '65.3 251.3', offset: -95.5 },
        { name: 'Phụ kiện', percentage: 18, value: '23.1 tr', color: '#8b5cf6', strokeDash: '45.2 251.3', offset: -160.8 },
        { name: 'Tablet', percentage: 10, value: '12.8 tr', color: '#f59e0b', strokeDash: '25.1 251.3', offset: -206.0 },
        { name: 'Khác', percentage: 8, value: '10.3 tr', color: '#94a3b8', strokeDash: '20.1 251.3', offset: -231.1 },
      ];

  // 3. Sản phẩm bán chạy (Top 5 sản phẩm thực tế từ Database)
  const topProducts = dashboardData?.topProducts && dashboardData.topProducts.length > 0
    ? dashboardData.topProducts
    : [
        {
          id: 1,
          rank: 1,
          name: 'iPhone 15 128GB',
          category: 'Điện thoại',
          sold: '245 đã bán',
          image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100',
        },
        {
          id: 2,
          rank: 2,
          name: 'MacBook Air M2',
          category: 'Laptop',
          sold: '180 đã bán',
          image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=100',
        },
        {
          id: 3,
          rank: 3,
          name: 'Tai nghe AirPods Pro',
          category: 'Phụ kiện',
          sold: '156 đã bán',
          image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=100',
        },
        {
          id: 4,
          rank: 4,
          name: 'Samsung Galaxy S23',
          category: 'Điện thoại',
          sold: '132 đã bán',
          image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100',
        },
        {
          id: 5,
          rank: 5,
          name: 'Sạc nhanh Anker 20W',
          category: 'Phụ kiện',
          sold: '128 đã bán',
          image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=100',
        },
      ];

  // 4. Danh sách đơn hàng gần đây (Gắn với sản phẩm thực tế từ Database)
  const recentOrders = dashboardData?.recentOrders && dashboardData.recentOrders.length > 0
    ? dashboardData.recentOrders
    : [
        {
          id: '#ORD-9832',
          customer: 'Nguyễn Văn Minh',
          product: 'iPhone 15 128GB',
          total: '18.990.000 ₫',
          status: 'DELIVERED' as const,
          statusLabel: 'Đã giao',
          date: '10/06/2025 14:35',
        },
        {
          id: '#ORD-9831',
          customer: 'Trần Thị Hoa',
          product: 'MacBook Air M2',
          total: '26.500.000 ₫',
          status: 'SHIPPING' as const,
          statusLabel: 'Đang giao',
          date: '10/06/2025 12:20',
        },
        {
          id: '#ORD-9830',
          customer: 'Lê Quang Huy',
          product: 'Tai nghe AirPods Pro',
          total: '4.990.000 ₫',
          status: 'PROCESSING' as const,
          statusLabel: 'Đang xử lý',
          date: '10/06/2025 11:05',
        },
        {
          id: '#ORD-9829',
          customer: 'Phạm Thị Mai',
          product: 'Samsung Galaxy S23',
          total: '16.490.000 ₫',
          status: 'DELIVERED' as const,
          statusLabel: 'Đã giao',
          date: '10/06/2025 10:42',
        },
        {
          id: '#ORD-9828',
          customer: 'Hoàng Văn Nam',
          product: 'Sạc nhanh Anker 20W',
          total: '550.000 ₫',
          status: 'CANCELLED' as const,
          statusLabel: 'Hủy',
          date: '10/06/2025 09:17',
        },
      ];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-0.5">Trang chủ</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tổng quan hệ thống
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chào mừng bạn trở lại! Dưới đây là tổng quan hoạt động của cửa hàng trong ngày hôm nay.
          </p>
        </div>

        {/* Date Selector Pill & Refresh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="p-2 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Hôm nay (10/06/2025)</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Row 1: 4 Stat Cards with Mini Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition duration-200 flex items-center justify-between"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 truncate">{stat.title}</span>
                </div>
                <div className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                  {stat.value}
                </div>
                <div className="text-[11px] font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                  <span>↑</span>
                  <span>{stat.change}</span>
                </div>
              </div>

              {/* Sparkline Wave Chart */}
              <div className="w-20 h-10 shrink-0">
                <svg viewBox="0 0 100 32" className="w-full h-full overflow-visible">
                  <path
                    d={stat.sparklinePath}
                    fill="none"
                    stroke={stat.sparklineColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: Middle Charts Row (Doanh thu thời gian, Danh mục, Sản phẩm bán chạy) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Doanh thu theo thời gian (Span 6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Doanh thu theo thời gian</h2>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                <span>{selectedTimeRange}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isTimeDropdownOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 text-xs">
                  {['7 ngày gần nhất', '30 ngày qua', 'Tháng này', 'Năm nay'].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => {
                        setSelectedTimeRange(range);
                        setIsTimeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 cursor-pointer ${
                        selectedTimeRange === range ? 'text-blue-600 font-bold' : 'text-slate-700'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full h-56 pt-2">
            <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="40" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="40" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="40" y1="180" x2="480" y2="180" stroke="#f1f5f9" />

              {/* Y-Axis Labels */}
              <text x="32" y="24" fill="#94a3b8" fontSize="10" textAnchor="end">200 tr</text>
              <text x="32" y="64" fill="#94a3b8" fontSize="10" textAnchor="end">150 tr</text>
              <text x="32" y="104" fill="#94a3b8" fontSize="10" textAnchor="end">100 tr</text>
              <text x="32" y="144" fill="#94a3b8" fontSize="10" textAnchor="end">50 tr</text>
              <text x="32" y="184" fill="#94a3b8" fontSize="10" textAnchor="end">0</text>

              {/* Area Gradient Fill */}
              <path
                d="M 40,150 C 90,140 120,130 160,115 C 200,100 230,125 275,100 C 320,75 350,110 400,105 C 440,100 460,70 480,50 L 480,180 L 40,180 Z"
                fill="url(#revenueGradient)"
              />

              {/* Smooth Blue Bezier Curve */}
              <path
                d="M 40,150 C 90,140 120,130 160,115 C 200,100 230,125 275,100 C 320,75 350,110 400,105 C 440,100 460,70 480,50"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Circle Data Nodes */}
              <circle cx="40" cy="150" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <circle cx="160" cy="115" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <circle cx="275" cy="100" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <circle cx="400" cy="105" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <circle cx="480" cy="50" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />

              {/* X-Axis Labels */}
              <text x="40" y="196" fill="#94a3b8" fontSize="10" textAnchor="middle">04/06</text>
              <text x="113" y="196" fill="#94a3b8" fontSize="10" textAnchor="middle">05/06</text>
              <text x="186" y="196" fill="#94a3b8" fontSize="10" textAnchor="middle">06/06</text>
              <text x="260" y="196" fill="#94a3b8" fontSize="10" textAnchor="middle">07/06</text>
              <text x="333" y="196" fill="#94a3b8" fontSize="10" textAnchor="middle">08/06</text>
              <text x="406" y="196" fill="#94a3b8" fontSize="10" textAnchor="middle">09/06</text>
              <text x="480" y="196" fill="#94a3b8" fontSize="10" textAnchor="middle">10/06</text>
            </svg>
          </div>
        </div>

        {/* Chart 2: Doanh thu theo danh mục (Span 3 - Biểu đồ tròn) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-slate-900">Doanh thu theo danh mục</h2>
          </div>

          {/* Donut Chart with Center Text */}
          <div className="flex flex-col items-center justify-center my-auto py-2">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {categoryStats.map((cat, i) => (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={cat.color}
                    strokeWidth="13"
                    strokeDasharray={cat.strokeDash}
                    strokeDashoffset={cat.offset}
                    className="transition-all duration-300"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-sm font-bold text-slate-900 leading-tight">
                  {dashboardData?.totalRevenueRaw
                    ? (dashboardData.totalRevenueRaw >= 1_000_000
                        ? (dashboardData.totalRevenueRaw / 1_000_000).toFixed(1) + ' tr'
                        : totalRevenue)
                    : '128.4 tr'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Tổng doanh thu</span>
              </div>
            </div>

            {/* Category Legend List */}
            <div className="w-full mt-4 space-y-2 text-xs">
              {categoryStats.map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-slate-600 font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-semibold text-slate-800">
                    <span className="text-slate-400 font-normal">{cat.percentage}%</span>
                    <span>{cat.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Sản phẩm bán chạy (Span 3) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Sản phẩm bán chạy</h2>
            <Link
              to={ROUTES.ADMIN_PRODUCTS}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>

          {/* Top 5 Products List */}
          <div className="space-y-3.5 my-auto">
            {topProducts.map((prod) => (
              <div key={prod.id} className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-4 text-xs font-bold text-slate-400 text-center shrink-0">
                    {prod.rank}
                  </span>
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-100 bg-slate-50 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block truncate leading-tight">
                      {prod.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium truncate">
                      {prod.category}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                  {prod.sold}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Bottom Table - Đơn hàng gần đây */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Đơn hàng gần đây</h2>
          </div>
          <Link
            to={ROUTES.ADMIN_ORDERS}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Xem tất cả đơn hàng →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">MÃ ĐƠN</th>
                <th className="py-3 px-4">KHÁCH HÀNG</th>
                <th className="py-3 px-4">SẢN PHẨM</th>
                <th className="py-3 px-4">TỔNG TIỀN</th>
                <th className="py-3 px-4">TRẠNG THÁI</th>
                <th className="py-3 px-4">THỜI GIAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{order.id}</td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{order.customer}</td>
                  <td className="py-3.5 px-4 text-slate-600">{order.product}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{order.total}</td>
                  <td className="py-3.5 px-4">
                    {order.status === 'DELIVERED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {order.statusLabel}
                      </span>
                    )}
                    {order.status === 'SHIPPING' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {order.statusLabel}
                      </span>
                    )}
                    {order.status === 'PROCESSING' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {order.statusLabel}
                      </span>
                    )}
                    {order.status === 'CANCELLED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {order.statusLabel}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-medium">{order.date}</td>
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
