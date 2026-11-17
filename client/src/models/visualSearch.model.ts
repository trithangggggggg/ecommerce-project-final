export interface VisualSearchAttributes {
  category?: string;
  brand?: string;
  productLine?: string;
  identifiedTitle?: string;
  aiDescription?: string;
  color?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  isTechProduct?: boolean;
  distinctiveFeatures?: string[];
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
