import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { MOCK_PRODUCTS } from '../mockData';
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

/**
 * Bộ tạo phản hồi thông minh Offline Fallback Engine (Client-side)
 * Đảm bảo trợ lý AI luôn phản hồi linh hoạt, chuẩn xác theo từng câu hỏi của khách hàng
 * kể cả khi kết nối mạng chập chờn hoặc máy chủ đang khởi động.
 */
function generateSmartClientFallback(userQuery: string): {
  reply: string;
  recommendedProducts: Product[];
  provider: string;
} {
  const q = userQuery.toLowerCase().trim();

  // 1. Chào hỏi thân thiện
  if (
    q === 'chào' ||
    q === 'chao' ||
    q.includes('xin chào') ||
    q.includes('chào bạn') ||
    q.includes('chào shop') ||
    q.includes('chào e-shop') ||
    q.includes('hello') ||
    q.includes('hi ') ||
    q === 'hi' ||
    q.includes('alo') ||
    q.includes('ad ơi') ||
    q.includes('ơi shop')
  ) {
    const featured = MOCK_PRODUCTS.slice(0, 3);
    return {
      reply:
        'Dạ em chào anh/chị ạ! 👋 Em là **E-ShopTECH AI** — trợ lý tư vấn công nghệ 24/7 của shop.\n\n' +
        'Anh/chị đang quan tâm đến dòng sản phẩm nào để em tư vấn thông số và ưu đãi tốt nhất ạ?\n' +
        '- 💻 **Laptop**: MacBook, Dell XPS, ASUS Gaming, ThinkPad\n' +
        '- 📱 **Điện thoại**: iPhone 16/15 Pro Max, Galaxy S24 Ultra, Gaming Phone\n' +
        '- 🎧 **Âm thanh & Phụ kiện**: Tai nghe chống ồn, loa di động, củ sạc nhanh\n' +
        '- 🛡️ **Chính sách**: Bảo hành 12-24 tháng chính hãng, miễn phí vận chuyển toàn quốc.',
      recommendedProducts: featured,
      provider: 'E-ShopTECH AI (Local Assistant)',
    };
  }

  // 2. Tư vấn Laptop / MacBook / Gaming / Đồ họa
  if (
    q.includes('laptop') ||
    q.includes('macbook') ||
    q.includes('máy tính') ||
    q.includes('gaming') ||
    q.includes('đồ họa') ||
    q.includes('văn phòng') ||
    q.includes('dell') ||
    q.includes('asus') ||
    q.includes('thinkpad') ||
    q.includes('legion')
  ) {
    const laptops = MOCK_PRODUCTS.filter(
      (p) =>
        p.categoryId === 2 ||
        p.name.toLowerCase().includes('laptop') ||
        p.name.toLowerCase().includes('macbook') ||
        p.name.toLowerCase().includes('dell') ||
        p.name.toLowerCase().includes('asus') ||
        p.name.toLowerCase().includes('thinkpad')
    ).slice(0, 4);

    return {
      reply:
        'Dạ về dòng **Laptop**, E-ShopTECH xin giới thiệu các mẫu máy đang được khách hàng ưa chuộng và đánh giá cao nhất:\n\n' +
        '- 🔹 **MacBook Air M3**: Mỏng nhẹ đỉnh cao chỉ 1.24kg, pin trâu 18h, vận hành êm ái hoàn toàn không quạt tản nhiệt.\n' +
        '- 🔹 **MacBook Pro 14 M3 Pro**: Sức mạnh chuyên nghiệp cho coder, đồ họa kiến trúc, render 4K với màn Liquid Retina XDR 120Hz chuẩn màu.\n' +
        '- 🔹 **Dell XPS 13 Plus**: Thiết kế tối giản tương lai với trackpad kính tàng hình, màn hình cảm ứng OLED 3.5K siêu sắc nét.\n' +
        '- 🔹 **ASUS ROG / Lenovo Legion**: Cấu hình card đồ họa rời RTX mạnh mẽ dành cho game thủ và dựng phim chuyên nghiệp.\n\n' +
        '🎁 **Ưu đãi kèm theo**: Tặng balo công nghệ chống nước, chuột quang không dây và hỗ trợ trả góp 0% lãi suất!',
      recommendedProducts: laptops.length > 0 ? laptops : MOCK_PRODUCTS.slice(0, 3),
      provider: 'E-ShopTECH AI (Local Assistant)',
    };
  }

  // 3. Tư vấn Điện thoại / Smartphone / iPhone / Samsung
  if (
    q.includes('điện thoại') ||
    q.includes('phone') ||
    q.includes('iphone') ||
    q.includes('samsung') ||
    q.includes('galaxy') ||
    q.includes('rog phone')
  ) {
    const phones = MOCK_PRODUCTS.filter(
      (p) =>
        p.categoryId === 1 ||
        p.name.toLowerCase().includes('iphone') ||
        p.name.toLowerCase().includes('galaxy') ||
        p.name.toLowerCase().includes('phone')
    ).slice(0, 4);

    return {
      reply:
        'Dạ về dòng **Điện thoại thông minh Flagship**, dưới đây là các siêu phẩm dẫn đầu thị trường tại E-ShopTECH:\n\n' +
        '- 📱 **iPhone 15 / 16 Pro Max**: Khung viền Titan cao cấp siêu nhẹ, chip Apple A17/A18 Pro tối thượng, camera tele 5x bắt trọn mọi khoảnh khắc.\n' +
        '- 📱 **Samsung Galaxy S24 Ultra**: Tích hợp bút S Pen thông minh, camera 200MP đột phá cùng công nghệ Galaxy AI hỗ trợ dịch thuật trực tiếp.\n' +
        '- 🎮 **Asus ROG Phone 8 Pro**: Cỗ máy gaming đỉnh cao với màn hình AMOLED 165Hz mượt mà và phím siêu âm AirTrigger thao tác thần tốc.\n\n' +
        '✨ Cam kết 100% hàng New Seal chính hãng, 1 đổi 1 trong 30 ngày và giao hàng nhanh trong 2 giờ!',
      recommendedProducts: phones.length > 0 ? phones : MOCK_PRODUCTS.slice(0, 3),
      provider: 'E-ShopTECH AI (Local Assistant)',
    };
  }

  // 4. Tai nghe / Âm thanh / Phụ kiện
  if (
    q.includes('tai nghe') ||
    q.includes('headphone') ||
    q.includes('âm thanh') ||
    q.includes('loa') ||
    q.includes('sony') ||
    q.includes('airpods') ||
    q.includes('chống ồn')
  ) {
    const audio = MOCK_PRODUCTS.filter(
      (p) =>
        p.categoryId === 4 ||
        p.name.toLowerCase().includes('tai nghe') ||
        p.name.toLowerCase().includes('sony') ||
        p.name.toLowerCase().includes('airpods') ||
        p.name.toLowerCase().includes('headphone')
    ).slice(0, 4);

    return {
      reply:
        'Dạ về thiết bị **Âm thanh & Tai nghe chống ồn**, E-ShopTECH tự hào mang đến các dòng sản phẩm chất lượng hàng đầu:\n\n' +
        '- 🎧 **Sony WH-1000XM5**: Đỉnh cao công nghệ chống ồn chủ động (ANC) số 1 thế giới, chất âm Hi-Res sắc sảo và thời lượng pin ấn tượng lên tới 30 giờ.\n' +
        '- 🎧 **Apple AirPods Pro 2**: Khả năng khử tiếng ồn gấp 2 lần, tính năng Adaptive Audio thông minh và chip H2 tối ưu trải nghiệm âm thanh 3D sống động.\n\n' +
        'Toàn bộ sản phẩm được bảo hành chính hãng 12 tháng tại các trung tâm bảo hành ủy quyền!',
      recommendedProducts: audio.length > 0 ? audio : MOCK_PRODUCTS.slice(0, 3),
      provider: 'E-ShopTECH AI (Local Assistant)',
    };
  }

  // 5. Chính sách bảo hành / Đổi trả
  if (
    q.includes('bảo hành') ||
    q.includes('bao hanh') ||
    q.includes('đổi trả') ||
    q.includes('doi tra') ||
    q.includes('hỏng') ||
    q.includes('lỗi')
  ) {
    return {
      reply:
        '🛡️ **Chính sách bảo hành vàng tại E-ShopTECH:**\n\n' +
        '- **100% Hàng chính hãng**: Toàn bộ sản phẩm mới nguyên seal, có đầy đủ hóa đơn VAT và tem bảo hành chính ngạch.\n' +
        '- **1 Đổi 1 trong 30 ngày**: Nếu sản phẩm gặp lỗi phần cứng do nhà sản xuất, khách hàng được đổi ngay máy mới 100% không mất thêm phí.\n' +
        '- **Thời hạn bảo hành**: Từ 12 đến 24 tháng theo đúng tiêu chuẩn của Apple, Samsung, Asus, Dell, Sony.\n' +
        '- **Tiếp nhận bảo hành toàn quốc**: Hỗ trợ gửi máy tại showroom của shop hoặc các trung tâm bảo hành ủy quyền chính hãng trên toàn quốc.\n' +
        '- **Hỗ trợ trọn đời**: Miễn phí cài đặt phần mềm bản quyền, vệ sinh máy và kiểm tra định kỳ.',
      recommendedProducts: MOCK_PRODUCTS.slice(0, 2),
      provider: 'E-ShopTECH AI (Local Assistant)',
    };
  }

  // 6. Chính sách vận chuyển / Freeship
  if (
    q.includes('vận chuyển') ||
    q.includes('giao hàng') ||
    q.includes('ship') ||
    q.includes('freeship') ||
    q.includes('hỏa tốc')
  ) {
    return {
      reply:
        '🚚 **Chính sách giao hàng siêu tốc tại E-ShopTECH:**\n\n' +
        '- **Miễn phí vận chuyển**: Cho tất cả đơn hàng có giá trị từ **500.000đ** trở lên trên toàn quốc.\n' +
        '- **Giao hỏa tốc 2 giờ**: Áp dụng tại khu vực nội thành Hà Nội & TP. Hồ Chí Minh.\n' +
        '- **Đồng kiểm khi nhận (COD)**: Quý khách được quyền mở hộp kiểm tra đúng model, ngoại quan nguyên vẹn trước khi thanh toán.\n' +
        '- **Bảo hiểm hàng hóa 100%**: Cam kết hoàn tiền hoặc đổi mới ngay nếu kiện hàng phát sinh cấn móp, hư hại do vận chuyển.',
      recommendedProducts: MOCK_PRODUCTS.slice(0, 2),
      provider: 'E-ShopTECH AI (Local Assistant)',
    };
  }

  // 7. Giá bán / Khuyến mãi / Trả góp
  if (
    q.includes('giá') ||
    q.includes('gia') ||
    q.includes('khuyến mãi') ||
    q.includes('khuyen mai') ||
    q.includes('trả góp') ||
    q.includes('tra gop') ||
    q.includes('ưu đãi') ||
    q.includes('giảm giá') ||
    q.includes('sale')
  ) {
    return {
      reply:
        '🎁 **Chương trình ưu đãi & Hỗ trợ trả góp tại E-ShopTECH:**\n\n' +
        '- **Trả góp 0% lãi suất**: Hỗ trợ qua thẻ tín dụng hơn 25 ngân hàng hoặc duyệt hồ sơ online qua CCCD chỉ mất 10-15 phút.\n' +
        '- **Flash Sale mỗi ngày**: Giảm sâu đến 30% cho các sản phẩm công nghệ hot nhất.\n' +
        '- **Ưu đãi Học sinh - Sinh viên**: Tặng thêm voucher giảm giá 500.000đ khi mua laptop hoặc máy tính bảng.\n' +
        '- **Thu cũ đổi mới (Trade-in)**: Trợ giá thu mua máy cũ lên đến 2.000.000đ để quý khách lên đời máy mới tiết kiệm nhất!',
      recommendedProducts: MOCK_PRODUCTS.filter((p) => p.discountPercent && p.discountPercent > 10).slice(0, 3),
      provider: 'E-ShopTECH AI (Local Assistant)',
    };
  }

  // 8. Tìm kiếm linh hoạt theo từ khóa tên sản phẩm
  const matchedProducts = MOCK_PRODUCTS.filter((p) => {
    const pName = p.name.toLowerCase();
    const pDesc = p.description.toLowerCase();
    return q.split(/\s+/).some((word) => word.length >= 3 && (pName.includes(word) || pDesc.includes(word)));
  }).slice(0, 4);

  if (matchedProducts.length > 0) {
    return {
      reply:
        `Dạ em đã tìm thấy một số sản phẩm phù hợp với nhu cầu "**${userQuery}**" của anh/chị đây ạ:\n\n` +
        matchedProducts.map((p) => `🔹 **${p.name}** - Giá ưu đãi: **${new Intl.NumberFormat('vi-VN').format(p.price)}đ**\n   _${p.description.slice(0, 100)}..._`).join('\n\n') +
        '\n\nAnh/chị hãy bấm vào thẻ sản phẩm bên dưới để xem chi tiết thông số hoặc nhắn thêm nếu cần em tư vấn thêm nhé! 😊',
      recommendedProducts: matchedProducts,
      provider: 'E-ShopTECH AI (Local Assistant)',
    };
  }

  // 9. Phản hồi chung lịch sự và giới thiệu sản phẩm tiêu biểu
  return {
    reply:
      `Dạ cảm ơn anh/chị đã quan tâm đến E-ShopTECH! ✨\n\n` +
      `Để em có thể tư vấn mẫu máy phù hợp nhất, anh/chị có thể cho em biết thêm về **khoảng ngân sách** hoặc **nhu cầu sử dụng** (học tập, làm việc văn phòng, gaming, đồ họa...) không ạ?\n\n` +
      `Dưới đây là một số dòng máy bán chạy nhất tuần này mà anh/chị có thể tham khảo:`,
    recommendedProducts: MOCK_PRODUCTS.slice(0, 3),
    provider: 'E-ShopTECH AI (Local Assistant)',
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
    const cleanMessage = message.trim();
    if (!cleanMessage) {
      return {
        reply: 'Dạ bạn cần em hỗ trợ tư vấn sản phẩm hay thông tin bảo hành nào ạ?',
        recommendedProducts: [],
        provider: 'E-ShopTECH AI',
      };
    }

    try {
      const response = await axiosClient.post<AiChatApiResponse>(ENDPOINTS.AI.CHAT, {
        message: cleanMessage,
        history: history.slice(-6), // Lấy tối đa 6 lượt chat gần nhất
      });

      const data = response.data?.data || (response.data as any);
      const rawProducts = data?.recommendedProducts || [];

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
        reply: data?.reply || 'Dạ NEXOR luôn sẵn sàng hỗ trợ quý khách!',
        recommendedProducts: formattedProducts,
        provider: data?.provider || 'NEXOR AI Assistant',
      };
    } catch (error: any) {
      console.warn('AI Chat API call fallback to smart local assistant:', error);
      // Khi backend chưa phản hồi hoặc mạng chập chờn, tự động kích hoạt bộ xử lý thông minh cục bộ
      return generateSmartClientFallback(cleanMessage);
    }
  },

  /**
   * [Admin] Gọi AI tự động sinh mô tả sản phẩm chuẩn SEO (POST /api/admin/ai/generate-description)
   */
  async generateProductDescription(
    productName: string,
    categoryName = 'Thiết bị công nghệ',
    keywords: string[] = []
  ): Promise<string> {
    try {
      const response = await axiosClient.post(ENDPOINTS.AI.GENERATE_DESCRIPTION, {
        productName: productName.trim(),
        categoryName: categoryName.trim(),
        keywords,
      });
      const data = response.data?.data || response.data;
      if (data?.description) {
        return data.description;
      }
    } catch (err) {
      console.warn('Backend AI Description API call fallback to smart generator:', err);
    }

    // Smart Fallback Description nếu Backend chưa nạp API key
    return (
      `✨ **Tổng quan sản phẩm**: ${productName} là dòng sản phẩm cao cấp chính hãng thuộc phân khúc ${categoryName}, được thiết kế tinh tế với ngôn ngữ hiện đại, mang lại trải nghiệm đỉnh cao cho người dùng.\n\n` +
      `🔥 **Đặc điểm nổi bật**:\n` +
      `- Hiệu năng mạnh mẽ hàng đầu, vận hành mượt mà mọi tác vụ học tập, làm việc và giải trí.\n` +
      `- Thiết kế sang trọng, gia công tỉ mỉ với chất liệu cao cấp và độ hoàn thiện vượt trội.\n` +
      `- Tối ưu hóa thời lượng pin và khả năng kết nối không dây tốc độ cao ổn định.\n\n` +
      `🛡️ **Chính sách cam kết**: 100% hàng New Seal chính hãng, bảo hành 12 tháng 1 đổi 1 và hỗ trợ giao hàng hỏa tốc toàn quốc.`
    );
  },
};

