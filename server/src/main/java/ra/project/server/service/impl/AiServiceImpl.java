package ra.project.server.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.request.AiChatRequest;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.request.ChatMessageDto;
import ra.project.server.model.dto.response.AiChatResponse;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.entity.Product;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.AiService;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Value("${gemini.api-key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    @Value("${gemini.model:${GEMINI_MODEL:gemini-1.5-flash}}")
    private String geminiModel;

    @Value("${gemini.api-url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String geminiApiUrl;

    @Value("${spring.ai.openai.api-key:${app.ai.api-key:}}")
    private String openAiApiKey;

    @Value("${spring.ai.openai.chat.options.model:gpt-4o-mini}")
    private String openAiModel;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public AiGenerateDescriptionResponse generateProductDescription(AiGenerateDescriptionRequest request) {
        String productName = request.getProductName().trim();
        String categoryName = StringUtils.hasText(request.getCategoryName()) ? request.getCategoryName().trim() : "Thiết bị điện tử";
        List<String> keywords = request.getKeywords();
        String prompt = buildPrompt(productName, categoryName, keywords);

        // 1. Thử gọi Google Gemini AI nếu có API Key
        if (StringUtils.hasText(geminiApiKey) && !geminiApiKey.equalsIgnoreCase("dummy") && !geminiApiKey.startsWith("placeholder")) {
            log.info("Đang gọi Google Gemini AI Model [{}] để sinh mô tả SEO cho: {}", geminiModel, productName);
            String geminiText = callGeminiApi(prompt);
            if (StringUtils.hasText(geminiText)) {
                log.info("Google Gemini AI sinh mô tả SEO thành công cho: {}", productName);
                return AiGenerateDescriptionResponse.builder()
                        .productName(productName)
                        .categoryName(categoryName)
                        .description(geminiText.trim())
                        .seoTitle(generateSeoTitle(productName, categoryName))
                        .seoKeywords(generateKeywords(productName, categoryName, keywords))
                        .provider("GOOGLE_GEMINI (" + geminiModel + ")")
                        .build();
            }
        }

        // 2. Thử gọi Spring AI (OpenAI) nếu có cấu hình OpenAI
        if (StringUtils.hasText(openAiApiKey) && !openAiApiKey.equalsIgnoreCase("dummy") && !openAiApiKey.startsWith("sk-placeholder")) {
            try {
                log.info("Đang gọi Spring AI OpenAI Model [{}] để sinh mô tả SEO cho: {}", openAiModel, productName);
                OpenAiApi openAiApi = new OpenAiApi(openAiApiKey);
                OpenAiChatModel chatModel = new OpenAiChatModel(openAiApi);
                String aiGeneratedText = chatModel.call(prompt);

                if (StringUtils.hasText(aiGeneratedText)) {
                    log.info("Spring AI sinh mô tả SEO thành công cho: {}", productName);
                    return AiGenerateDescriptionResponse.builder()
                            .productName(productName)
                            .categoryName(categoryName)
                            .description(aiGeneratedText.trim())
                            .seoTitle(generateSeoTitle(productName, categoryName))
                            .seoKeywords(generateKeywords(productName, categoryName, keywords))
                            .provider("SPRING_AI (" + openAiModel + ")")
                            .build();
                }
            } catch (Exception ex) {
                log.warn("Không thể kết nối Spring AI OpenAI ({}), chuyển sang bộ dự phòng: {}", ex.getMessage(), ex.getClass().getSimpleName());
            }
        }

        // 3. Chế độ sinh mô tả chuẩn SEO thông minh (Smart Fallback Generator) khi không có API Key
        log.info("Sử dụng thuật toán sinh mô tả chuẩn SEO tự động cho: {}", productName);
        String fallbackDescription = generateSmartSeoDescription(productName, categoryName, keywords);

        return AiGenerateDescriptionResponse.builder()
                .productName(productName)
                .categoryName(categoryName)
                .description(fallbackDescription)
                .seoTitle(generateSeoTitle(productName, categoryName))
                .seoKeywords(generateKeywords(productName, categoryName, keywords))
                .provider("SMART_SEO_ENGINE (Fallback)")
                .build();
    }

    @Override
    public AiChatResponse chatWithCustomer(AiChatRequest request) {
        String userMessage = request.getMessage().trim();

        // 1. Lấy danh sách sản phẩm thực tế đang kinh doanh từ cơ sở dữ liệu
        List<Product> allProducts = productRepository.findAll().stream()
                .filter(p -> p.getStatus() == null || p.getStatus())
                .collect(Collectors.toList());

        // 2. Tạo Prompt nạp ngữ cảnh RAG (Retrieval Augmented Generation)
        String prompt = buildChatPrompt(userMessage, request.getHistory(), allProducts);

        String replyText = null;
        String provider = "SMART_ASSISTANT (Local Engine)";

        // 3. Thử gọi Google Gemini AI
        if (StringUtils.hasText(geminiApiKey) && !geminiApiKey.equalsIgnoreCase("dummy") && !geminiApiKey.startsWith("placeholder")) {
            log.info("Đang gọi Google Gemini AI Model [{}] để tư vấn sản phẩm cho khách...", geminiModel);
            replyText = callGeminiApi(prompt);
            if (StringUtils.hasText(replyText)) {
                provider = "GOOGLE_GEMINI (" + geminiModel + ")";
            }
        }

        // 4. Thử gọi Spring AI (OpenAI) nếu Gemini không khả dụng
        if (!StringUtils.hasText(replyText) && StringUtils.hasText(openAiApiKey) && !openAiApiKey.equalsIgnoreCase("dummy")) {
            try {
                log.info("Đang gọi Spring AI OpenAI Model [{}] để tư vấn sản phẩm...", openAiModel);
                OpenAiApi openAiApi = new OpenAiApi(openAiApiKey);
                OpenAiChatModel chatModel = new OpenAiChatModel(openAiApi);
                replyText = chatModel.call(prompt);
                if (StringUtils.hasText(replyText)) {
                    provider = "SPRING_AI (" + openAiModel + ")";
                }
            } catch (Exception ex) {
                log.warn("Gọi Spring AI thất bại: {}", ex.getMessage());
            }
        }

        // 5. Fallback thông minh nếu không có kết nối AI bên ngoài
        if (!StringUtils.hasText(replyText)) {
            log.info("Sử dụng Smart Fallback Assistant để trả lời khách hàng.");
            AiChatResponse fallback = generateSmartChatFallback(userMessage, allProducts);
            replyText = fallback.getReply();
            return fallback;
        }

        // 6. Trích xuất danh sách sản phẩm được AI đề xuất để hiển thị Product Card
        List<ProductResponse> recommended = extractRecommendedProducts(replyText, userMessage, allProducts);

        return AiChatResponse.builder()
                .reply(replyText.trim())
                .recommendedProducts(recommended)
                .provider(provider)
                .build();
    }

    private String buildChatPrompt(String userMessage, List<ChatMessageDto> history, List<Product> products) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là 'E-ShopTECH AI Assistant' - Chuyên viên tư vấn bán hàng công nghệ thông minh, nhiệt tình và am hiểu sản phẩm của website thương mại điện tử E-ShopTECH.\n\n");

        sb.append("=== CHÍNH SÁCH BÁN HÀNG CỦA E-SHOPTECH ===\n");
        sb.append("- Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000đ.\n");
        sb.append("- Bảo hành chính hãng 12 đến 24 tháng theo từng sản phẩm, 1 đổi 1 trong 30 ngày nếu phát sinh lỗi.\n");
        sb.append("- Hỗ trợ trả góp 0% lãi suất, giao hàng hỏa tốc trong 2 giờ tại nội thành.\n\n");

        sb.append("=== DANH SÁCH SẢN PHẨM HIỆN CÓ CỦA CỬA HÀNG (DỮ LIỆU THỰC TẾ) ===\n");
        Locale vn = Locale.forLanguageTag("vi-VN");
        NumberFormat nf = NumberFormat.getInstance(vn);

        for (Product p : products) {
            String priceStr = p.getPrice() != null ? nf.format(p.getPrice()) + "đ" : "Liên hệ";
            String catName = p.getCategory() != null ? p.getCategory().getName() : "Thiết bị điện tử";
            String desc = p.getDescription() != null ? p.getDescription().replaceAll("\\s+", " ").trim() : "";
            if (desc.length() > 150) {
                desc = desc.substring(0, 150) + "...";
            }
            sb.append(String.format("- [ID: %d] %s | Giá: %s | Danh mục: %s | Tồn kho: %d | Đặc điểm: %s\n",
                    p.getId(), p.getName(), priceStr, catName, p.getStock() != null ? p.getStock() : 0, desc));
        }

        sb.append("\n=== NGUYÊN TẮC TƯ VẤN QUAN TRỌNG ===\n");
        sb.append("1. Chỉ gợi ý và tư vấn các sản phẩm CÓ TRONG DANH SÁCH TRÊN. Tuyệt đối không tự bịa ra sản phẩm mà shop không kinh doanh.\n");
        sb.append("2. Khi đề cập đến sản phẩm cụ thể, LUÔN ghi kèm mã [ID: <id>], Tên chính xác và Giá bán (ví dụ: '**MacBook Air M3 [ID: 4]** (Giá: 21.590.000đ)') để hệ thống nhận diện và hiển thị card mua sắm cho khách hàng.\n");
        sb.append("3. Phân tích nhu cầu của khách hàng (khoảng ngân sách, mục đích sử dụng như học tập, gaming, đồ họa, nghe nhạc, pin trâu...) để đưa ra lời khuyên phù hợp nhất.\n");
        sb.append("4. Nếu khách hàng hỏi sản phẩm mà shop hiện KHÔNG CÓ, hãy lịch sự thông báo hiện sản phẩm đó đang tạm hết hàng hoặc chưa mở bán, đồng thời khéo léo gợi ý 1-2 mẫu tương đương đang có sẵn tại shop.\n");
        sb.append("5. Văn phong lịch sự, thân thiện, trả lời bằng tiếng Việt chuẩn mực, sử dụng định dạng Markdown (gạch đầu dòng, in đậm tên sản phẩm) và các emoji trực quan sinh động.\n\n");

        if (history != null && !history.isEmpty()) {
            sb.append("=== LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ ===\n");
            // Lấy tối đa 6 lượt chat gần nhất để tránh tràn context
            int startIdx = Math.max(0, history.size() - 6);
            for (int i = startIdx; i < history.size(); i++) {
                ChatMessageDto msg = history.get(i);
                String roleName = "user".equalsIgnoreCase(msg.getRole()) ? "Khách hàng" : "Trợ lý E-ShopTECH";
                sb.append(roleName).append(": ").append(msg.getContent()).append("\n");
            }
            sb.append("\n");
        }

        sb.append("CÂU HỎI MỚI CỦA KHÁCH HÀNG:\n").append(userMessage);
        return sb.toString();
    }

    private List<ProductResponse> extractRecommendedProducts(String replyText, String userMessage, List<Product> products) {
        Set<Long> foundIds = new LinkedHashSet<>();

        // Tìm kiếm các mã [ID: <number>] trong câu trả lời của AI
        Pattern pattern = Pattern.compile("\\[ID:\\s*(\\d+)\\]", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(replyText);
        while (matcher.find()) {
            try {
                foundIds.add(Long.parseLong(matcher.group(1)));
            } catch (NumberFormatException ignored) {}
        }

        // Nếu không có tag [ID: ...], tìm theo tên sản phẩm xuất hiện trong câu trả lời
        if (foundIds.isEmpty()) {
            for (Product p : products) {
                if (replyText.toLowerCase().contains(p.getName().toLowerCase())) {
                    foundIds.add(p.getId());
                    if (foundIds.size() >= 4) break;
                }
            }
        }

        // Nếu vẫn chưa có và khách có hỏi về loại sản phẩm, tìm theo từ khóa câu hỏi
        if (foundIds.isEmpty()) {
            String lowerQuery = userMessage.toLowerCase();
            for (Product p : products) {
                String pName = p.getName().toLowerCase();
                String catName = p.getCategory() != null ? p.getCategory().getName().toLowerCase() : "";
                if (lowerQuery.contains(pName) || pName.contains(lowerQuery) || lowerQuery.contains(catName)) {
                    foundIds.add(p.getId());
                    if (foundIds.size() >= 3) break;
                }
            }
        }

        Map<Long, Product> productMap = products.stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));

        return foundIds.stream()
                .map(productMap::get)
                .filter(Objects::nonNull)
                .limit(4)
                .map(productMapper::toResponse)
                .collect(Collectors.toList());
    }

    private AiChatResponse generateSmartChatFallback(String userMessage, List<Product> products) {
        String query = userMessage.toLowerCase().trim();
        List<Product> matched = new ArrayList<>();
        Locale vn = Locale.forLanguageTag("vi-VN");
        NumberFormat nf = NumberFormat.getInstance(vn);

        // 1. Ý định chào hỏi thân thiện
        if (query.equals("chào") || query.equals("chao") || query.startsWith("xin chào") ||
                query.contains("chào bạn") || query.contains("chào shop") || query.equals("hello") ||
                query.equals("hi") || query.startsWith("hi ") || query.contains("alo") || query.contains("ơi")) {
            List<Product> topFeatured = products.stream().limit(3).collect(Collectors.toList());
            String greetingReply = "Dạ em chào anh/chị ạ! 👋 Em là **E-ShopTECH AI** — chuyên viên tư vấn công nghệ 24/7 của shop.\n\n" +
                    "Anh/chị đang quan tâm đến dòng sản phẩm nào để em tư vấn thông số và ưu đãi tốt nhất ạ?\n" +
                    "- 💻 **Laptop**: MacBook Air/Pro, Dell XPS, ASUS Gaming, Lenovo Legion\n" +
                    "- 📱 **Điện thoại**: iPhone 16/15 Pro Max, Samsung Galaxy S24 Ultra, ROG Phone\n" +
                    "- 🎧 **Âm thanh & Phụ kiện**: Tai nghe chống ồn, loa Bluetooth cao cấp\n" +
                    "- 🛡️ **Chính sách**: 100% chính hãng, bảo hành 12-24 tháng, miễn phí vận chuyển toàn quốc.\n\n" +
                    "Dưới đây là một số mẫu máy tiêu biểu đang được yêu thích nhất tại cửa hàng:";
            return AiChatResponse.builder()
                    .reply(greetingReply)
                    .recommendedProducts(topFeatured.stream().map(productMapper::toResponse).collect(Collectors.toList()))
                    .provider("E-ShopTECH AI Assistant")
                    .build();
        }

        // 2. Ý định hỏi về chính sách bảo hành / đổi trả
        if (query.contains("bảo hành") || query.contains("bao hanh") || query.contains("đổi trả") || query.contains("hỏng") || query.contains("lỗi")) {
            String warrantyReply = "🛡️ **Chính sách bảo hành vàng tại E-ShopTECH:**\n\n" +
                    "- **100% Hàng chính hãng**: Toàn bộ sản phẩm phân phối đều là hàng chính ngạch nguyên seal, đầy đủ hóa đơn VAT.\n" +
                    "- **1 Đổi 1 trong 30 ngày**: Nếu sản phẩm phát sinh lỗi phần cứng do nhà sản xuất, shop đổi ngay máy mới 100% không phát sinh chi phí.\n" +
                    "- **Thời hạn bảo hành**: Từ 12 đến 24 tháng theo đúng tiêu chuẩn khắt khe của hãng (Apple, Samsung, Asus, Dell, Sony).\n" +
                    "- **Trung tâm bảo hành toàn quốc**: Quý khách có thể mang máy trực tiếp tới các trung tâm bảo hành ủy quyền của hãng trên cả nước hoặc gửi qua shop hỗ trợ miễn phí!\n" +
                    "- **Hỗ trợ trọn đời**: Miễn phí cài đặt phần mềm bản quyền, vệ sinh máy và hỗ trợ kỹ thuật 24/7.";
            return AiChatResponse.builder()
                    .reply(warrantyReply)
                    .recommendedProducts(products.stream().limit(2).map(productMapper::toResponse).collect(Collectors.toList()))
                    .provider("E-ShopTECH AI Assistant")
                    .build();
        }

        // 3. Ý định hỏi về vận chuyển / giao hàng
        if (query.contains("vận chuyển") || query.contains("giao hàng") || query.contains("ship") || query.contains("freeship") || query.contains("hỏa tốc")) {
            String shipReply = "🚚 **Chính sách vận chuyển & Giao hàng tại E-ShopTECH:**\n\n" +
                    "- **Miễn phí giao hàng toàn quốc**: Áp dụng cho mọi đơn hàng có giá trị từ **500.000đ** trở lên.\n" +
                    "- **Giao hỏa tốc 2 giờ**: Khu vực nội thành Hà Nội & TP. Hồ Chí Minh nhận hàng ngay trong ngày.\n" +
                    "- **Đồng kiểm khi nhận (COD)**: Quý khách được quyền mở hộp kiểm tra đúng model, ngoại quan nguyên vẹn trước khi thanh toán.\n" +
                    "- **Đóng gói chuẩn công nghệ**: Thùng carton 5 lớp kèm túi khí chống sốc và dán niêm phong an toàn tuyệt đối.";
            return AiChatResponse.builder()
                    .reply(shipReply)
                    .recommendedProducts(products.stream().limit(2).map(productMapper::toResponse).collect(Collectors.toList()))
                    .provider("E-ShopTECH AI Assistant")
                    .build();
        }

        // 4. Ý định hỏi về trả góp / khuyến mãi
        if (query.contains("trả góp") || query.contains("khuyến mãi") || query.contains("ưu đãi") || query.contains("giảm giá") || query.contains("sale")) {
            String promoReply = "🎁 **Chương trình khuyến mãi & Hỗ trợ trả góp tại E-ShopTECH:**\n\n" +
                    "- **Trả góp 0% lãi suất**: Hỗ trợ qua thẻ tín dụng hơn 25 ngân hàng hoặc duyệt hồ sơ online qua CCCD chỉ mất 10-15 phút.\n" +
                    "- **Flash Sale mỗi ngày**: Giảm sâu đến 30% cho các sản phẩm công nghệ hot nhất.\n" +
                    "- **Ưu đãi Học sinh - Sinh viên**: Tặng thêm voucher giảm giá 500.000đ khi mua laptop hoặc máy tính bảng.\n" +
                    "- **Thu cũ đổi mới (Trade-in)**: Trợ giá thu mua máy cũ lên đến 2.000.000đ để quý khách lên đời máy mới tiết kiệm nhất!";
            return AiChatResponse.builder()
                    .reply(promoReply)
                    .recommendedProducts(products.stream().limit(3).map(productMapper::toResponse).collect(Collectors.toList()))
                    .provider("E-ShopTECH AI Assistant")
                    .build();
        }

        // 5. Lọc theo danh mục hoặc từ khóa sản phẩm
        for (Product p : products) {
            String pName = p.getName().toLowerCase();
            String catName = p.getCategory() != null ? p.getCategory().getName().toLowerCase() : "";
            if (query.contains("laptop") && (pName.contains("laptop") || pName.contains("macbook") || pName.contains("rog") || pName.contains("dell") || pName.contains("zenbook") || catName.contains("laptop"))) {
                matched.add(p);
            } else if ((query.contains("điện thoại") || query.contains("phone") || query.contains("iphone") || query.contains("samsung")) &&
                    (pName.contains("iphone") || pName.contains("galaxy") || pName.contains("s24") || pName.contains("rog phone") || catName.contains("thoại"))) {
                matched.add(p);
            } else if ((query.contains("tai nghe") || query.contains("âm thanh") || query.contains("phụ kiện")) &&
                    (pName.contains("headphone") || pName.contains("tai nghe") || pName.contains("airpods") || pName.contains("sony") || catName.contains("phụ kiện") || catName.contains("âm thanh"))) {
                matched.add(p);
            } else if (pName.contains(query) || query.contains(pName)) {
                matched.add(p);
            }
        }

        if (matched.isEmpty()) {
            matched = products.stream().limit(3).collect(Collectors.toList());
        }

        StringBuilder reply = new StringBuilder();
        reply.append("Dạ chào anh/chị! 👋 E-ShopTECH rất vui được hỗ trợ.\n\n");

        if (!matched.isEmpty()) {
            reply.append("Dưới đây là một số sản phẩm công nghệ nổi bật rất phù hợp với nhu cầu anh/chị đang quan tâm:\n\n");
            for (Product p : matched) {
                String priceStr = p.getPrice() != null ? nf.format(p.getPrice()) + "đ" : "Liên hệ";
                reply.append(String.format("🔹 **%s [ID: %d]**\n", p.getName(), p.getId()));
                reply.append(String.format("   - **Giá ưu đãi:** %s\n", priceStr));
                if (StringUtils.hasText(p.getDescription())) {
                    reply.append(String.format("   - **Đặc điểm:** %s\n", p.getDescription().trim()));
                }
                reply.append("\n");
            }
            reply.append("🌟 **Đặc quyền tại E-ShopTECH:**\n");
            reply.append("- Miễn phí vận chuyển toàn quốc cho đơn từ 500.000đ 🚚\n");
            reply.append("- Bảo hành chính hãng 12 - 24 tháng, 1 đổi 1 trong 30 ngày 🛡️\n\n");
            reply.append("Anh/chị hãy bấm vào thẻ sản phẩm bên dưới để xem chi tiết thông số hoặc nhắn thêm nếu cần em tư vấn thêm nhé! 😊");
        } else {
            reply.append("Hiện tại E-ShopTECH đang phân phối chính hãng các dòng Laptop cao cấp (MacBook, ASUS ROG, Dell XPS), Điện thoại flagship (iPhone 16 Series, Samsung Galaxy S24 Ultra) và Phụ kiện chính hãng.\n\n");
            reply.append("Anh/chị có thể mô tả cụ thể hơn về khoảng ngân sách hoặc nhu cầu sử dụng (học tập, làm việc, gaming) để em gợi ý mẫu máy ưng ý nhất nhé! ✨");
        }

        List<ProductResponse> recommended = matched.stream()
                .limit(4)
                .map(productMapper::toResponse)
                .collect(Collectors.toList());

        return AiChatResponse.builder()
                .reply(reply.toString())
                .recommendedProducts(recommended)
                .provider("E-ShopTECH AI Assistant")
                .build();
    }

    private String callGeminiApi(String prompt) {
        // Thử model được cấu hình, nếu thất bại thử fallback sang gemini-1.5-flash
        String[] candidateModels = new String[]{
                geminiModel,
                "gemini-1.5-flash",
                "gemini-2.0-flash",
                "gemini-2.5-flash"
        };

        for (String model : candidateModels) {
            if (!StringUtils.hasText(model)) continue;
            try {
                String url = String.format("%s/%s:generateContent?key=%s", geminiApiUrl, model.trim(), geminiApiKey.trim());
                Map<String, Object> part = Map.of("text", prompt);
                Map<String, Object> content = Map.of("parts", List.of(part));
                Map<String, Object> requestPayload = Map.of("contents", List.of(content));

                String requestBody = objectMapper.writeValueAsString(requestPayload);

                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(20))
                        .header("Content-Type", "application/json; charset=utf-8")
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && !candidates.isEmpty()) {
                        JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                        if (!textNode.isMissingNode()) {
                            return textNode.asText().trim();
                        }
                    }
                } else {
                    log.warn("Gemini API (model {}) trả về mã {}: {}", model, response.statusCode(), response.body());
                }
            } catch (Exception ex) {
                log.warn("Gọi Gemini API (model {}) thất bại: {}", model, ex.getMessage());
            }
        }
        return null;
    }

    private String buildPrompt(String productName, String categoryName, List<String> keywords) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là chuyên gia Content Marketing & SEO Thương Mại Điện Tử hàng đầu.\n");
        sb.append("Hãy viết một đoạn mô tả sản phẩm hấp dẫn, chuẩn SEO cho sản phẩm sau:\n");
        sb.append("- Tên sản phẩm: ").append(productName).append("\n");
        sb.append("- Danh mục: ").append(categoryName).append("\n");
        if (keywords != null && !keywords.isEmpty()) {
            sb.append("- Các từ khóa trọng tâm: ").append(String.join(", ", keywords)).append("\n");
        }
        sb.append("\nYêu cầu cấu trúc:\n");
        sb.append("1. Mở đầu hấp dẫn giới thiệu định vị sản phẩm.\n");
        sb.append("2. Nêu bật các tính năng công nghệ vượt trội, hiệu năng, thiết kế và trải nghiệm thực tế.\n");
        sb.append("3. Lợi ích tối đa cho người dùng và lời cam kết chất lượng/bảo hành chính hãng.\n");
        sb.append("Văn phong hiện đại, lôi cuốn, độ dài khoảng 120-180 từ, định dạng Markdown rõ ràng.");
        return sb.toString();
    }

    private String generateSmartSeoDescription(String productName, String categoryName, List<String> keywords) {
        String keywordStr = (keywords != null && !keywords.isEmpty()) ? String.join(", ", keywords) : "công nghệ tiên tiến, thiết kế đẳng cấp";

        return String.format(
                "### Giới thiệu sản phẩm %s\n\n" +
                "**%s** là sự kết hợp hoàn hảo giữa thiết kế hiện đại, tinh tế và hiệu năng vượt bậc trong phân khúc **%s**. " +
                "Sở hữu ngôn ngữ hoàn thiện cao cấp cùng độ bền bỉ đáng kinh ngạc, sản phẩm mang lại trải nghiệm đỉnh cao cho cả nhu cầu công việc lẫn giải trí thường ngày.\n\n" +
                "#### Điểm nổi bật vượt trội:\n" +
                "- **Hiệu năng bứt phá**: Tối ưu hóa xử lý mượt mà, phản hồi tức thì với tốc độ đáng nể.\n" +
                "- **Trải nghiệm xuất sắc**: Tích hợp các tính năng thông minh (%s) giúp nâng cao tiện ích cho người sử dụng.\n" +
                "- **Độ bền chuẩn mực**: Quy trình sản xuất nghiêm ngặt, vật liệu thân thiện và an toàn tuyệt đối.\n\n" +
                "Sản phẩm được phân phối chính hãng với chế độ bảo hành 12 tháng, 1 đổi 1 trong 30 ngày và giao hàng nhanh toàn quốc. Đặt hàng ngay hôm nay để nhận ưu đãi hấp dẫn nhất!",
                productName, productName, categoryName, keywordStr
        );
    }

    private String generateSeoTitle(String productName, String categoryName) {
        return String.format("%s - Chính Hãng, Giá Tốt Nhất Phân Khúc %s | E-ShopTECH", productName, categoryName);
    }

    private String generateKeywords(String productName, String categoryName, List<String> keywords) {
        StringBuilder sb = new StringBuilder();
        sb.append(productName.toLowerCase()).append(", ");
        sb.append(categoryName.toLowerCase()).append(" chính hãng, ");
        sb.append("mua ").append(productName.toLowerCase()).append(", ");
        sb.append("giá tốt ").append(productName.toLowerCase());
        if (keywords != null && !keywords.isEmpty()) {
            for (String kw : keywords) {
                sb.append(", ").append(kw.trim().toLowerCase());
            }
        }
        return sb.toString();
    }
}
