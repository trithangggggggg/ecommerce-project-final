import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../mockData';
import type {
  Category,
  FilterParams,
  Product,
  ProductListResponse,
  ProductPayload,
} from '../../models/product.model';

// Helper map backend product response to frontend Product
function mapBackendProduct(item: any): Product {
  const price = typeof item.price === 'number' ? item.price : parseFloat(item.price || '0');
  const originalPrice = item.originalPrice
    ? (typeof item.originalPrice === 'number' ? item.originalPrice : parseFloat(item.originalPrice))
    : Math.round(price * 1.15 / 100000) * 100000; // Realistic original price for discount display
  const discountPercent = originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 10;

  return {
    id: item.id,
    name: item.name,
    slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: item.description || '',
    price: price,
    originalPrice: originalPrice,
    discountPercent: discountPercent,
    imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
    images: item.images || [item.imageUrl],
    categoryId: item.categoryId || 1,
    category: {
      id: item.categoryId || 1,
      name: item.categoryName || 'Thiết bị công nghệ',
      slug: (item.categoryName || 'tech').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    },
    brand: item.brand || 'Chính hãng',
    stock: item.stock ?? 20,
    rating: item.rating || 5.0,
    reviewCount: item.reviewCount || 48,
    isFeatured: item.isFeatured ?? true,
    isNew: item.isNew ?? true,
    createdAt: item.createdAt,
  };
}

export const productService = {
  /**
   * Lấy danh sách sản phẩm từ Backend (có phân trang & lọc)
   */
  async getProducts(params: FilterParams = {}): Promise<ProductListResponse> {
    try {
      const page = params.page ? params.page - 1 : 0;
      const size = params.limit || 12;

      let url: string = ENDPOINTS.PRODUCTS;
      const queryParams: any = { page, size };

      if (params.keyword) {
        url = `${ENDPOINTS.PRODUCTS}/search`;
        queryParams.keyword = params.keyword;
      }

      if (params.categoryId) {
        url = `${ENDPOINTS.PRODUCTS}/category/${params.categoryId}`;
      }

      const res = await axiosClient.get(url, { params: queryParams });
      const rawData = res.data?.data;

      if (rawData && Array.isArray(rawData.content)) {
        const products = rawData.content.map(mapBackendProduct);
        return {
          data: products,
          total: rawData.totalElements || products.length,
          page: (rawData.pageNumber || 0) + 1,
          limit: rawData.pageSize || size,
          totalPages: rawData.totalPages || 1,
        };
      } else if (Array.isArray(rawData)) {
        const products = rawData.map(mapBackendProduct);
        return {
          data: products,
          total: products.length,
          page: 1,
          limit: size,
          totalPages: 1,
        };
      }
    } catch (err) {
      console.warn('Backend products API call failed, falling back to mock data:', err);
    }

    // Fallback Mock
    let filtered = [...MOCK_PRODUCTS];
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(kw));
    }
    if (params.categoryId) {
      filtered = filtered.filter((p) => p.categoryId === params.categoryId);
    }
    const limit = params.limit || 12;
    const page = params.page || 1;
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    };
  },

  /**
   * Lấy chi tiết sản phẩm theo ID
   */
  async getProductById(id: number | string): Promise<Product> {
    try {
      const res = await axiosClient.get(`${ENDPOINTS.PRODUCTS}/${id}`);
      const raw = res.data?.data;
      if (raw) {
        return mapBackendProduct(raw);
      }
    } catch (err) {
      console.warn(`Get product ${id} failed, using mock:`, err);
    }

    const mockItem = MOCK_PRODUCTS.find((p) => p.id === Number(id));
    if (mockItem) return mockItem;
    return MOCK_PRODUCTS[0];
  },

  /**
   * Lấy danh sách danh mục
   */
  async getCategories(): Promise<Category[]> {
    try {
      const res = await axiosClient.get(ENDPOINTS.CATEGORIES);
      const raw = res.data?.data;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: c.description,
          imageUrl: c.imageUrl,
        }));
      }
    } catch (err) {
      console.warn('Get categories failed, using mock:', err);
    }
    return MOCK_CATEGORIES;
  },

  /**
   * Lấy sản phẩm nổi bật
   */
  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    const res = await this.getProducts({ limit });
    return res.data.slice(0, limit);
  },

  /**
   * Lấy sản phẩm mới nhất
   */
  async getNewProducts(limit = 8): Promise<Product[]> {
    const res = await this.getProducts({ limit, sortBy: 'newest' });
    return res.data.slice(0, limit);
  },

  /**
   * Lấy sản phẩm liên quan theo danh mục
   */
  async getRelatedProducts(categoryId: number, excludeId?: number, limit = 4): Promise<Product[]> {
    const res = await this.getProducts({ categoryId, limit: limit + 1 });
    return res.data
      .filter((p) => (excludeId ? p.id !== excludeId : true))
      .slice(0, limit);
  },

  /**
   * [Admin] Thêm sản phẩm mới (POST /api/admin/products)
   */
  async createProduct(payload: ProductPayload): Promise<Product> {
    const res = await axiosClient.post(ENDPOINTS.ADMIN_PRODUCTS, payload);
    const raw = res.data?.data || res.data;
    return mapBackendProduct(raw);
  },

  /**
   * [Admin] Cập nhật thông tin sản phẩm (PUT /api/admin/products/{id})
   */
  async updateProduct(id: number | string, payload: ProductPayload): Promise<Product> {
    const res = await axiosClient.put(`${ENDPOINTS.ADMIN_PRODUCTS}/${id}`, payload);
    const raw = res.data?.data || res.data;
    return mapBackendProduct(raw);
  },

  /**
   * [Admin] Xóa sản phẩm (DELETE /api/admin/products/{id})
   */
  async deleteProduct(id: number | string): Promise<void> {
    await axiosClient.delete(`${ENDPOINTS.ADMIN_PRODUCTS}/${id}`);
  },
};

export const categoryService = {
  getCategories: () => productService.getCategories(),
};

