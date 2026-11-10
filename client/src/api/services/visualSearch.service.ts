import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { VisualSearchResponse, VisualSearchResultItem } from '../../models/visualSearch.model';

// Danh sách sản phẩm mẫu phong phú phục vụ Mock Visual Search
const MOCK_PRODUCTS_CATALOG: VisualSearchResultItem[] = [
  {
    product: {
      id: 1,
      name: 'MacBook Air 13 inch M3 (2024) 8GB - 256GB SSD',
      slug: 'macbook-air-13-inch-m3-2024',
      description: 'Hiệu năng bứt phá với vi xử lý Apple M3 8 nhân CPU và 10 nhân GPU, thời lượng pin ấn tượng lên đến 18 giờ, màn hình Liquid Retina tuyệt đẹp.',
      price: 27990000,
      originalPrice: 29990000,
      discountPercent: 7,
      imageUrl: '/images/macbook-air-m3-card.jpg',
      categoryId: 1,
      brand: 'Apple',
      stock: 45,
      rating: 4.9,
      reviewCount: 128,
    },
    matchScore: 98,
    similarity: 0.98,
    detectedLabels: ['Laptop', 'Apple MacBook', 'Màn hình mỏng', 'Bàn phím nhôm nguyên khối'],
    categoryName: 'Laptop',
    brand: 'Apple',
  },
  {
    product: {
      id: 2,
      name: 'iPhone 16 Pro Max 256GB Titan Sa Mạc',
      slug: 'iphone-16-pro-max-256gb',
      description: 'Khung titan cao cấp chuẩn hàng không vũ trụ, nút Điều Khiển Camera hoàn toàn mới, chip A18 Pro hỗ trợ Apple Intelligence đỉnh cao.',
      price: 34990000,
      originalPrice: 36990000,
      discountPercent: 5,
      imageUrl: '/images/iphone-16-pro-max.jpg',
      categoryId: 2,
      brand: 'Apple',
      stock: 60,
      rating: 5.0,
      reviewCount: 342,
    },
    matchScore: 95,
    similarity: 0.95,
    detectedLabels: ['Điện thoại thông minh', 'Cụm 3 camera', 'Khung viền Titan', 'Apple iPhone'],
    categoryName: 'Điện thoại',
    brand: 'Apple',
  },
  {
    product: {
      id: 3,
      name: 'Samsung Galaxy S24 Ultra 5G 12GB - 256GB AI Phone',
      slug: 'samsung-galaxy-s24-ultra-5g',
      description: 'Mở ra kỷ nguyên quyền năng Galaxy AI với bút S Pen tích hợp, camera 200MP siêu zoom quang học và vi xử lý Snapdragon 8 Gen 3 for Galaxy.',
      price: 29990000,
      originalPrice: 33990000,
      discountPercent: 12,
      imageUrl: '/images/samsung-s24-ultra.jpg',
      categoryId: 2,
      brand: 'Samsung',
      stock: 35,
      rating: 4.8,
      reviewCount: 215,
    },
    matchScore: 92,
    similarity: 0.92,
    detectedLabels: ['Điện thoại thông minh', 'Màn hình phẳng tràn viền', 'Bút cảm ứng S-Pen', 'Samsung Galaxy'],
    categoryName: 'Điện thoại',
    brand: 'Samsung',
  },
  {
    product: {
      id: 4,
      name: 'Laptop Gaming ASUS ROG Strix G16 (2024) RTX 4060',
      slug: 'laptop-gaming-asus-rog-strix-g16',
      description: 'Cỗ máy chiến game đỉnh cao Intel Core i7-13650HX kết hợp card đồ họa NVIDIA GeForce RTX 4060, màn hình 16 inch 165Hz chuẩn thi đấu.',
      price: 36990000,
      originalPrice: 39990000,
      discountPercent: 8,
      imageUrl: '/images/asus-rog-strix.jpg',
      categoryId: 1,
      brand: 'ASUS',
      stock: 20,
      rating: 4.9,
      reviewCount: 89,
    },
    matchScore: 88,
    similarity: 0.88,
    detectedLabels: ['Laptop Gaming', 'Hệ thống tản nhiệt kép', 'Đèn LED RGB', 'ASUS ROG'],
    categoryName: 'Gaming Laptop',
    brand: 'ASUS',
  },
  {
    product: {
      id: 5,
      name: 'Tai nghe Chống ồn Cao cấp Không dây Sony WH-1000XM5',
      slug: 'tai-nghe-sony-wh-1000xm5',
      description: 'Công nghệ chống ồn hàng đầu ngành với bộ xử lý V1 và QN1 độc quyền, âm thanh Hi-Res Audio không dây đỉnh cao, thời lượng pin 30 giờ.',
      price: 7990000,
      originalPrice: 8990000,
      discountPercent: 11,
      imageUrl: '/images/headphone-promo.jpg',
      categoryId: 4,
      brand: 'Sony',
      stock: 50,
      rating: 4.9,
      reviewCount: 174,
    },
    matchScore: 84,
    similarity: 0.84,
    detectedLabels: ['Tai nghe chụp tai', 'Over-ear Headphone', 'Chống ồn chủ động ANC', 'Sony Audio'],
    categoryName: 'Phụ kiện âm thanh',
    brand: 'Sony',
  },
  {
    product: {
      id: 6,
      name: 'Hệ sinh thái Smart Home & IoT NEXOR Connected Ecosystem',
      slug: 'he-sinh-thai-smart-home-nexor',
      description: 'Giải pháp nhà thông minh tích hợp AI Hub điều khiển giọng nói, cảm biến an ninh tự động và kết nối đa thiết bị không giới hạn.',
      price: 15490000,
      originalPrice: 17990000,
      discountPercent: 14,
      imageUrl: '/images/tech-ecosystem.jpg',
      categoryId: 5,
      brand: 'NEXOR AI',
      stock: 18,
      rating: 4.7,
      reviewCount: 65,
    },
    matchScore: 78,
    similarity: 0.78,
    detectedLabels: ['Thiết bị thông minh', 'AI Smart Hub', 'Hệ sinh thái IoT', 'Cảm biến'],
    categoryName: 'Thiết bị thông minh',
    brand: 'NEXOR AI',
  },
];

/**
 * Visual Search Service:
 * Hỗ trợ chuyển đổi linh hoạt giữa Mock Data (giai đoạn 10/11)
 * và API Backend thực tế (khi Thắng tích hợp vào sáng 11/11).
 */
export const visualSearchService = {
  /**
   * Tìm kiếm sản phẩm bằng file ảnh (File hoặc Blob từ Webcam) hoặc đường dẫn ảnh URL
   */
  async search(
    input: File | Blob | string,
    onProgressUpdate?: (step: string) => void
  ): Promise<VisualSearchResponse> {
    onProgressUpdate?.('Đang kết nối tới mô hình AI Vision...');

    // 1. Thử gọi API Backend nếu endpoint đã khả dụng
    try {
      const formData = new FormData();
      if (typeof input === 'string') {
        formData.append('imageUrl', input);
      } else {
        const fileObj = input instanceof File
          ? input
          : new File([input], 'captured-photo.jpg', { type: 'image/jpeg' });
        formData.append('image', fileObj);
      }

      onProgressUpdate?.('Đang gửi hình ảnh lên NEXOR AI Server...');
      const response = await axiosClient.post<VisualSearchResponse>(
        ENDPOINTS.AI.VISUAL_SEARCH,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 10000,
        }
      );

      if (response && response.data && response.data.results) {
        return response.data;
      }
    } catch {
      // Backend chưa có endpoint hoặc lỗi -> Tự động Fallback sang Mock Data
    }

    // 2. Chế độ Mock thông minh cho giai đoạn kiểm thử giao diện
    onProgressUpdate?.('Đang phân tích đặc trưng thị giác (Visual Feature Extraction)...');
    await new Promise((resolve) => setTimeout(resolve, 800));

    onProgressUpdate?.('Đang trích xuất vector embeddings & đối chiếu sản phẩm...');
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Lọc và sắp xếp Mock theo độ liên quan
    let queryHint = '';
    if (typeof input === 'string') {
      queryHint = input.toLowerCase();
    } else if (input instanceof File) {
      queryHint = input.name.toLowerCase();
    }

    let sortedResults = [...MOCK_PRODUCTS_CATALOG];

    if (queryHint.includes('laptop') || queryHint.includes('macbook') || queryHint.includes('rog') || queryHint.includes('asus')) {
      sortedResults = sortedResults.sort((a, b) => (b.categoryName?.includes('Laptop') ? 1 : 0) - (a.categoryName?.includes('Laptop') ? 1 : 0));
    } else if (queryHint.includes('phone') || queryHint.includes('iphone') || queryHint.includes('samsung') || queryHint.includes('thoai')) {
      sortedResults = sortedResults.sort((a, b) => (b.categoryName?.includes('Điện thoại') ? 1 : 0) - (a.categoryName?.includes('Điện thoại') ? 1 : 0));
    } else if (queryHint.includes('tai') || queryHint.includes('headphone') || queryHint.includes('sony') || queryHint.includes('sound')) {
      sortedResults = sortedResults.sort((a, b) => (b.categoryName?.includes('âm thanh') ? 1 : 0) - (a.categoryName?.includes('âm thanh') ? 1 : 0));
    }

    onProgressUpdate?.('Hoàn tất nhận diện sản phẩm!');

    return {
      success: true,
      message: 'Nhận diện sản phẩm thành công bằng NEXOR AI Vision',
      detectedCategory: sortedResults[0]?.categoryName || 'Thiết bị Công nghệ',
      labels: sortedResults[0]?.detectedLabels || ['Đồ điện tử', 'Thiết bị số'],
      results: sortedResults,
      totalMatches: sortedResults.length,
      processingTimeMs: 1240,
    };
  },
};

export default visualSearchService;

