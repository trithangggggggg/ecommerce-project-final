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

export interface ProductOptionValue {
  id: number;
  value: string;
  position?: number;
}

export interface ProductOption {
  id: number;
  name: string;
  position?: number;
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  price: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
  stock: number;
  imageUrl?: string | null;
  status?: boolean;
  title?: string;
  optionValues?: Record<string, string>; // e.g. {"Dung lượng": "256GB", "Màu sắc": "Titan Đen"}
}

export interface ProductSpec {
  id: number;
  groupName?: string;
  specKey: string;
  specValue: string;
  position?: number;
}

export interface ProductImage {
  id: number;
  variantId?: number | null;
  url: string;
  position?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  minPrice?: number;
  maxPrice?: number;
  originalPrice?: number;
  discountPercent?: number;
  imageUrl: string;
  images?: string[];
  galleryImages?: ProductImage[];
  categoryId: number;
  category?: Category;
  brand?: string;
  stock: number;
  rating?: number;
  reviewCount?: number;
  specifications?: Record<string, string>;
  specs?: ProductSpec[];
  options?: ProductOption[];
  variants?: ProductVariant[];
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
  variantId?: number;
  variant?: ProductVariant;
  product: Product;
  quantity: number;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  categoryId: number;
  status?: boolean;
}
