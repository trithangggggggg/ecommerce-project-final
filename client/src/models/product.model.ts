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
  images?: (ProductImage | string)[];
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
  status?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  isFlashSale?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  brand?: string;
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

export interface OptionPayload {
  id?: number;
  name: string;
  values: string[];
}

export interface VariantPayload {
  id?: number;
  sku: string;
  optionValues?: Record<string, string>;
  price: number;
  originalPrice?: number | null;
  stock: number;
  imageUrl?: string | null;
  status?: boolean;
}

export interface SpecPayload {
  id?: number;
  group?: string;
  key: string;
  value: string;
}

export interface ImagePayload {
  id?: number;
  variantId?: number | null;
  url: string;
  position?: number;
}

export interface ProductPayload {
  id?: number;
  name: string;
  brand?: string;
  description?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
  categoryId: number;
  status?: boolean;
  options?: OptionPayload[];
  variants?: VariantPayload[];
  specs?: SpecPayload[];
  images?: ImagePayload[];
}
