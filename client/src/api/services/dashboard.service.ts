import axiosClient from '../axiosClient';
import { productService } from './product.service';
import { orderService } from './order.service';
import { userService } from './user.service';
import type { Product, Category } from '../../models/product.model';

export interface CategoryBreakdownItem {
  id: number;
  name: string;
  percentage: number;
  value: string;
  color: string;
  strokeDash: string;
  offset: number;
  productCount: number;
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
}

const CATEGORY_COLORS = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#94a3b8'];

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

function formatShortVND(amount: number): string {
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(1) + ' tỷ';
  }
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1) + ' tr';
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(0) + ' k';
  }
  return formatVND(amount);
}

export const dashboardService = {
  /**
   * Lấy toàn bộ số liệu thống kê Dashboard từ MySQL Database
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      // 1. Thử gọi API chuyên biệt phía Backend nếu có
      let serverStats: any = null;
      try {
        const adminStatsRes = await axiosClient.get('/admin/dashboard/stats');
        if (adminStatsRes.data?.data) {
          serverStats = adminStatsRes.data.data;
        }
      } catch {
        // Backend chưa có endpoint riêng này, tiến hành tổng hợp từ các API có sẵn bên dưới
      }

      // 2. Gọi song song các API có sẵn: GET /api/products, GET /api/categories, GET /api/admin/orders, GET /api/admin/users
      const [productListRes, categoriesRes, ordersRes, usersRes] = await Promise.allSettled([
        productService.getProducts({ limit: 100 }),
        productService.getCategories(),
        orderService.getAllOrders(),
        userService.getAdminUsers(),
      ]);

      const products: Product[] = productListRes.status === 'fulfilled' ? (productListRes.value.data || []) : [];
      const totalProductsCount = productListRes.status === 'fulfilled' ? (productListRes.value.total || products.length) : products.length;
      const categories: Category[] = categoriesRes.status === 'fulfilled' ? (categoriesRes.value || []) : [];
      const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : [];
      const customers = usersRes.status === 'fulfilled' ? usersRes.value.filter((u) => u.role !== 'ADMIN') : [];

      // 3. Tính toán giá trị doanh thu thực tế từ orders trong MySQL
      const realRevenue = orders
        .filter((o) => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const calculatedRevenue = realRevenue;

      // 4. Phân bổ tỷ trọng theo danh mục thực tế từ Database
      const CIRCUMFERENCE = 251.327; // 2 * PI * 40
      let accumulatedOffset = 0;

      const categoryMap = new Map<number, { count: number; value: number }>();
      products.forEach((p) => {
        const catId = p.categoryId || 1;
        const current = categoryMap.get(catId) || { count: 0, value: 0 };
        current.count += 1;
        current.value += p.price * (p.stock || 5);
        categoryMap.set(catId, current);
      });

      const categoryBreakdown: CategoryBreakdownItem[] = categories.map((cat, index) => {
        const catData = categoryMap.get(cat.id) || { count: 0, value: 0 };
        const percentage = totalProductsCount > 0 ? Math.round((catData.count / totalProductsCount) * 100) : 0;
        const strokeDashLength = (percentage / 100) * CIRCUMFERENCE;
        const offset = accumulatedOffset;
        accumulatedOffset -= strokeDashLength;

        return {
          id: cat.id,
          name: cat.name,
          percentage,
          value: calculatedRevenue > 0 ? formatShortVND(catData.value) : '0 ₫',
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          strokeDash: `${strokeDashLength.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`,
          offset,
          productCount: catData.count,
        };
      });

      // 5. Lấy Top 10 sản phẩm từ danh sách sản phẩm thật của Backend (sắp xếp theo lượt bán thực tế)
      const productSoldCountMap = new Map<number, number>();
      orders.forEach((o) => {
        if (o.status !== 'CANCELLED' && o.orderItems) {
          o.orderItems.forEach((item) => {
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
      };
    } catch (error) {
      throw error;
    }
  },
};

export default dashboardService;
