import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { productService } from './product.service';
import { orderService } from './order.service';
import { userService } from './user.service';
import type { Product, Category } from '../../models/product.model';
import type { OrderResponse } from '../../models/order.model';

export type DashboardTimeRange = '7days' | '30days' | 'month' | 'year';

export interface RevenueTimelineItem {
  date: string;
  label: string;
  revenue: number;
  orderCount: number;
}

export interface RevenueTimelineResponse {
  range: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  timeline: RevenueTimelineItem[];
}

export interface BeTopProductItem {
  productId: number | null;
  productName: string;
  imageUrl: string | null;
  categoryName: string;
  price: number;
  totalSold: number;
  totalRevenue: number;
}

export interface KpiSummaryResponse {
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  revenueGrowthRate: number;
  currentMonthOrders: number;
  previousMonthOrders: number;
  orderGrowthRate: number;
  currentMonthNewCustomers: number;
  previousMonthNewCustomers: number;
  customerGrowthRate: number;
  completedOrders: number;
  cancelledOrders: number;
  completionRate: number;
  currentMonthAov: number;
}

export interface CategoryBreakdownItem {
  id: number;
  name: string;
  percentage: number;
  value: string;
  rawRevenue?: number;
  color: string;
  strokeDash: string;
  offset: number;
  productCount: number;
  soldCount?: number;
}

export interface TopProductItem {
  id: number;
  rank: number;
  name: string;
  category: string;
  sold: string;
  image: string;
  price: string;
}

export interface RecentOrderItem {
  id: string;
  customer: string;
  product: string;
  total: string;
  status: 'DELIVERED' | 'SHIPPING' | 'PROCESSING' | 'CANCELLED';
  statusLabel: string;
  date: string;
}

export interface DashboardData {
  totalRevenueFormatted: string;
  totalRevenueRaw: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  categoryBreakdown: CategoryBreakdownItem[];
  topProducts: TopProductItem[];
  recentOrders: RecentOrderItem[];
  orders: OrderResponse[];
  products: Product[];
  categories: Category[];
  customers: any[];
  kpiSummary?: KpiSummaryResponse | null;
  beTopProducts?: BeTopProductItem[];
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

export function formatShortVND(amount: number): string {
  if (!amount || amount <= 0) {
    return '0 ₫';
  }
  if (amount >= 1_000_000_000) {
    const b = amount / 1_000_000_000;
    return (b % 1 === 0 ? b.toFixed(0) : b.toFixed(2).replace(/\.?0+$/, '')) + ' tỷ';
  }
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(2).replace(/\.?0+$/, '')) + ' tr';
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(0) + ' k';
  }
  return formatVND(amount);
}

// Bảng màu nhận diện thương hiệu chuẩn cho từng danh mục (hỗ trợ tự động khi thêm danh mục mới)
const DYNAMIC_PALETTE = [
  '#2563eb', // 1: Điện thoại (Xanh dương)
  '#10b981', // 2: Laptop (Xanh lá)
  '#8b5cf6', // 3: Máy tính bảng (Tím)
  '#f59e0b', // 4: Thiết bị âm thanh (Cam)
  '#ec4899', // 5: Đồng hồ & Phụ kiện (Hồng)
  '#06b6d4', // 6: Màn hình / Thiết bị mới (Cyan)
  '#6366f1', // 7: Gaming Gear (Indigo)
  '#14b8a6', // 8: Thiết bị mạng (Teal)
  '#f97316', // 9: Phụ kiện thông minh (Cam đậm)
  '#84cc16', // 10: Linh kiện (Lime)
  '#a855f7', // 11: Tím nhạt
  '#0ea5e9', // 12: Sky blue
];

function getCategoryColor(catId: number, index: number): string {
  if (catId >= 1 && catId <= 5) {
    switch (catId) {
      case 1: return '#2563eb';
      case 2: return '#10b981';
      case 3: return '#8b5cf6';
      case 4: return '#f59e0b';
      case 5: return '#ec4899';
    }
  }
  const colorIndex = Math.abs(catId - 1) % DYNAMIC_PALETTE.length;
  return DYNAMIC_PALETTE[colorIndex] || DYNAMIC_PALETTE[index % DYNAMIC_PALETTE.length];
}

export const dashboardService = {
  /**
   * [BE_18] Biểu đồ doanh thu theo mốc thời gian (7days | 30days | month | year)
   */
  async getRevenueTimeline(range: DashboardTimeRange): Promise<RevenueTimelineResponse> {
    const res = await axiosClient.get(ENDPOINTS.ADMIN_DASHBOARD.REVENUE_TIMELINE, {
      params: { range },
    });
    const raw = res.data?.data ?? res.data;
    const timeline = Array.isArray(raw?.timeline) ? raw.timeline : [];
    return {
      range: raw?.range || range,
      totalRevenue: Number(raw?.totalRevenue) || 0,
      totalOrders: Number(raw?.totalOrders) || 0,
      averageOrderValue: Number(raw?.averageOrderValue) || 0,
      timeline: timeline.map((pt: any) => ({
        date: String(pt.date || ''),
        label: String(pt.label || ''),
        revenue: Number(pt.revenue) || 0,
        orderCount: Number(pt.orderCount) || 0,
      })),
    };
  },

  /**
   * [BE_18] Top sản phẩm bán chạy từ Backend
   */
  async getTopProducts(limit = 10): Promise<BeTopProductItem[]> {
    const res = await axiosClient.get(ENDPOINTS.ADMIN_DASHBOARD.TOP_PRODUCTS, {
      params: { limit },
    });
    const raw = res.data?.data ?? res.data;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, limit).map((item: any) => ({
      productId: item.productId ?? null,
      productName: item.productName || 'Sản phẩm',
      imageUrl: item.imageUrl ?? null,
      categoryName: item.categoryName || 'Khác',
      price: Number(item.price) || 0,
      totalSold: Number(item.totalSold) || 0,
      totalRevenue: Number(item.totalRevenue) || 0,
    }));
  },

  /**
   * [BE_18] Tóm tắt chỉ số KPI tháng hiện tại & tăng trưởng MoM
   */
  async getKpiSummary(): Promise<KpiSummaryResponse | null> {
    try {
      const res = await axiosClient.get(ENDPOINTS.ADMIN_DASHBOARD.KPI_SUMMARY);
      const raw = res.data?.data ?? res.data;
      if (!raw) return null;
      return {
        currentMonthRevenue: Number(raw.currentMonthRevenue) || 0,
        previousMonthRevenue: Number(raw.previousMonthRevenue) || 0,
        revenueGrowthRate: Number(raw.revenueGrowthRate) || 0,
        currentMonthOrders: Number(raw.currentMonthOrders) || 0,
        previousMonthOrders: Number(raw.previousMonthOrders) || 0,
        orderGrowthRate: Number(raw.orderGrowthRate) || 0,
        currentMonthNewCustomers: Number(raw.currentMonthNewCustomers) || 0,
        previousMonthNewCustomers: Number(raw.previousMonthNewCustomers) || 0,
        customerGrowthRate: Number(raw.customerGrowthRate) || 0,
        completedOrders: Number(raw.completedOrders) || 0,
        cancelledOrders: Number(raw.cancelledOrders) || 0,
        completionRate: Number(raw.completionRate) || 0,
        currentMonthAov: Number(raw.currentMonthAov) || 0,
      };
    } catch {
      return null;
    }
  },

  /**
   * Lấy toàn bộ số liệu thống kê Dashboard từ MySQL Database
   */
  async getDashboardData(): Promise<DashboardData> {
    // 1. Thử gọi API BE_18 chuyên biệt phía Backend
    let serverStats: any = null;
    try {
      const adminStatsRes = await axiosClient.get(ENDPOINTS.ADMIN_DASHBOARD.STATS);
      if (adminStatsRes.data?.data) {
        serverStats = adminStatsRes.data.data;
      }
    } catch {
      // Sẽ kiểm tra tổng thể ở bước tổng hợp bên dưới
    }

    // 2. Gọi song song các API BE_18 & danh mục/đơn hàng
    const [productListRes, categoriesRes, ordersRes, usersRes, kpiSummaryRes, beTopProductsRes] =
      await Promise.allSettled([
        productService.getProducts({ limit: 100 }),
        productService.getCategories(),
        orderService.getAllOrders(),
        userService.getAdminUsers(),
        this.getKpiSummary(),
        this.getTopProducts(10),
      ]);

    // Nếu cả stats và orders đều lỗi thì ném lỗi để UI hiển thị trạng thái lỗi API rõ ràng
    if (!serverStats && ordersRes.status === 'rejected') {
      throw ordersRes.reason instanceof Error
        ? ordersRes.reason
        : new Error('Không thể tải dữ liệu thống kê từ máy chủ Backend');
    }

    const products: Product[] = productListRes.status === 'fulfilled' ? (productListRes.value.data || []) : [];
    const totalProductsCount = productListRes.status === 'fulfilled' ? (productListRes.value.total || products.length) : products.length;
    const categories: Category[] = categoriesRes.status === 'fulfilled' ? (categoriesRes.value || []) : [];
    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : [];
    const customers = usersRes.status === 'fulfilled' ? usersRes.value.filter((u) => u.role !== 'ADMIN') : [];
    const kpiSummary = kpiSummaryRes.status === 'fulfilled' ? kpiSummaryRes.value : null;
    const beTopProducts = beTopProductsRes.status === 'fulfilled' ? beTopProductsRes.value : [];

    // 3. Tính toán giá trị doanh thu thực tế từ orders trong MySQL (loại trừ đơn CANCELLED)
    const activeOrders = orders.filter((o) => o.status !== 'CANCELLED');
    const realRevenue = activeOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const calculatedRevenue = serverStats?.totalRevenueRaw !== undefined
      ? Number(serverStats.totalRevenueRaw)
      : realRevenue;

    // 4. Phân bổ DOANH THU THỰC TẾ theo danh mục từ từng đơn hàng
    const categoryRevenueMap = new Map<number, number>();
    const categorySoldCountMap = new Map<number, number>();
    const productCategoryMap = new Map<number, number>();
    const productCountMap = new Map<number, number>();

    products.forEach((p) => {
      const catId = p.categoryId || (p.category ? p.category.id : 1);
      if (p.id) {
        productCategoryMap.set(p.id, catId);
      }
      productCountMap.set(catId, (productCountMap.get(catId) || 0) + 1);
    });

    let totalItemsRevenue = 0;
    activeOrders.forEach((order) => {
      const items = order.orderItems || (order as any).items || [];
      items.forEach((item) => {
        const itemTotal = Number(item.totalPrice) || (Number(item.price || 0) * Number(item.quantity || 1)) || 0;
        const qty = Number(item.quantity) || 1;

        // Xác định categoryId của món hàng
        let catId = (item as any).categoryId;
        if (!catId && item.productId) {
          catId = productCategoryMap.get(item.productId);
        }
        if (!catId) {
          const pName = (item.productName || '').toLowerCase();
          const matchedCat = categories.find((c) => pName.includes(c.name.toLowerCase()));
          if (matchedCat) {
            catId = matchedCat.id;
          } else if (pName.includes('iphone') || pName.includes('galaxy') || pName.includes('xiaomi') || pName.includes('phone') || pName.includes('điện thoại')) {
            catId = 1;
          } else if (pName.includes('macbook') || pName.includes('laptop') || pName.includes('vivobook') || pName.includes('aspire') || pName.includes('legion') || pName.includes('zenbook')) {
            catId = 2;
          } else if (pName.includes('ipad') || pName.includes('tab') || pName.includes('bảng')) {
            catId = 3;
          } else if (pName.includes('tai nghe') || pName.includes('loa') || pName.includes('airpods') || pName.includes('jbl') || pName.includes('sony') || pName.includes('marshall') || pName.includes('sound')) {
            catId = 4;
          } else if (pName.includes('watch') || pName.includes('phụ kiện') || pName.includes('đồng hồ') || pName.includes('garmin')) {
            catId = 5;
          } else {
            catId = categories[0]?.id || 1;
          }
        }

        categoryRevenueMap.set(catId, (categoryRevenueMap.get(catId) || 0) + itemTotal);
        categorySoldCountMap.set(catId, (categorySoldCountMap.get(catId) || 0) + qty);
        totalItemsRevenue += itemTotal;
      });
    });

    const baseRevenue = totalItemsRevenue > 0 ? totalItemsRevenue : calculatedRevenue;

    // Sắp xếp: Danh mục có phát sinh doanh thu xếp trước (giảm dần theo doanh thu),
    // sau đó đến các danh mục chưa phát sinh doanh thu (theo ID)
    const sortedCategories = [...categories].sort((a, b) => {
      const revA = categoryRevenueMap.get(a.id) || 0;
      const revB = categoryRevenueMap.get(b.id) || 0;
      if (revB !== revA) {
        return revB - revA;
      }
      return a.id - b.id;
    });

    // Tính tỷ lệ % doanh thu chính xác
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

    // Bù trừ làm tròn để đảm bảo tổng các % luôn là 100% khi có doanh thu
    if (baseRevenue > 0 && maxRevenueCatId !== null && sumPercentages > 0 && sumPercentages !== 100) {
      const currentPct = percentageMap.get(maxRevenueCatId) || 0;
      percentageMap.set(maxRevenueCatId, currentPct + (100 - sumPercentages));
    }

    const CIRCUMFERENCE = 251.327; // 2 * PI * 40
    let accumulatedOffset = 0;

    const categoryBreakdown: CategoryBreakdownItem[] = sortedCategories.map((cat, index) => {
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
        color: getCategoryColor(cat.id, index),
        strokeDash: `${strokeDashLength.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`,
        offset,
        productCount: productCountMap.get(cat.id) || 0,
        soldCount: categorySoldCountMap.get(cat.id) || 0,
      };
    });

    // 5. Lấy Top sản phẩm từ danh sách sản phẩm thật của Backend (sắp xếp theo lượt bán thực tế)
    const productSoldCountMap = new Map<number, number>();
    orders.forEach((o) => {
      if (o.status !== 'CANCELLED') {
        const items = o.orderItems || (o as any).items || [];
        items.forEach((item) => {
          const cur = productSoldCountMap.get(item.productId) || 0;
          productSoldCountMap.set(item.productId, cur + (item.quantity || 1));
        });
      }
    });

    const sortedProducts = [...products].sort((a, b) => {
        const soldA = productSoldCountMap.get(a.id) || 0;
        const soldB = productSoldCountMap.get(b.id) || 0;
        return soldB - soldA;
      });

      const topProducts: TopProductItem[] = sortedProducts.slice(0, 8).map((p, index) => {
        const sold = productSoldCountMap.get(p.id) || 0;
        return {
          id: p.id,
          rank: index + 1,
          name: p.name,
          category: p.category?.name || 'Thiết bị công nghệ',
          sold: `${sold} đã bán`,
          image: p.imageUrl,
          price: formatVND(p.price),
        };
      });

      // 6. Danh sách đơn hàng gần đây lấy trực tiếp từ orders trong MySQL
      const recentOrders: RecentOrderItem[] = orders.slice(0, 5).map((o) => {
        const firstItem = o.orderItems && o.orderItems.length > 0 ? o.orderItems[0].productName : 'Sản phẩm công nghệ';
        let uiStatus: 'DELIVERED' | 'SHIPPING' | 'PROCESSING' | 'CANCELLED' = 'PROCESSING';
        let statusLabel = 'Đang xử lý';

        if (o.status === 'COMPLETED') {
          uiStatus = 'DELIVERED';
          statusLabel = 'Đã giao';
        } else if (o.status === 'SHIPPING') {
          uiStatus = 'SHIPPING';
          statusLabel = 'Đang giao';
        } else if (o.status === 'CANCELLED') {
          uiStatus = 'CANCELLED';
          statusLabel = 'Đã hủy';
        }

        return {
          id: `#ORD-${o.id}`,
          customer: o.receiverName || o.customerName || 'Khách hàng',
          product: firstItem,
          total: formatVND(o.totalAmount),
          status: uiStatus,
          statusLabel: statusLabel,
          date: o.createdAt ? o.createdAt.substring(0, 16) : 'Vừa xong',
        };
      });

      return {
        totalRevenueFormatted: serverStats?.totalRevenueFormatted !== undefined ? serverStats.totalRevenueFormatted : formatVND(calculatedRevenue),
        totalRevenueRaw: serverStats?.totalRevenueRaw !== undefined ? serverStats.totalRevenueRaw : calculatedRevenue,
        totalOrders: serverStats?.totalOrders !== undefined ? serverStats.totalOrders : (orders.length > 0 ? orders.length : 0),
        totalCustomers: serverStats?.totalCustomers !== undefined ? serverStats.totalCustomers : (customers.length > 0 ? customers.length : 0),
        totalProducts: serverStats?.totalProducts !== undefined ? serverStats.totalProducts : totalProductsCount,
        categoryBreakdown,
        topProducts,
        recentOrders,
        orders,
        products,
        categories,
        customers,
        kpiSummary,
        beTopProducts,
      };
  },
};

export default dashboardService;
