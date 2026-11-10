import type { Product } from './product.model';

export interface VisualSearchResultItem {
  product: Product;
  matchScore: number; // Điểm tương đồng % (ví dụ: 96%)
  similarity: number; // Hệ số từ 0.0 -> 1.0 (ví dụ: 0.96)
  detectedLabels?: string[]; // Nhãn AI nhận diện được (ví dụ: ["Laptop", "Apple", "MacBook"])
  categoryName?: string;
  brand?: string;
}

export interface VisualSearchResponse {
  success: boolean;
  message?: string;
  queryImage?: string; // Preview URL ảnh tìm kiếm
  detectedCategory?: string; // Danh mục AI dự đoán
  labels?: string[]; // Danh sách tag nhận diện
  results: VisualSearchResultItem[];
  totalMatches: number;
  processingTimeMs?: number;
}

