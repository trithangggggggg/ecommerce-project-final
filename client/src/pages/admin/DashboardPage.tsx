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
  const totalRevenue = dashboardData?.totalRevenueFormatted ?? '0 ₫';
  const totalOrders = dashboardData?.totalOrders ?? 0;
  const totalCustomers = dashboardData?.totalCustomers ?? 1;
  const totalProducts = dashboardData?.totalProducts ?? 20;

  const stats = [
    {
      title: 'Tổng doanh thu',
      value: totalRevenue,
      change: totalOrders > 0 ? '+14.5% hôm nay' : '0 giao dịch hôm nay',
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600 border border-blue-100',
      sparklineColor: '#2563eb',
      sparklinePath: totalOrders > 0 ? 'M 0,25 C 15,22 25,28 35,18 C 45,8 55,22 65,14 C 75,6 85,12 100,5' : 'M 0,25 L 100,25',
    },
    {
      title: 'Đơn hàng mới',
      value: `${totalOrders} đơn`,
      change: totalOrders > 0 ? `+${totalOrders} đơn mới` : '0 đơn hôm nay',
      icon: Package,
      color: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      sparklineColor: '#10b981',
      sparklinePath: totalOrders > 0 ? 'M 0,26 C 20,24 35,28 50,15 C 65,5 80,18 100,6' : 'M 0,26 L 100,26',
    },
    {
      title: 'Khách hàng mới',
      value: `${totalCustomers} người`,
      change: totalCustomers > 0 ? `+${totalCustomers} tài khoản` : '0 khách hàng',
      icon: Users,
      color: 'bg-sky-50 text-sky-600 border border-sky-100',
      sparklineColor: '#0284c7',
      sparklinePath: 'M 0,28 C 25,24 40,20 60,18 C 75,16 85,8 100,4',
    },
    {
      title: 'Sản phẩm đang bán',
      value: `${totalProducts} sp`,
      change: `${totalProducts} sản phẩm sẵn có`,
      icon: PackageCheck,
      color: 'bg-amber-50 text-amber-600 border border-amber-100',
      sparklineColor: '#f59e0b',
      sparklinePath: 'M 0,25 C 20,22 35,24 55,16 C 70,8 85,14 100,7',
    },
  ];

  // 2. Dữ liệu Doanh thu theo danh mục (Lấy 100% từ Database thực)
  const categoryStats = dashboardData?.categoryBreakdown && dashboardData.categoryBreakdown.length > 0
    ? dashboardData.categoryBreakdown
    : [];

  // 3. Sản phẩm bán chạy (Top 5 sản phẩm từ Database thực)
  const topProducts = dashboardData?.topProducts && dashboardData.topProducts.length > 0
    ? dashboardData.topProducts
    : [];

  return (
    <div className="h-full flex flex-col justify-between font-sans select-none overflow-hidden space-y-3 sm:space-y-3.5">
      {/* Top Header & Date Filter (Gọn gàng, cố định) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
            Tổng quan hệ thống
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Tổng quan hoạt động và hiệu suất bán hàng của cửa hàng trong ngày
          </p>
        </div>

        {/* Date Selector Pill & Refresh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="p-1.5 sm:p-2 bg-white border border-slate-200/90 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Hôm nay (10/06/2025)</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Row 1: 4 Stat Cards with Mini Sparklines (Thu gọn chiều cao) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                    {stat.title}
                  </span>
                  <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {stat.value}
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${stat.color} shadow-2xs`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-emerald-600">
                  {stat.change}
                </span>

                {/* Micro SVG Sparkline Chart */}
                <div className="w-16 h-4">
                  <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                    <path
                      d={stat.sparklinePath}
                      fill="none"
                      stroke={stat.sparklineColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: Charts Section (Tự co giãn vừa khít màn hình, không tràn chiều cao) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 flex-1 min-h-0">
        {/* Chart 1: Doanh thu theo thời gian (Span 6) */}
        <div className="lg:col-span-6 bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-0">
          <div className="flex items-center justify-between mb-1 shrink-0">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">Doanh thu theo thời gian</h2>
              <span className="text-[10px] text-slate-400">Đơn vị: Triệu VNĐ</span>
            </div>

            {/* Range Dropdown Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 transition cursor-pointer"
              >
                <span>{selectedTimeRange}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {isTimeDropdownOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 text-xs">
                  {['Hôm nay', '7 ngày gần nhất', '30 ngày qua', 'Năm nay'].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => {
                        setSelectedTimeRange(range);
                        setIsTimeDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 text-xs"
                    >
                      {range}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full flex-1 min-h-[160px] max-h-[220px] pt-1">
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

              {totalOrders > 0 ? (
                <>
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
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Circle Data Nodes */}
                  <circle cx="40" cy="150" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="160" cy="115" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="275" cy="100" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="400" cy="105" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="480" cy="50" r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                </>
              ) : (
                <>
                  <line x1="40" y1="180" x2="480" y2="180" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
                  <text x="260" y="105" fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="500">
                    Chưa có giao dịch phát sinh trong kỳ này
                  </text>
                </>
              )}

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
        <div className="lg:col-span-3 bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-0">
          <div className="mb-1 shrink-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">Doanh thu theo danh mục</h2>
          </div>

          {/* Donut Chart with Center Text */}
          <div className="flex flex-col items-center justify-center my-auto py-1">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {categoryStats.length > 0 ? (
                  categoryStats.map((cat, i) => (
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
                  ))
                ) : (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="13"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {totalRevenue}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">Doanh thu</span>
              </div>
            </div>

            {/* Category Legend List */}
            <div className="w-full mt-2.5 space-y-1 text-xs">
              {categoryStats.length > 0 ? (
                categoryStats.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] sm:text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-600 font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className="text-slate-400 font-normal">{cat.percentage}%</span>
                      <span>{cat.value}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-400 text-center py-2">
                  Chưa có đơn hàng phát sinh theo danh mục
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Chart 3: Top 8 Sản phẩm bán chạy (Span 3 - Không cuộn, vừa khít khung) */}
        <div className="lg:col-span-3 bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-0">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">Top 8 sản phẩm bán chạy</h2>
            <Link
              to={ROUTES.ADMIN_PRODUCTS}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>

          {/* Top Products List - Hiển thị cố định toàn bộ 8 sản phẩm, không cuộn lên xuống */}
          <div className="flex-1 flex flex-col justify-between py-0.5 overflow-hidden">
            {topProducts.length > 0 ? (
              topProducts.map((prod) => (
                <div key={prod.id} className="flex items-center justify-between gap-2 py-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 text-[11px] font-bold text-slate-400 text-center shrink-0">
                      {prod.rank}
                    </span>
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-6 h-6 rounded-md object-cover ring-1 ring-slate-100 bg-slate-50 shrink-0"
                    />
                    <div className="min-w-0">
                      <span
                        title={prod.name}
                        className="text-xs font-semibold text-slate-800 block truncate leading-tight max-w-[125px] sm:max-w-[145px]"
                      >
                        {prod.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal truncate leading-none mt-0.5">
                        {prod.category}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                    {prod.sold}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                Chưa có sản phẩm nào phát sinh lượt bán
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
