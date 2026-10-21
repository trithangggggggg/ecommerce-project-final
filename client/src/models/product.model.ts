// ============================================================
// Product & Category TypeScript Models
// ============================================================

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  imageUrl: string;
  images?: string[];
  categoryId: number;
  category?: Category;
  brand?: string;
  stock: number;
  rating?: number;
  reviewCount?: number;
  specifications?: Record<string, string>;
  isFeatured?: boolean;
  isNew?: boolean;
  isFlashSale?: boolean;
  createdAt?: string;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterParams {
  keyword?: string;
  categoryId?: number;
  categorySlug?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'name_asc' | 'newest';
  page?: number;
  limit?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
