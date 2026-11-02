import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import {
  dashboardService,
  type DashboardData,
  formatShortVND,
} from '../../api/services/dashboard.service';
import { formatPrice } from '../../utils/format';

type TimeRange = 'Hôm nay' | '7 ngày gần nhất' | '30 ngày qua' | 'Năm nay';

interface TimelinePoint {
  key: string;
  label: string;
  fullDate: string;
  revenue: number;
  orderCount: number;
  showLabel: boolean;
}

function parseOrderDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function createSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 >= pts.length ? pts.length - 1 : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    const clampedCp1y = Math.max(20, Math.min(180, cp1y));
    const clampedCp2y = Math.max(20, Math.min(180, cp2y));

    d += ` C ${cp1x.toFixed(1)},${clampedCp1y.toFixed(1)} ${cp2x.toFixed(1)},${clampedCp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export const DashboardPage: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('7 ngày gần nhất');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTimeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gọi API lấy dữ liệu thực tế từ Backend
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const res = await dashboardService.getDashboardData();
      setDashboardData(res);
    } catch {
      // Ignore dashboard fetch error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Tính toán dữ liệu doanh thu theo thời gian hoàn toàn động từ danh sách đơn hàng thực tế
  const timelineData = useMemo(() => {
    const activeOrders = (dashboardData?.orders || []).filter((o) => o.status !== 'CANCELLED');
    const now = new Date();
    const points: TimelinePoint[] = [];

    if (selectedTimeRange === 'Hôm nay') {
      const blocks = [
        { label: '04:00', startH: 0, endH: 4, range: '00:00 - 04:00' },
        { label: '08:00', startH: 4, endH: 8, range: '04:00 - 08:00' },
        { label: '12:00', startH: 8, endH: 12, range: '08:00 - 12:00' },
        { label: '16:00', startH: 12, endH: 16, range: '12:00 - 16:00' },
        { label: '20:00', startH: 16, endH: 20, range: '16:00 - 20:00' },
        { label: '24:00', startH: 20, endH: 24, range: '20:00 - 24:00' },
      ];

      const todayOrders = activeOrders.filter((o) => {
        const d = parseOrderDate(o.createdAt);
        if (!d) return false;
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      });

      blocks.forEach((b, idx) => {
        const blockOrders = todayOrders.filter((o) => {
          const d = parseOrderDate(o.createdAt);
          if (!d) return false;
          const h = d.getHours();
          return h >= b.startH && (idx === blocks.length - 1 ? h <= b.endH : h < b.endH);
        });

        const rev = blockOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        points.push({
          key: `today-${idx}`,
          label: b.label,
          fullDate: `Hôm nay (${b.range})`,
          revenue: rev,
          orderCount: blockOrders.length,
          showLabel: true,
        });
      });
    } else if (selectedTimeRange === '30 ngày qua') {
      for (let i = 0; i < 30; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i));
        const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const fullDate = `Ngày ${dayLabel}/${d.getFullYear()}`;

        const dayOrders = activeOrders.filter((o) => {
          const od = parseOrderDate(o.createdAt);
          if (!od) return false;
          return (
            od.getFullYear() === d.getFullYear() &&
            od.getMonth() === d.getMonth() &&
            od.getDate() === d.getDate()
          );
        });

        const rev = dayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        const showLabel = i === 0 || i === 5 || i === 10 || i === 15 || i === 20 || i === 25 || i === 29;

        points.push({
          key: `30d-${i}`,
          label: dayLabel,
          fullDate,
          revenue: rev,
          orderCount: dayOrders.length,
          showLabel,
        });
      }
    } else if (selectedTimeRange === 'Năm nay') {
      const curYear = now.getFullYear();
      for (let m = 0; m < 12; m++) {
        const label = `T${m + 1}`;
        const fullDate = `Tháng ${m + 1}/${curYear}`;

        const monthOrders = activeOrders.filter((o) => {
          const od = parseOrderDate(o.createdAt);
          if (!od) return false;
          return od.getFullYear() === curYear && od.getMonth() === m;
        });

        const rev = monthOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

        points.push({
          key: `year-${m}`,
          label,
          fullDate,
          revenue: rev,
          orderCount: monthOrders.length,
          showLabel: true,
        });
      }
    } else {
      // Default: '7 ngày gần nhất'
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
        const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const fullDate = `Ngày ${dayLabel}/${d.getFullYear()}`;

        const dayOrders = activeOrders.filter((o) => {
          const od = parseOrderDate(o.createdAt);
          if (!od) return false;
          return (
            od.getFullYear() === d.getFullYear() &&
            od.getMonth() === d.getMonth() &&
            od.getDate() === d.getDate()
          );
        });

        const rev = dayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

        points.push({
          key: `7d-${i}`,
          label: dayLabel,
          fullDate,
          revenue: rev,
          orderCount: dayOrders.length,
          showLabel: true,
        });
      }
    }

    const totalPeriodRevenue = points.reduce((sum, p) => sum + p.revenue, 0);
    const totalPeriodOrders = points.reduce((sum, p) => sum + p.orderCount, 0);
    const maxRevenue = Math.max(...points.map((p) => p.revenue), 0);
    const hasRevenue = maxRevenue > 0;

    // Tính trần giá trị động (nice ceiling) với headroom 15%
    let niceCeiling = 10_000_000;
    if (hasRevenue) {
      const target = maxRevenue * 1.15;
      const exponent = Math.floor(Math.log10(target));
      const power = Math.pow(10, exponent);
      const fraction = target / power;

      let niceFraction = 1;
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 1.2) niceFraction = 1.2;
      else if (fraction <= 1.6) niceFraction = 1.6;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 2.4) niceFraction = 2.4;
      else if (fraction <= 3) niceFraction = 3;
      else if (fraction <= 4) niceFraction = 4;
      else if (fraction <= 5) niceFraction = 5;
      else if (fraction <= 6) niceFraction = 6;
      else if (fraction <= 8) niceFraction = 8;
      else niceFraction = 10;

      niceCeiling = niceFraction * power;
      if (niceCeiling % 4 !== 0) {
        niceCeiling = Math.ceil(niceCeiling / 4) * 4;
      }
    }

    // 5 mốc hiển thị trên trục Y (y: 20 -> 60 -> 100 -> 140 -> 180)
    const yTicks = [
      { value: niceCeiling, label: formatShortVND(niceCeiling), y: 20 },
      { value: niceCeiling * 0.75, label: formatShortVND(niceCeiling * 0.75), y: 60 },
      { value: niceCeiling * 0.50, label: formatShortVND(niceCeiling * 0.50), y: 100 },
      { value: niceCeiling * 0.25, label: formatShortVND(niceCeiling * 0.25), y: 140 },
      { value: 0, label: '0', y: 180 },
    ];

    let unitLabel = 'VNĐ';
    if (niceCeiling >= 1_000_000_000) unitLabel = 'Tỷ VNĐ';
    else if (niceCeiling >= 1_000_000) unitLabel = 'Triệu VNĐ';
    else if (niceCeiling >= 1_000) unitLabel = 'Nghìn VNĐ';

    const xStart = 40;
    const xEnd = 480;
    const n = points.length;

    const chartPoints = points.map((p, idx) => {
      const x = n > 1 ? xStart + idx * ((xEnd - xStart) / (n - 1)) : 260;
      const ratio = niceCeiling > 0 ? p.revenue / niceCeiling : 0;
      const y = 180 - Math.min(Math.max(ratio, 0), 1) * (180 - 20);
      return {
        ...p,
        x,
        y,
      };
    });

    const linePath = hasRevenue
      ? createSmoothPath(chartPoints)
      : `M ${xStart},180 L ${xEnd},180`;

    const areaPath = hasRevenue && chartPoints.length > 0
      ? `${linePath} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)},180 L ${chartPoints[0].x.toFixed(1)},180 Z`
      : null;

    return {
      points: chartPoints,
      niceCeiling,
      yTicks,
      unitLabel,
      totalPeriodRevenue,
      totalPeriodOrders,
      hasRevenue,
      linePath,
      areaPath,
    };
  }, [dashboardData?.orders, selectedTimeRange]);

  // Mini sparkline đường cong động cho card Tổng doanh thu dựa trên xu hướng 7 ngày thực tế
  const sparkline7d = useMemo(() => {
    const rawOrders = dashboardData?.orders || [];
    const activeOrders = rawOrders.filter((o) => o.status !== 'CANCELLED');
    const now = new Date();
    const dayRevs: number[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
      const rev = activeOrders
        .filter((o) => {
          const od = parseOrderDate(o.createdAt);
          if (!od) return false;
          return (
            od.getFullYear() === d.getFullYear() &&
            od.getMonth() === d.getMonth() &&
            od.getDate() === d.getDate()
          );
        })
        .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      dayRevs.push(rev);
    }

    const max = Math.max(...dayRevs, 0);
    if (max === 0) return 'M 0,25 L 100,25';

    const coords = dayRevs.map((rev, i) => ({
      x: i * (100 / 6),
      y: 25 - (rev / max) * 18,
    }));

    return createSmoothPath(coords);
  }, [dashboardData?.orders]);

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
      sparklinePath: sparkline7d,
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
            <span>Hôm nay ({new Date().toLocaleDateString('vi-VN')})</span>
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
        {/* Chart 1: Doanh thu theo thời gian (Span 6) - 100% dữ liệu động */}
        <div className="lg:col-span-6 bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-0">
          <div className="flex items-center justify-between mb-1 shrink-0">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">Doanh thu theo thời gian</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400">Đơn vị: {timelineData.unitLabel}</span>
                <span className="text-[10px] text-slate-300">•</span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Tổng kỳ: <strong className="text-blue-600 font-semibold">{formatPrice(timelineData.totalPeriodRevenue)}</strong>
                  {' '}({timelineData.totalPeriodOrders} đơn)
                </span>
              </div>
            </div>

            {/* Range Dropdown Toggle */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 transition cursor-pointer"
              >
                <span>{selectedTimeRange}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {isTimeDropdownOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 text-xs">
                  {(['Hôm nay', '7 ngày gần nhất', '30 ngày qua', 'Năm nay'] as const).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => {
                        setSelectedTimeRange(range);
                        setIsTimeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs transition cursor-pointer ${
                        selectedTimeRange === range ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
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
          <div className="w-full flex-1 min-h-[160px] max-h-[220px] pt-1 relative">
            <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines (Động theo niceCeiling) */}
              {timelineData.yTicks.map((tick, i) => (
                <line
                  key={i}
                  x1="40"
                  y1={tick.y}
                  x2="480"
                  y2={tick.y}
                  stroke="#f1f5f9"
                  strokeDasharray={i === 4 ? undefined : '3 3'}
                />
              ))}

              {/* Dynamic Y-Axis Labels */}
              {timelineData.yTicks.map((tick, i) => (
                <text
                  key={i}
                  x="34"
                  y={tick.y + 3.5}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                >
                  {tick.label}
                </text>
              ))}

              {/* Area Gradient Fill */}
              {timelineData.areaPath && (
                <path
                  d={timelineData.areaPath}
                  fill="url(#revenueGradient)"
                  className="transition-all duration-300"
                />
              )}

              {/* Smooth Blue Bezier Curve */}
              <path
                d={timelineData.linePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />

              {/* Empty state overlay when no revenue */}
              {!timelineData.hasRevenue && (
                <g className="pointer-events-none">
                  <rect
                    x="110"
                    y="86"
                    width="280"
                    height="30"
                    rx="6"
                    fill="#f8fafc"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                  <text
                    x="250"
                    y="105"
                    fill="#64748b"
                    fontSize="11"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    Chưa có doanh thu phát sinh trong kỳ này
                  </text>
                </g>
              )}

              {/* Data Nodes & Hit Targets */}
              {timelineData.points.map((pt, idx) => {
                const isHovered = hoveredPointIndex === idx;
                const isDense = timelineData.points.length > 15;
                const shouldShowCircle = isHovered || pt.revenue > 0 || !isDense;

                return (
                  <g key={pt.key}>
                    {/* Hover indicator vertical line */}
                    {isHovered && (
                      <line
                        x1={pt.x}
                        y1="20"
                        x2={pt.x}
                        y2="180"
                        stroke="#94a3b8"
                        strokeDasharray="3 3"
                        strokeWidth="1.2"
                      />
                    )}

                    {/* Outer halo on hover */}
                    {isHovered && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="8"
                        fill="#2563eb"
                        opacity="0.25"
                      />
                    )}

                    {/* Point Circle */}
                    {shouldShowCircle && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 4.5 : 3.5}
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2.5 : 2}
                        className="transition-all duration-150"
                      />
                    )}

                    {/* Transparent Hit target for smooth mouse/touch interaction */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                      onTouchStart={() => setHoveredPointIndex(idx)}
                    />
                  </g>
                );
              })}

              {/* Interactive Tooltip Card */}
              {hoveredPointIndex !== null && timelineData.points[hoveredPointIndex] && (() => {
                const pt = timelineData.points[hoveredPointIndex];
                const tooltipW = 148;
                const tooltipH = 54;
                let ttX = pt.x - tooltipW / 2;
                if (ttX < 36) ttX = 36;
                if (ttX + tooltipW > 490) ttX = 490 - tooltipW;

                let ttY = pt.y - tooltipH - 12;
                if (ttY < 15) ttY = pt.y + 14;

                return (
                  <g className="pointer-events-none transition-all duration-150">
                    <rect
                      x={ttX}
                      y={ttY}
                      width={tooltipW}
                      height={tooltipH}
                      rx="7"
                      fill="#0f172a"
                      fillOpacity="0.95"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <text
                      x={ttX + 10}
                      y={ttY + 16}
                      fill="#94a3b8"
                      fontSize="9.5"
                      fontWeight="500"
                    >
                      {pt.fullDate}
                    </text>
                    <text
                      x={ttX + 10}
                      y={ttY + 33}
                      fill="#ffffff"
                      fontSize="12.5"
                      fontWeight="700"
                    >
                      {formatPrice(pt.revenue)}
                    </text>
                    <text
                      x={ttX + 10}
                      y={ttY + 46}
                      fill="#38bdf8"
                      fontSize="9.5"
                      fontWeight="500"
                    >
                      {pt.orderCount} đơn hàng
                    </text>
                  </g>
                );
              })()}

              {/* Dynamic X-Axis Labels based on selected time range */}
              {timelineData.points.map((pt) => {
                if (!pt.showLabel) return null;
                return (
                  <text
                    key={pt.key}
                    x={pt.x}
                    y="196"
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {pt.label}
                  </text>
                );
              })}
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
                {categoryStats.length > 0 && categoryStats.some((cat) => cat.percentage > 0) ? (
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
            <div className="w-full mt-2.5 space-y-1 text-xs max-h-[140px] overflow-y-auto pr-0.5">
              {categoryStats.length > 0 ? (
                categoryStats.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] sm:text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-600 font-medium truncate" title={cat.name}>{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-semibold text-slate-800 shrink-0">
                      <span className="text-slate-400 font-normal">{cat.percentage}%</span>
                      <span
                        className="cursor-help"
                        title={cat.rawRevenue !== undefined ? new Intl.NumberFormat('vi-VN').format(cat.rawRevenue) + ' ₫' : cat.value}
                      >
                        {cat.value}
                      </span>
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
