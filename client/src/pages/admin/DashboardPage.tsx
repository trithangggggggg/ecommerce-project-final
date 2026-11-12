import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Sector,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  type PieSectorShapeProps,
} from 'recharts';
import { ROUTES } from '../../constants/routes';
import {
  dashboardService,
  type DashboardData,
  type DashboardTimeRange,
  type RevenueTimelineResponse,
  type CategoryBreakdownItem,
  formatShortVND,
} from '../../api/services/dashboard.service';
import { exportService } from '../../api/services/export.service';
import { formatPrice } from '../../utils/format';

type TimeRange = 'Hôm nay' | '7 ngày gần nhất' | '30 ngày qua' | 'Tháng này' | 'Năm nay' | 'Tùy chọn';

interface TimelinePoint {
  key: string;
  label: string;
  fullDate: string;
  revenue: number;
  orderCount: number;
  showLabel: boolean;
}

interface TopProductChartEntry {
  id: string;
  rank: number;
  name: string;
  shortName: string;
  category: string;
  totalSold: number;
  totalRevenue: number;
  price: string;
}

function toBeTimeRange(range: TimeRange): DashboardTimeRange | null {
  if (range === '7 ngày gần nhất') return '7days';
  if (range === '30 ngày qua') return '30days';
  if (range === 'Tháng này') return 'month';
  if (range === 'Năm nay') return 'year';
  return null;
}

function truncateProductName(name: string, maxLen = 13): string {
  const trimmed = name.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function formatFullTimelineDate(dateStr: string, label: string, beRange: DashboardTimeRange): string {
  if (beRange === 'year') {
    const parts = dateStr.split('-');
    if (parts.length === 2) return `Tháng ${Number(parts[1])}/${parts[0]}`;
    return label;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) return `Ngày ${parts[2]}/${parts[1]}/${parts[0]}`;
  return label;
}

interface ChartTooltipProps<T> {
  active?: boolean;
  payload?: { payload?: T }[];
}

const RevenueTooltip: React.FC<ChartTooltipProps<TimelinePoint>> = ({ active, payload }) => {
  if (!active || !payload || !payload[0]?.payload) return null;
  const pt = payload[0].payload;
  return (
    <div className="rounded-lg bg-slate-900/95 border border-slate-700 px-3 py-2 shadow-lg text-white">
      <p className="text-[10px] text-slate-300 font-medium">{pt.fullDate}</p>
      <p className="text-xs font-bold text-white mt-0.5">{formatPrice(pt.revenue)}</p>
      <p className="text-[10px] text-sky-400 font-medium">{pt.orderCount} đơn hàng</p>
    </div>
  );
};

const CategoryTooltip: React.FC<ChartTooltipProps<CategoryBreakdownItem>> = ({ active, payload }) => {
  if (!active || !payload || !payload[0]?.payload) return null;
  const cat = payload[0].payload;
  return (
    <div className="rounded-lg bg-slate-900/95 border border-slate-700 px-3 py-2 shadow-lg text-white">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
        <span className="text-[11px] font-semibold">{cat.name}</span>
      </div>
      <p className="text-xs font-bold">{formatPrice(cat.rawRevenue || 0)}</p>
      <p className="text-[10px] text-sky-400">
        {cat.percentage}% &bull; {cat.soldCount || 0} đã bán
      </p>
    </div>
  );
};

const TopProductTooltip: React.FC<ChartTooltipProps<TopProductChartEntry>> = ({ active, payload }) => {
  if (!active || !payload || !payload[0]?.payload) return null;
  const prod = payload[0].payload;
  return (
    <div className="rounded-lg bg-slate-900/95 border border-slate-700 px-3 py-2 shadow-lg text-white max-w-[230px]">
      <p className="text-[10px] text-blue-300 font-semibold">
        #{prod.rank} &bull; {prod.category}
      </p>
      <p className="text-[11px] font-bold text-white leading-snug mt-0.5">{prod.name}</p>
      <div className="mt-1 pt-1 border-t border-slate-700/80 space-y-0.5 text-[10px]">
        <p className="text-emerald-400 font-semibold">Đã bán: {prod.totalSold} sản phẩm</p>
        <p className="text-slate-200 font-semibold">Doanh thu: {formatPrice(prod.totalRevenue)}</p>
        {prod.price && <p className="text-slate-400">Đơn giá: {prod.price}</p>}
      </div>
    </div>
  );
};

const renderCategorySector = (props: PieSectorShapeProps) => {
  const payload = props.payload as CategoryBreakdownItem | undefined;
  return <Sector {...props} fill={payload?.color ?? props.fill ?? '#2563eb'} />;
};

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
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('Hôm nay');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [isTopDateDropdownOpen, setIsTopDateDropdownOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [beTimeline, setBeTimeline] = useState<RevenueTimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const topDateDropdownRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const timelineRequestIdRef = useRef(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Khởi tạo ngày bắt đầu / kết thúc mặc định theo định dạng YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTimeDropdownOpen(false);
      }
      if (topDateDropdownRef.current && !topDateDropdownRef.current.contains(e.target as Node)) {
        setIsTopDateDropdownOpen(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSelectedDateLabel = () => {
    if (selectedTimeRange === 'Hôm nay') {
      return `Hôm nay (${new Date().toLocaleDateString('vi-VN')})`;
    }
    if (selectedTimeRange === '7 ngày gần nhất') {
      return '7 ngày gần nhất';
    }
    if (selectedTimeRange === '30 ngày qua') {
      return '30 ngày qua';
    }
    if (selectedTimeRange === 'Tháng này') {
      return 'Tháng này';
    }
    if (selectedTimeRange === 'Năm nay') {
      return `Năm nay (${new Date().getFullYear()})`;
    }
    if (selectedTimeRange === 'Tùy chọn' && customStartDate && customEndDate) {
      const formatPart = (dStr: string) => {
        const parts = dStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dStr;
      };
      if (customStartDate === customEndDate) {
        return `Ngày ${formatPart(customStartDate)}`;
      }
      return `${formatPart(customStartDate)} - ${formatPart(customEndDate)}`;
    }
    return 'Lọc theo ngày';
  };

  const handleApplyCustomRange = () => {
    if (!customStartDate || !customEndDate) return;
    if (customStartDate > customEndDate) {
      alert('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }
    setSelectedTimeRange('Tùy chọn');
    setIsTopDateDropdownOpen(false);
  };

  const handleExport = async (type: 'orders' | 'inventory' | 'customers' | 'revenue') => {
    try {
      setIsExporting(type);
      if (type === 'orders') {
        await exportService.exportOrders();
      } else if (type === 'inventory') {
        await exportService.exportInventory();
      } else if (type === 'customers') {
        await exportService.exportCustomers();
      } else if (type === 'revenue') {
        const rangeMap: Record<string, string> = {
          'Hôm nay': '7days',
          '7 ngày gần nhất': '7days',
          '30 ngày qua': '30days',
          'Tháng này': 'month',
          'Năm nay': 'year',
        };
        await exportService.exportRevenue({ range: rangeMap[selectedTimeRange] || 'month' });
      }
      setShowExportMenu(false);
    } catch (err) {
      console.error('Export Excel failed:', err);
    } finally {
      setIsExporting(null);
    }
  };

  const fetchTimelineByRange = useCallback(async (range: TimeRange) => {
    const beRange = toBeTimeRange(range);
    const reqId = ++timelineRequestIdRef.current;

    if (!beRange) {
      setBeTimeline(null);
      setTimelineError(null);
      setIsTimelineLoading(false);
      return;
    }

    try {
      setIsTimelineLoading(true);
      setTimelineError(null);
      const res = await dashboardService.getRevenueTimeline(beRange);
      if (timelineRequestIdRef.current === reqId) {
        setBeTimeline(res);
      }
    } catch (err) {
      if (timelineRequestIdRef.current === reqId) {
        setBeTimeline(null);
        setTimelineError(
          err instanceof Error ? err.message : 'Không thể tải biểu đồ doanh thu từ Backend BE_18'
        );
      }
    } finally {
      if (timelineRequestIdRef.current === reqId) {
        setIsTimelineLoading(false);
      }
    }
  }, []);

  // Gọi API lấy dữ liệu thực tế từ Backend (BE_18 + orders/categories)
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setApiError(null);
      const [res] = await Promise.all([
        dashboardService.getDashboardData(),
        fetchTimelineByRange(selectedTimeRange),
      ]);
      setDashboardData(res);
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ Backend'
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchTimelineByRange, selectedTimeRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Tính toán dữ liệu doanh thu theo thời gian từ API BE_18 (7 ngày, 30 ngày, tháng, năm) & khoảng tùy chọn
  const timelineData = useMemo(() => {
    const beRange = toBeTimeRange(selectedTimeRange);
    if (beRange) {
      if (beTimeline && beTimeline.range === beRange) {
        const pts: TimelinePoint[] = beTimeline.timeline.map((item, idx, arr) => ({
          key: `${beRange}-${item.date || idx}`,
          label: item.label,
          fullDate: formatFullTimelineDate(item.date, item.label, beRange),
          revenue: item.revenue,
          orderCount: item.orderCount,
          showLabel:
            arr.length <= 12
              ? true
              : idx === 0 || idx === arr.length - 1 || idx % 5 === 0,
        }));
        const maxRevenue = Math.max(...pts.map((p) => p.revenue), 0);
        const hasRevenue = maxRevenue > 0 || beTimeline.totalRevenue > 0;
        let unitLabel = 'VNĐ';
        if (maxRevenue >= 1_000_000_000) unitLabel = 'Tỷ VNĐ';
        else if (maxRevenue >= 1_000_000) unitLabel = 'Triệu VNĐ';
        else if (maxRevenue >= 1_000) unitLabel = 'Nghìn VNĐ';

        return {
          points: pts,
          unitLabel,
          totalPeriodRevenue: beTimeline.totalRevenue,
          totalPeriodOrders: beTimeline.totalOrders,
          hasRevenue,
        };
      }

      return {
        points: [] as TimelinePoint[],
        unitLabel: beRange === 'year' ? 'Tháng' : 'VNĐ',
        totalPeriodRevenue: 0,
        totalPeriodOrders: 0,
        hasRevenue: false,
      };
    }

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
    } else if (selectedTimeRange === 'Tùy chọn' && customStartDate && customEndDate) {
      const s = new Date(customStartDate + 'T00:00:00');
      const e = new Date(customEndDate + 'T23:59:59');
      const diffMs = e.getTime() - s.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
        if (d > e) break;
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
        const showLabel = diffDays <= 10 ? true : (i % Math.max(1, Math.ceil(diffDays / 6)) === 0 || i === diffDays);

        points.push({
          key: `custom-${i}`,
          label: dayLabel,
          fullDate,
          revenue: rev,
          orderCount: dayOrders.length,
          showLabel,
        });
      }
    }

    const totalPeriodRevenue = points.reduce((sum, p) => sum + p.revenue, 0);
    const totalPeriodOrders = points.reduce((sum, p) => sum + p.orderCount, 0);
    const maxRevenue = Math.max(...points.map((p) => p.revenue), 0);
    const hasRevenue = maxRevenue > 0;

    let unitLabel = 'VNĐ';
    if (maxRevenue >= 1_000_000_000) unitLabel = 'Tỷ VNĐ';
    else if (maxRevenue >= 1_000_000) unitLabel = 'Triệu VNĐ';
    else if (maxRevenue >= 1_000) unitLabel = 'Nghìn VNĐ';

    return {
      points,
      unitLabel,
      totalPeriodRevenue,
      totalPeriodOrders,
      hasRevenue,
    };
  }, [dashboardData?.orders, selectedTimeRange, customStartDate, customEndDate, beTimeline]);

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

  // Helper kiểm tra một ngày có nằm trong khoảng thời gian đang chọn không
  const isDateInSelectedRange = useCallback(
    (date: Date): boolean => {
      const now = new Date();
      if (selectedTimeRange === 'Hôm nay') {
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        );
      }
      if (selectedTimeRange === '7 ngày gần nhất') {
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        s.setHours(0, 0, 0, 0);
        return date >= s && date <= now;
      }
      if (selectedTimeRange === '30 ngày qua') {
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        s.setHours(0, 0, 0, 0);
        return date >= s && date <= now;
      }
      if (selectedTimeRange === 'Tháng này') {
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      }
      if (selectedTimeRange === 'Năm nay') {
        return date.getFullYear() === now.getFullYear();
      }
      if (selectedTimeRange === 'Tùy chọn' && customStartDate && customEndDate) {
        const s = new Date(customStartDate + 'T00:00:00');
        const e = new Date(customEndDate + 'T23:59:59');
        return date >= s && date <= e;
      }
      return true;
    },
    [selectedTimeRange, customStartDate, customEndDate]
  );

  // 1. Lọc đơn hàng phát sinh trong khoảng thời gian đã chọn
  const periodOrders = useMemo(() => {
    if (!dashboardData?.orders) return [];
    return dashboardData.orders.filter((o) => {
      const od = parseOrderDate(o.createdAt);
      if (!od) return false;
      return isDateInSelectedRange(od);
    });
  }, [dashboardData?.orders, isDateInSelectedRange]);

  // Đơn hàng hợp lệ (loại trừ CANCELLED)
  const activePeriodOrders = useMemo(() => {
    return periodOrders.filter((o) => o.status !== 'CANCELLED');
  }, [periodOrders]);

  // 2. Tổng doanh thu trong kỳ (ưu tiên đối chiếu BE_18 khi đang chọn 7 ngày / 30 ngày / Tháng / Năm)
  const periodRevenueNumber = useMemo(() => {
    const beRange = toBeTimeRange(selectedTimeRange);
    if (beRange && beTimeline && beTimeline.range === beRange) {
      return beTimeline.totalRevenue;
    }
    return activePeriodOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [activePeriodOrders, selectedTimeRange, beTimeline]);

  const periodRevenueFormatted = useMemo(() => {
    return formatPrice(periodRevenueNumber);
  }, [periodRevenueNumber]);

  // 3. Khách hàng mới trong kỳ
  const periodCustomersCount = useMemo(() => {
    const customers = dashboardData?.customers || [];
    const matched = customers.filter((u) => {
      const cd = parseOrderDate(u.createdAt);
      if (!cd) return false;
      return isDateInSelectedRange(cd);
    });
    if (matched.length > 0) return matched.length;

    // Fallback: Số lượng khách hàng duy nhất có phát sinh đơn hàng trong kỳ
    const buyerIds = new Set(
      periodOrders.map((o) => (o as any).userId || o.receiverName || o.phoneNumber).filter(Boolean)
    );
    return buyerIds.size;
  }, [dashboardData?.customers, periodOrders, isDateInSelectedRange]);

  // 4. Doanh thu theo danh mục trong kỳ
  const periodCategoryStats = useMemo(() => {
    const categories = (dashboardData?.categories && dashboardData.categories.length > 0)
      ? dashboardData.categories
      : [
          { id: 1, name: 'Điện thoại' },
          { id: 2, name: 'Laptop' },
          { id: 3, name: 'Máy tính bảng' },
          { id: 4, name: 'Thiết bị âm thanh' },
          { id: 5, name: 'Đồng hồ & Phụ kiện' },
        ];
    const products = dashboardData?.products || [];

    const productCategoryMap = new Map<number, number>();
    products.forEach((p) => {
      const catId = p.categoryId || (p.category ? p.category.id : 1);
      if (p.id) productCategoryMap.set(p.id, catId);
    });

    const categoryRevenueMap = new Map<number, number>();
    const categorySoldCountMap = new Map<number, number>();
    let totalItemsRevenue = 0;

    activePeriodOrders.forEach((order) => {
      const items = order.orderItems || (order as any).items || [];
      items.forEach((item) => {
        const itemTotal =
          Number(item.totalPrice) || Number(item.price || 0) * Number(item.quantity || 1) || 0;
        const qty = Number(item.quantity) || 1;

        let catId = (item as any).categoryId;
        if (!catId && item.productId) {
          catId = productCategoryMap.get(item.productId);
        }
        if (!catId) {
          const pName = (item.productName || '').toLowerCase();
          const matched = categories.find((c) => pName.includes(c.name.toLowerCase()));
          if (matched) catId = matched.id;
          else if (pName.includes('iphone') || pName.includes('galaxy') || pName.includes('phone') || pName.includes('điện thoại')) catId = 1;
          else if (pName.includes('macbook') || pName.includes('laptop')) catId = 2;
          else if (pName.includes('ipad') || pName.includes('tab')) catId = 3;
          else if (pName.includes('tai nghe') || pName.includes('loa') || pName.includes('jbl') || pName.includes('marshall')) catId = 4;
          else if (pName.includes('watch') || pName.includes('đồng hồ')) catId = 5;
          else catId = categories[0]?.id || 1;
        }

        categoryRevenueMap.set(catId, (categoryRevenueMap.get(catId) || 0) + itemTotal);
        categorySoldCountMap.set(catId, (categorySoldCountMap.get(catId) || 0) + qty);
        totalItemsRevenue += itemTotal;
      });
    });

    const baseRevenue = totalItemsRevenue > 0 ? totalItemsRevenue : periodRevenueNumber;

    const sortedCategories = [...categories].sort((a, b) => {
      const revA = categoryRevenueMap.get(a.id) || 0;
      const revB = categoryRevenueMap.get(b.id) || 0;
      if (revB !== revA) return revB - revA;
      return a.id - b.id;
    });

    const percentageMap = new Map<number, number>();
    let sumPercentages = 0;
    let maxRevenueCatId: number | null = null;
    let maxRevenue = -1;

    sortedCategories.forEach((cat) => {
      const rev = categoryRevenueMap.get(cat.id) || 0;
      if (baseRevenue > 0 && rev > 0) {
        const pct = Math.round((rev / baseRevenue) * 100);
        percentageMap.set(cat.id, pct);
        sumPercentages += pct;
        if (rev > maxRevenue) {
          maxRevenue = rev;
          maxRevenueCatId = cat.id;
        }
      } else {
        percentageMap.set(cat.id, 0);
      }
    });

    if (baseRevenue > 0 && maxRevenueCatId !== null && sumPercentages > 0 && sumPercentages !== 100) {
      const currentPct = percentageMap.get(maxRevenueCatId) || 0;
      percentageMap.set(maxRevenueCatId, currentPct + (100 - sumPercentages));
    }

    const CIRCUMFERENCE = 251.327; // 2 * PI * 40
    let accumulatedOffset = 0;
    const DYNAMIC_COLORS = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

    return sortedCategories.map((cat, index) => {
      const catRevenue = categoryRevenueMap.get(cat.id) || 0;
      const percentage = percentageMap.get(cat.id) || 0;
      const strokeDashLength = baseRevenue > 0 && catRevenue > 0
        ? (catRevenue / baseRevenue) * CIRCUMFERENCE
        : 0;
      const offset = accumulatedOffset;
      accumulatedOffset -= strokeDashLength;

      return {
        id: cat.id,
        name: cat.name,
        percentage,
        value: formatShortVND(catRevenue),
        rawRevenue: catRevenue,
        color: DYNAMIC_COLORS[index % DYNAMIC_COLORS.length],
        strokeDash: `${strokeDashLength.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`,
        offset,
        productCount: 0,
        soldCount: categorySoldCountMap.get(cat.id) || 0,
      };
    });
  }, [dashboardData?.categories, dashboardData?.products, activePeriodOrders, periodRevenueNumber]);

  const activeCategorySlices = useMemo(
    () => periodCategoryStats.filter((cat) => (cat.rawRevenue || 0) > 0),
    [periodCategoryStats]
  );

  // 5. Top 10 Sản phẩm bán chạy trong kỳ (tổng hợp từ orderItems theo bộ lọc & đối chiếu BE_18)
  const periodTopProducts = useMemo<TopProductChartEntry[]>(() => {
    const products = dashboardData?.products || [];
    const productById = new Map(products.map((p) => [p.id, p]));
    const beTopById = new Map(
      (dashboardData?.beTopProducts || [])
        .filter((b) => b.productId !== null)
        .map((b) => [Number(b.productId), b])
    );

    const aggMap = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        totalSold: number;
        totalRevenue: number;
        unitPrice: number;
      }
    >();

    activePeriodOrders.forEach((order) => {
      const items = order.orderItems || (order as { items?: typeof order.orderItems }).items || [];
      items.forEach((item) => {
        const pId = Number(item.productId);
        const qty = Number(item.quantity) || 1;
        const itemPrice = Number(item.price) || 0;
        const itemRevenue = Number(item.totalPrice) || itemPrice * qty || 0;
        const prod = pId ? productById.get(pId) : undefined;
        const beMeta = pId ? beTopById.get(pId) : undefined;

        const key = pId ? `id-${pId}` : `name-${item.productName || 'unknown'}`;
        const existing = aggMap.get(key);
        if (existing) {
          existing.totalSold += qty;
          existing.totalRevenue += itemRevenue;
        } else {
          aggMap.set(key, {
            id: key,
            name: prod?.name || beMeta?.productName || item.productName || 'Sản phẩm',
            category: prod?.category?.name || beMeta?.categoryName || 'Thiết bị công nghệ',
            totalSold: qty,
            totalRevenue: itemRevenue,
            unitPrice: Number(prod?.price) || Number(beMeta?.price) || itemPrice || 0,
          });
        }
      });
    });

    if (
      aggMap.size === 0 &&
      (dashboardData?.orders?.length || 0) === 0 &&
      (dashboardData?.beTopProducts?.length || 0) > 0
    ) {
      return (dashboardData?.beTopProducts || []).slice(0, 10).map((b, idx) => ({
        id: b.productId !== null ? `be-${b.productId}` : `be-idx-${idx}`,
        rank: idx + 1,
        name: b.productName,
        shortName: truncateProductName(b.productName),
        category: b.categoryName || 'Thiết bị công nghệ',
        totalSold: Number(b.totalSold) || 0,
        totalRevenue: Number(b.totalRevenue) || 0,
        price: b.price > 0 ? formatPrice(b.price) : '',
      }));
    }

    return Array.from(aggMap.values())
      .sort((a, b) => {
        if (b.totalSold !== a.totalSold) return b.totalSold - a.totalSold;
        return b.totalRevenue - a.totalRevenue;
      })
      .slice(0, 10)
      .map((item, idx) => ({
        id: item.id,
        rank: idx + 1,
        name: item.name,
        shortName: truncateProductName(item.name),
        category: item.category,
        totalSold: item.totalSold,
        totalRevenue: item.totalRevenue,
        price: item.unitPrice > 0 ? formatPrice(item.unitPrice) : '',
      }));
  }, [dashboardData?.products, dashboardData?.orders?.length, dashboardData?.beTopProducts, activePeriodOrders]);

  const totalProducts = dashboardData?.totalProducts ?? 20;

  const periodLabel = useMemo(() => {
    if (selectedTimeRange === 'Hôm nay') return 'hôm nay';
    if (selectedTimeRange === '7 ngày gần nhất') return '7 ngày qua';
    if (selectedTimeRange === '30 ngày qua') return '30 ngày qua';
    if (selectedTimeRange === 'Tháng này') return 'tháng này';
    if (selectedTimeRange === 'Năm nay') return 'năm nay';
    return 'kỳ đã chọn';
  }, [selectedTimeRange]);

  // 4 Thẻ thống kê cập nhật động 100% theo khoảng thời gian đã chọn
  const stats = [
    {
      title: 'Tổng doanh thu',
      tag: 'Doanh thu',
      value: periodRevenueFormatted,
      change: periodRevenueNumber > 0 ? `Phát sinh ${periodLabel}` : `0 ₫ ${periodLabel}`,
      accentClass: 'border-t-2 border-t-blue-600',
      tagClass: 'bg-blue-50 text-blue-700',
      sparklineColor: '#2563eb',
      sparklinePath: sparkline7d,
    },
    {
      title: 'Đơn hàng mới',
      tag: 'Đơn hàng',
      value: `${periodOrders.length} đơn`,
      change: periodOrders.length > 0 ? `+${periodOrders.length} đơn ${periodLabel}` : `0 đơn ${periodLabel}`,
      accentClass: 'border-t-2 border-t-emerald-500',
      tagClass: 'bg-emerald-50 text-emerald-700',
      sparklineColor: '#10b981',
      sparklinePath: periodOrders.length > 0 ? 'M 0,26 C 20,24 35,28 50,15 C 65,5 80,18 100,6' : 'M 0,26 L 100,26',
    },
    {
      title: 'Khách hàng mới',
      tag: 'Khách hàng',
      value: `${periodCustomersCount} người`,
      change: periodCustomersCount > 0 ? `+${periodCustomersCount} người ${periodLabel}` : `0 người ${periodLabel}`,
      accentClass: 'border-t-2 border-t-sky-500',
      tagClass: 'bg-sky-50 text-sky-700',
      sparklineColor: '#0284c7',
      sparklinePath: 'M 0,28 C 25,24 40,20 60,18 C 75,16 85,8 100,4',
    },
    {
      title: 'Sản phẩm đang bán',
      tag: 'Danh mục SP',
      value: `${totalProducts} sp`,
      change: `${totalProducts} sản phẩm sẵn có`,
      accentClass: 'border-t-2 border-t-amber-500',
      tagClass: 'bg-amber-50 text-amber-700',
      sparklineColor: '#f59e0b',
      sparklinePath: 'M 0,25 C 20,22 35,24 55,16 C 70,8 85,14 100,7',
    },
  ];

  const categoryStats = periodCategoryStats;
  const topProducts = periodTopProducts;

  return (
    <div className="h-full flex flex-col min-h-0 font-sans overflow-y-auto lg:overflow-hidden space-y-3">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
            Tổng quan hệ thống
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi doanh thu, đơn hàng, cơ cấu danh mục và sản phẩm nổi bật theo thời gian thực
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Xuất Báo Cáo Excel */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
              title="Xuất báo cáo dữ liệu Excel"
            >
              {isExporting ? 'Đang xuất Excel...' : 'Xuất Excel'}
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Chọn loại báo cáo (.xlsx)
                </div>

                {[
                  { key: 'orders' as const, label: 'Báo cáo Đơn hàng', dot: 'bg-blue-600' },
                  { key: 'inventory' as const, label: 'Báo cáo Tồn kho & SP', dot: 'bg-emerald-600' },
                  { key: 'customers' as const, label: 'Báo cáo Khách hàng', dot: 'bg-purple-600' },
                  { key: 'revenue' as const, label: 'Báo cáo Doanh thu', dot: 'bg-amber-500' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleExport(opt.key)}
                    disabled={!!isExporting}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className={`w-2 h-2 rounded-full ${opt.dot} shrink-0`} />
                      <span>{opt.label}</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {isExporting === opt.key ? 'Đang tải...' : 'Tải về'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 disabled:opacity-60 transition cursor-pointer shadow-2xs"
          >
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </button>

          {/* Bộ lọc Ngày / Tháng / Năm */}
          <div className="relative" ref={topDateDropdownRef}>
            <button
              type="button"
              onClick={() => setIsTopDateDropdownOpen((prev) => !prev)}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              title="Chọn khoảng thời gian thống kê"
            >
              <span className="text-slate-400 font-medium mr-1">Kỳ:</span>
              <span>{getSelectedDateLabel()}</span>
            </button>

            {isTopDateDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 z-50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Khoảng thời gian báo cáo</span>
                  <span className="text-[10px] text-blue-600 font-semibold">{selectedTimeRange}</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {[
                    { label: 'Hôm nay', desc: 'Dữ liệu 24h hôm nay' },
                    { label: '7 ngày gần nhất', desc: '1 tuần vừa qua' },
                    { label: '30 ngày qua', desc: '30 ngày vừa qua' },
                    { label: 'Tháng này', desc: 'Theo ngày trong tháng' },
                    { label: 'Năm nay', desc: `Năm ${new Date().getFullYear()}` },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSelectedTimeRange(preset.label as TimeRange);
                        setIsTopDateDropdownOpen(false);
                      }}
                      className={`text-left p-2 rounded-lg border text-xs transition cursor-pointer ${
                        selectedTimeRange === preset.label
                          ? 'border-blue-500 bg-blue-50/70 text-blue-700 font-semibold'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{preset.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="pt-2.5 border-t border-slate-100">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Tùy chọn ngày cụ thể:
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Từ ngày</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Đến ngày</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApplyCustomRange}
                      disabled={!customStartDate || !customEndDate}
                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Áp dụng
                    </button>
                    {selectedTimeRange === 'Tùy chọn' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTimeRange('Hôm nay');
                          setCustomStartDate(todayStr);
                          setCustomEndDate(todayStr);
                          setIsTopDateDropdownOpen(false);
                        }}
                        className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Error Alert Banner */}
      {apiError && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs shrink-0">
          <span className="truncate font-semibold">
            Lỗi kết nối dữ liệu Dashboard: {apiError}
          </span>
          <button
            type="button"
            onClick={loadDashboardData}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] shrink-0 transition cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Row 1: 4 Stat Cards (Icon-Free, Typographic Hierarchy + Sparklines) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-xl p-4 border border-slate-200/80 ${stat.accentClass} shadow-2xs hover:shadow-xs transition flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {stat.title}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${stat.tagClass}`}>
                {stat.tag}
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {stat.value}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-emerald-600 truncate">
                {stat.change}
              </span>

              <div className="w-16 h-4 shrink-0">
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
        ))}
      </div>

      {/* Row 2: Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Chart 1: AreaChart - Doanh thu theo thời gian (Span 6) */}
        <div className="lg:col-span-6 bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[240px] lg:min-h-0 overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-2 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Doanh thu theo thời gian</h2>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                <span>Đơn vị: {timelineData.unitLabel}</span>
                <span className="text-slate-300">|</span>
                <span className="font-medium">
                  Tổng kỳ:{' '}
                  <strong className="text-blue-600 font-bold tabular-nums">
                    {formatPrice(timelineData.totalPeriodRevenue)}
                  </strong>{' '}
                  ({timelineData.totalPeriodOrders} đơn)
                </span>
              </div>
            </div>

            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition cursor-pointer"
              >
                {selectedTimeRange}
              </button>

              {isTimeDropdownOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 text-xs">
                  {(selectedTimeRange === 'Tùy chọn'
                    ? (['Hôm nay', '7 ngày gần nhất', '30 ngày qua', 'Tháng này', 'Năm nay', 'Tùy chọn'] as const)
                    : (['Hôm nay', '7 ngày gần nhất', '30 ngày qua', 'Tháng này', 'Năm nay'] as const)
                  ).map((range) => (
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

          <div className="w-full flex-1 min-h-[200px] pt-1 relative min-w-0">
            {timelineError ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-2">
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
                  Lỗi biểu đồ
                </span>
                <p className="text-xs text-rose-600 font-medium">{timelineError}</p>
                <button
                  type="button"
                  onClick={() => fetchTimelineByRange(selectedTimeRange)}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold transition cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <AreaChart data={timelineData.points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={16}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(v: unknown) => formatShortVND(Number(v))}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      width={54}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fill="url(#revenueAreaGradient)"
                      activeDot={{ r: 5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                      isAnimationActive={true}
                      animationDuration={450}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {!isTimelineLoading && !isLoading && !timelineData.hasRevenue && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-lg bg-slate-50/95 border border-slate-200 text-[11px] font-medium text-slate-500 shadow-2xs">
                      Chưa có doanh thu phát sinh trong kỳ này
                    </span>
                  </div>
                )}

                {isTimelineLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[1px] rounded-lg z-10">
                    <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold">
                      Đang tải dữ liệu...
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chart 2: DonutChart - Cơ cấu doanh thu theo danh mục (Span 3) */}
        <div className="lg:col-span-3 bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[240px] lg:min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h2 className="text-sm font-bold text-slate-900">Doanh thu theo danh mục</h2>
            {isLoading && dashboardData && (
              <span className="text-[10px] font-semibold text-blue-600">Đang cập nhật</span>
            )}
          </div>

          {apiError && !dashboardData ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-3 gap-2">
              <p className="text-xs text-rose-600 font-medium">Không thể tải dữ liệu danh mục</p>
              <button
                type="button"
                onClick={loadDashboardData}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold transition cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center my-auto py-1">
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                {isLoading && !dashboardData ? (
                  <span className="text-xs font-medium text-slate-400">Đang tải...</span>
                ) : activeCategorySlices.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={128}>
                    <PieChart>
                      <Pie
                        data={activeCategorySlices}
                        dataKey="rawRevenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="64%"
                        outerRadius="92%"
                        paddingAngle={activeCategorySlices.length > 1 ? 2 : 0}
                        stroke="none"
                        shape={renderCategorySector}
                        isAnimationActive={true}
                        animationDuration={450}
                      />
                      <Tooltip content={<CategoryTooltip />} wrapperStyle={{ zIndex: 30 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-28 h-28 rounded-full border-[10px] border-slate-100" />
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight max-w-full truncate tabular-nums">
                    {periodRevenueFormatted}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">Doanh thu</span>
                </div>
              </div>

              <div className="w-full mt-3 space-y-1.5 text-xs max-h-[150px] overflow-y-auto pr-0.5">
                {categoryStats.length > 0 ? (
                  categoryStats.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between text-[11px] gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-600 font-medium truncate" title={cat.name}>{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold text-slate-800 shrink-0 tabular-nums">
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
          )}
        </div>

        {/* Chart 3: BarChart - Top 10 sản phẩm bán chạy (Span 3) */}
        <div className="lg:col-span-3 bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[240px] lg:min-h-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
            <h2 className="text-sm font-bold text-slate-900">Top 10 bán chạy</h2>
            <Link
              to={ROUTES.ADMIN_PRODUCTS}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="flex-1 w-full min-h-[210px] lg:min-h-0 relative min-w-0">
            {isLoading && !dashboardData ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                <span className="text-xs font-medium">Đang tải Top sản phẩm...</span>
              </div>
            ) : apiError && !dashboardData ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-3 gap-2">
                <p className="text-xs text-rose-600 font-medium">Không thể tải Top sản phẩm</p>
                <button
                  type="button"
                  onClick={loadDashboardData}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold transition cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={210}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 2, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={92}
                    tick={{ fontSize: 10, fill: '#334155', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Tooltip content={<TopProductTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar
                    dataKey="totalSold"
                    fill="#2563eb"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={14}
                    isAnimationActive={true}
                    animationDuration={450}
                  >
                    <LabelList
                      dataKey="totalSold"
                      position="right"
                      style={{ fontSize: '10px', fill: '#475569', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-400 text-center py-6">
                  Chưa có sản phẩm nào phát sinh lượt bán
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
