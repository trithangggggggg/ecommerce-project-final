import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { Product } from '../../models/product.model';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  recommendedProducts?: Product[];
}

export interface AiChatApiResponse {
  success: boolean;
  message: string;
  data: {
    reply: string;
    recommendedProducts?: any[];
    provider?: string;
  };
}

export const aiService = {
  /**
   * Gửi tin nhắn chat tư vấn sản phẩm tới AI backend
   */
  async chat(
    message: string,
    history: { role: string; content: string }[] = []
  ): Promise<{ reply: string; recommendedProducts: Product[]; provider: string }> {
    try {
      const response = await axiosClient.post<AiChatApiResponse>(ENDPOINTS.AI.CHAT, {
        message: message.trim(),
        history: history.slice(-6), // Lấy tối đa 6 lượt chat gần nhất
      });

      const data = response.data?.data || (response.data as any);
      const rawProducts = data.recommendedProducts || [];

      const formattedProducts: Product[] = rawProducts.map((item: any) => ({
        id: item.id,
        name: item.name,
        slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: item.description || '',
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
        originalPrice: item.originalPrice || Math.round(Number(item.price) * 1.15),
        discountPercent: item.discountPercent || 10,
        imageUrl: item.imageUrl || '/images/macbook-air-m3-card.jpg',
        categoryId: item.categoryId || 1,
        brand: item.brand || 'Chính hãng',
        stock: item.stock ?? 10,
      }));

      return {
        reply: data.reply || 'Xin lỗi bạn, trợ lý AI hiện đang bận. Bạn vui lòng thử lại sau giây lát!',
        recommendedProducts: formattedProducts,
        provider: data.provider || 'AI Assistant',
      };
    } catch (error: any) {
      console.warn('AI Chat API error, using fallback client answer:', error);

      // Trả về câu trả lời hỗ trợ lịch sự nếu mạng có trục trặc
      return {
        reply:
          'Dạ chào bạn! 👋 E-ShopTECH luôn sẵn sàng hỗ trợ bạn. Hệ thống đang bảo trì kết nối trực tiếp với trung tâm AI, tuy nhiên bạn hoàn toàn có thể tìm kiếm nhanh trên thanh tìm kiếm hoặc tham khảo các mẫu máy hot như **MacBook Air M3**, **iPhone 16 Pro Max** hay **ASUS ROG Strix G16** trên trang chủ nhé!',
        recommendedProducts: [],
        provider: 'OFFLINE_FALLBACK',
      };
    }
  },
};
