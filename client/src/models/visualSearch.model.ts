export interface VisualSearchAttributes {
  category?: string;
  brand?: string;
  color?: string;
  keywords?: string[];
}

export interface VisualSearchProductItem {
  id: number;
  name: string;
  brand?: string;
  categoryName?: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  matchPercent: number; // 0 - 100%
  matchReason?: string;
  bestVariant?: {
    id: number;
    sku: string;
    price: number;
    originalPrice?: number;
    stock?: number;
  };
}

export interface VisualSearchResponse {
  detectedAttributes?: VisualSearchAttributes;
  totalMatches: number;
  products: VisualSearchProductItem[];
  provider?: string;
}
