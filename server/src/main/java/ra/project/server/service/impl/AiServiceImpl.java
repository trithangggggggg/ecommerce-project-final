package ra.project.server.service.impl;

import ra.project.server.exception.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Autowired;
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
import ra.project.server.service.AiConfigService;
import ra.project.server.service.AiService;
import ra.project.server.service.KnowledgeBaseService;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
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
    private final KnowledgeBaseService knowledgeBaseService;

    @Autowired(required = false)
    private AiConfigService aiConfigService;

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

    private String getEffectiveGeminiApiKey() {
        if (aiConfigService != null) return aiConfigService.getEffectiveGeminiApiKey();
        return geminiApiKey;
    }

    private String getEffectiveGeminiModel() {
        if (aiConfigService != null) return aiConfigService.getEffectiveGeminiModel();
        return geminiModel;
    }

    private String getEffectiveOpenAiApiKey() {
        if (aiConfigService != null) return aiConfigService.getEffectiveOpenAiApiKey();
        return openAiApiKey;
    }

    private String getEffectiveOpenAiModel() {
        if (aiConfigService != null) return aiConfigService.getEffectiveOpenAiModel();
        return openAiModel;
    }

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    @Override
    public AiGenerateDescriptionResponse generateProductDescription(AiGenerateDescriptionRequest request) {
        String productName = request != null ? request.getEffectiveName() : "";
        if (!StringUtils.hasText(productName)) {
            throw new BadRequestException("Tên sản phẩm không được để trống");
        }
        String brand = request.getBrand();
        String categoryName = StringUtils.hasText(request.getCategoryName()) ? request.getCategoryName().trim() : "Thiết bị điện tử";
        Object specs = request.getSpecs();
        List<String> keywords = request.getKeywords();

        String prompt = buildPrompt(productName, brand, categoryName, specs, keywords);

        // 1. Thử gọi Google Gemini AI nếu có API Key
        String activeGeminiKey = getEffectiveGeminiApiKey();
        String activeGeminiModel = getEffectiveGeminiModel();
        if (StringUtils.hasText(activeGeminiKey) && !activeGeminiKey.equalsIgnoreCase("dummy") && !activeGeminiKey.startsWith("placeholder")) {
            log.info("Đang gọi Google Gemini AI Model [{}] để sinh mô tả SEO cho: {}", activeGeminiModel, productName);
            try {
                String geminiText = callGeminiApi(prompt);
                if (StringUtils.hasText(geminiText)) {
                    log.info("Google Gemini AI sinh mô tả SEO thành công cho: {}", productName);
                    return AiGenerateDescriptionResponse.builder()
                            .productName(productName)
                            .brand(brand)
                            .categoryName(categoryName)
                            .description(cleanMarkdownOutput(geminiText))
                            .seoTitle(generateSeoTitle(productName, brand, categoryName))
                            .seoKeywords(generateKeywords(productName, brand, categoryName, keywords))
                            .provider("GOOGLE_GEMINI (" + activeGeminiModel + ")")
                            .build();
                }
            } catch (Exception ex) {
                log.warn("Lỗi hoặc timeout khi gọi Gemini AI sinh mô tả: {}", ex.getMessage());
            }
        }

        // 2. Thử gọi Spring AI (OpenAI) nếu có cấu hình OpenAI
        String activeOpenAiKey = getEffectiveOpenAiApiKey();
        String activeOpenAiModel = getEffectiveOpenAiModel();
        if (StringUtils.hasText(activeOpenAiKey) && !activeOpenAiKey.equalsIgnoreCase("dummy") && !activeOpenAiKey.startsWith("sk-placeholder")) {
            try {
                log.info("Đang gọi Spring AI OpenAI Model [{}] để sinh mô tả SEO cho: {}", activeOpenAiModel, productName);
                OpenAiApi openAiApi = new OpenAiApi(activeOpenAiKey);
                OpenAiChatModel chatModel = new OpenAiChatModel(openAiApi);
                String aiGeneratedText = chatModel.call(prompt);

                if (StringUtils.hasText(aiGeneratedText)) {
                    log.info("Spring AI sinh mô tả SEO thành công cho: {}", productName);
                    return AiGenerateDescriptionResponse.builder()
                            .productName(productName)
                            .brand(brand)
                            .categoryName(categoryName)
                            .description(cleanMarkdownOutput(aiGeneratedText))
                            .seoTitle(generateSeoTitle(productName, brand, categoryName))
                            .seoKeywords(generateKeywords(productName, brand, categoryName, keywords))
                            .provider("SPRING_AI (" + activeOpenAiModel + ")")
                            .build();
                }
            } catch (Exception ex) {
                log.warn("Không thể kết nối Spring AI OpenAI ({}), chuyển sang bộ dự phòng: {}", ex.getMessage(), ex.getClass().getSimpleName());
            }
        }

        // 3. Chế độ sinh mô tả chuẩn SEO thông minh (Smart Fallback Generator) khi không có API Key hoặc gặp lỗi/timeout
        log.info("Sử dụng thuật toán sinh mô tả chuẩn SEO tự động cho: {}", productName);
        String fallbackDescription = generateSmartSeoDescription(productName, brand, categoryName, specs, keywords);

        return AiGenerateDescriptionResponse.builder()
                .productName(productName)
                .brand(brand)
                .categoryName(categoryName)
                .description(cleanMarkdownOutput(fallbackDescription))
                .seoTitle(generateSeoTitle(productName, brand, categoryName))
                .seoKeywords(generateKeywords(productName, brand, categoryName, keywords))
                .provider("SMART_SEO_ENGINE (Fallback)")
                .build();
    }

    @Override
    public AiChatResponse chatWithCustomer(AiChatRequest request) {
        String userMessage = request.getMessage().trim();

        // 1. Lấy danh sách sản phẩm thực tế đang kinh doanh từ cơ sở dữ liệu
        List<Product> allProducts = productRepository.findAll().stream()
                .filter(p -> p.getStatus() == null || !"INACTIVE".equalsIgnoreCase(p.getStatus()))
                .collect(Collectors.toList());

        // 2. RAG Context 1: Lọc nhanh sản phẩm liên quan (theo từ khóa, danh mục, ngân sách)
        // Giới hạn số lượng (tối đa 8 sản phẩm) để tiết kiệm token và tăng tốc độ xử lý trong 2-3s
        List<Product> relevantProducts = filterRelevantProducts(userMessage, allProducts);

        // 3. RAG Context 2: Truy xuất tri thức từ Knowledge Base (Chính sách, FAQ, hướng dẫn)
        List<String> relevantKnowledge = Collections.emptyList();
        boolean kbEnabled = aiConfigService == null || aiConfigService.isKnowledgeBaseEnabled();
        int topK = aiConfigService != null ? aiConfigService.getTopKChunks() : 3;
        if (kbEnabled) {
            try {
                relevantKnowledge = knowledgeBaseService.findRelevantChunks(userMessage, topK);
            } catch (Exception ex) {
                log.warn("Không thể truy xuất Knowledge Base: {}", ex.getMessage());
            }
        }

        // 4. Tạo Prompt nạp ngữ cảnh RAG đầy đủ
        String prompt = buildChatPrompt(userMessage, request.getHistory(), relevantProducts, relevantKnowledge);

        String replyText = null;
        String provider = "SMART_ASSISTANT (Local Engine)";

        String activeGeminiKey = getEffectiveGeminiApiKey();
        String activeGeminiModel = getEffectiveGeminiModel();
        String activeOpenAiKey = getEffectiveOpenAiApiKey();
        String activeOpenAiModel = getEffectiveOpenAiModel();

        // 5. Thử gọi Google Gemini AI (timeout 4s để đảm bảo cam kết trả lời 2-3 giây)
        if (StringUtils.hasText(activeGeminiKey) && !activeGeminiKey.equalsIgnoreCase("dummy") && !activeGeminiKey.startsWith("placeholder")) {
            log.info("Đang gọi Google Gemini AI Model [{}] để tư vấn sản phẩm cho khách...", activeGeminiModel);
            replyText = callGeminiApi(prompt);
            if (StringUtils.hasText(replyText)) {
                provider = "GOOGLE_GEMINI (" + activeGeminiModel + ")";
            }
        }

        // 6. Thử gọi Spring AI (OpenAI) nếu Gemini không khả dụng
        if (!StringUtils.hasText(replyText) && StringUtils.hasText(activeOpenAiKey) && !activeOpenAiKey.equalsIgnoreCase("dummy")) {
            try {
                log.info("Đang gọi Spring AI OpenAI Model [{}] để tư vấn sản phẩm...", activeOpenAiModel);
                OpenAiApi openAiApi = new OpenAiApi(activeOpenAiKey);
                OpenAiChatModel chatModel = new OpenAiChatModel(openAiApi);
                replyText = chatModel.call(prompt);
                if (StringUtils.hasText(replyText)) {
                    provider = "SPRING_AI (" + activeOpenAiModel + ")";
                }
            } catch (Exception ex) {
                log.warn("Gọi Spring AI thất bại: {}", ex.getMessage());
            }
        }

        // 7. Fallback thông minh nếu không có kết nối AI bên ngoài hoặc API timeout
        if (!StringUtils.hasText(replyText)) {
            log.info("Sử dụng Smart Fallback Assistant để trả lời khách hàng.");
            return generateSmartChatFallback(userMessage, relevantProducts.isEmpty() ? allProducts : relevantProducts);
        }

        // 8. Trích xuất danh sách sản phẩm được AI đề xuất để hiển thị Product Card
        boolean suggestEnabled = aiConfigService == null || aiConfigService.isSuggestProductsEnabled();
        int maxProducts = aiConfigService != null ? aiConfigService.getMaxSuggestedProducts() : 3;

        List<ProductResponse> recommended = Collections.emptyList();
        if (suggestEnabled) {
            recommended = extractRecommendedProducts(replyText, userMessage, allProducts);
            if (recommended.isEmpty() && !relevantProducts.isEmpty()) {
                recommended = relevantProducts.stream().limit(maxProducts).map(productMapper::toResponse).collect(Collectors.toList());
            } else if (recommended.size() > maxProducts) {
                recommended = recommended.subList(0, maxProducts);
            }
        }

        return AiChatResponse.builder()
                .reply(replyText.trim())
                .suggestedProducts(recommended)
                .recommendedProducts(recommended)
                .provider(provider)
                .build();
    }

    private List<Product> filterRelevantProducts(String userMessage, List<Product> products) {
        if (products.isEmpty()) return Collections.emptyList();

        String normQuery = normalizeText(userMessage);

        boolean isMacBook = normQuery.contains("macbook") || normQuery.contains("mac book") || normQuery.contains("m3") || normQuery.contains("m2") || normQuery.contains("m1") || normQuery.contains("apple silicon");
        boolean isLaptop = isMacBook || normQuery.contains("laptop") || normQuery.contains("dell") || normQuery.contains("xps") ||
                normQuery.contains("asus") || normQuery.contains("zenbook") || normQuery.contains("legion") || normQuery.contains("lenovo") ||
                normQuery.contains("thinkpad") || normQuery.contains("may tinh xach tay") || normQuery.contains("gaming") || normQuery.contains("do hoa");
        boolean isPhone = normQuery.contains("dien thoai") || normQuery.contains("smartphone") || normQuery.contains("iphone") ||
                normQuery.contains("samsung") || normQuery.contains("galaxy") || normQuery.contains("xiaomi") || normQuery.contains("phone");
        boolean isTablet = normQuery.contains("ipad") || normQuery.contains("tablet") || normQuery.contains("may tinh bang");
        boolean isAudio = normQuery.contains("tai nghe") || normQuery.contains("headphone") || normQuery.contains("airpods") ||
                normQuery.contains("loa") || normQuery.contains("am thanh") || normQuery.contains("sony");

        Long budgetMax = extractBudgetMax(normQuery);

        Set<String> stopWords = Set.of("tu", "van", "cho", "minh", "toi", "can", "mua", "xem", "gia", "co", "khong", "re", "nao", "tot", "nhat", "a", "em", "anh", "chi", "shop", "dong", "loai");
        List<String> keywords = Arrays.stream(normQuery.split("\\s+"))
                .filter(w -> w.length() >= 2 && !stopWords.contains(w))
                .collect(Collectors.toList());

        Map<Product, Integer> scoreMap = new HashMap<>();
        for (Product p : products) {
            int score = 0;
            String pNormName = normalizeText(p.getName());
            String pNormDesc = normalizeText(p.getDescription());
            String pNormCat = p.getCategory() != null ? normalizeText(p.getCategory().getName()) : "";

            if (isMacBook && pNormName.contains("macbook")) score += 300;
            else if (isLaptop && pNormCat.contains("laptop")) score += 150;
            else if (isPhone && pNormCat.contains("dien thoai")) score += 150;
            else if (isTablet && pNormCat.contains("may tinh bang")) score += 150;
            else if (isAudio && pNormCat.contains("am thanh")) score += 150;

            for (String kw : keywords) {
                if (pNormName.contains(kw)) score += 40;
                else if (pNormDesc.contains(kw)) score += 10;
            }

            if (budgetMax != null && p.getPrice() != null) {
                if (p.getPrice().longValue() <= budgetMax) {
                    score += 60;
                }
            }

            if (score > 0) {
                scoreMap.put(p, score);
            }
        }

        if (!scoreMap.isEmpty()) {
            return scoreMap.entrySet().stream()
                    .sorted(Map.Entry.<Product, Integer>comparingByValue().reversed())
                    .limit(8)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());
        }

        return products.stream().limit(6).collect(Collectors.toList());
    }

    private Long extractBudgetMax(String normQuery) {
        Pattern p = Pattern.compile("(?:duoi|tam|khoang|duoi\\s+tam)?\\s*(\\d+)(?:\\s*tr|\\s*trieu)");
        Matcher m = p.matcher(normQuery);
        if (m.find()) {
            try {
                long val = Long.parseLong(m.group(1));
                return val * 1_000_000L;
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private String buildChatPrompt(String userMessage, List<ChatMessageDto> history, List<Product> products, List<String> knowledge) {
        StringBuilder sb = new StringBuilder();
        if (aiConfigService != null && StringUtils.hasText(aiConfigService.getSystemPrompt())) {
            sb.append(aiConfigService.getSystemPrompt()).append("\n\n");
        } else {
            sb.append("Bạn là 'NEXOR AI Assistant' - Chuyên viên tư vấn bán hàng công nghệ thông minh, nhiệt tình và am hiểu sản phẩm của website thương mại điện tử NEXOR.\n\n");
        }

        sb.append("=== CHÍNH SÁCH BÁN HÀNG CỦA NEXOR ===\n");
        sb.append("- Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000đ.\n");
        sb.append("- Bảo hành chính hãng 12 đến 24 tháng theo từng sản phẩm, 1 đổi 1 trong 30 ngày nếu phát sinh lỗi nhà sản xuất.\n");
        sb.append("- Hỗ trợ trả góp 0% lãi suất, giao hàng hỏa tốc trong 2 giờ tại nội thành.\n\n");

        if (knowledge != null && !knowledge.isEmpty()) {
            sb.append("=== TÀI LIỆU TRI THỨC VÀ CHÍNH SÁCH CỬA HÀNG (KNOWLEDGE BASE) ===\n");
            for (String k : knowledge) {
                sb.append("- ").append(k).append("\n");
            }
            sb.append("\n");
        }

        sb.append("=== DANH SÁCH SẢN PHẨM PHÙ HỢP CỬA HÀNG ĐANG BÁN (DỮ LIỆU THỰC TẾ) ===\n");
        Locale vn = Locale.forLanguageTag("vi-VN");
        NumberFormat nf = NumberFormat.getInstance(vn);

        for (Product p : products) {
            String priceStr = p.getPrice() != null ? nf.format(p.getPrice()) + "đ" : "Liên hệ";
            String catName = p.getCategory() != null ? p.getCategory().getName() : "Thiết bị điện tử";
            String desc = p.getDescription() != null ? p.getDescription().replaceAll("\\s+", " ").trim() : "";
            if (desc.length() > 120) {
                desc = desc.substring(0, 120) + "...";
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
            int startIdx = Math.max(0, history.size() - 6);
            for (int i = startIdx; i < history.size(); i++) {
                ChatMessageDto msg = history.get(i);
                String roleName = "user".equalsIgnoreCase(msg.getRole()) ? "Khách hàng" : "Trợ lý NEXOR";
                sb.append(roleName).append(": ").append(msg.getContent()).append("\n");
            }
            sb.append("\n");
        }

        sb.append("CÂU HỎI MỚI CỦA KHÁCH HÀNG:\n").append(userMessage);
        return sb.toString();
    }

    private List<ProductResponse> extractRecommendedProducts(String replyText, String userMessage, List<Product> products) {
        Set<Long> foundIds = new LinkedHashSet<>();

        Pattern pattern = Pattern.compile("\\[ID:\\s*(\\d+)\\]", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(replyText);
        while (matcher.find()) {
            try {
                foundIds.add(Long.parseLong(matcher.group(1)));
            } catch (NumberFormatException ignored) {}
        }

        if (foundIds.isEmpty()) {
            for (Product p : products) {
                if (replyText.toLowerCase().contains(p.getName().toLowerCase())) {
                    foundIds.add(p.getId());
                    if (foundIds.size() >= 4) break;
                }
            }
        }

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

    private String normalizeText(String input) {
        if (!StringUtils.hasText(input)) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        return Pattern.compile("\\p{InCombiningDiacriticalMarks}+")
                .matcher(normalized)
                .replaceAll("")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase()
                .trim();
    }

    private AiChatResponse generateSmartChatFallback(String userMessage, List<Product> products) {
        String rawQuery = userMessage.trim();
        String normQuery = normalizeText(rawQuery);
        Locale vn = Locale.forLanguageTag("vi-VN");
        NumberFormat nf = NumberFormat.getInstance(vn);

        // 1. Ý định chào hỏi thân thiện
        if (normQuery.equals("chao") || normQuery.startsWith("xin chao") || normQuery.contains("chao ban") ||
                normQuery.contains("chao shop") || normQuery.equals("hello") || normQuery.equals("hi") ||
                normQuery.startsWith("hi ") || normQuery.contains("alo") || normQuery.contains("oi shop") ||
                normQuery.equals("oi")) {
            List<Product> topFeatured = products.stream().limit(3).collect(Collectors.toList());
            String greetingReply = "Dạ em chào anh/chị ạ! 👋 Em là **NEXOR AI** — chuyên viên tư vấn công nghệ 24/7 của shop.\n\n" +
                    "Anh/chị đang quan tâm đến dòng sản phẩm nào để em tư vấn thông số và ưu đãi tốt nhất ạ?\n" +
                    "- 💻 **Laptop**: MacBook Air/Pro, Dell XPS, ASUS Gaming, Lenovo Legion\n" +
                    "- 📱 **Điện thoại**: iPhone 16/15 Pro Max, Samsung Galaxy S24 Ultra, ROG Phone\n" +
                    "- 🎧 **Âm thanh & Phụ kiện**: Tai nghe chống ồn, loa Bluetooth cao cấp\n" +
                    "- 🛡️ **Chính sách**: 100% chính hãng, bảo hành 12-24 tháng, miễn phí vận chuyển toàn quốc.\n\n" +
                    "Dưới đây là một số mẫu máy tiêu biểu đang được yêu thích nhất tại cửa hàng:";
            List<ProductResponse> featuredResp = topFeatured.stream().map(productMapper::toResponse).collect(Collectors.toList());
            return AiChatResponse.builder()
                    .reply(greetingReply)
                    .suggestedProducts(featuredResp)
                    .recommendedProducts(featuredResp)
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 2. Ý định hỏi về chính sách bảo hành / đổi trả
        if (normQuery.contains("bao hanh") || normQuery.contains("doi tra") || normQuery.contains("hong") || normQuery.contains("loi")) {
            String warrantyReply = "🛡️ **Chính sách bảo hành vàng tại NEXOR:**\n\n" +
                    "- **100% Hàng chính hãng**: Toàn bộ sản phẩm phân phối đều là hàng chính ngạch nguyên seal, đầy đủ hóa đơn VAT.\n" +
                    "- **1 Đổi 1 trong 30 ngày**: Nếu sản phẩm phát sinh lỗi phần cứng do nhà sản xuất, shop đổi ngay máy mới 100% không phát sinh chi phí.\n" +
                    "- **Thời hạn bảo hành**: Từ 12 đến 24 tháng theo đúng tiêu chuẩn khắt khe của hãng (Apple, Samsung, Asus, Dell, Sony).\n" +
                    "- **Trung tâm bảo hành toàn quốc**: Quý khách có thể mang máy trực tiếp tới các trung tâm bảo hành ủy quyền của hãng trên cả nước hoặc gửi qua shop hỗ trợ miễn phí!\n" +
                    "- **Hỗ trợ trọn đời**: Miễn phí cài đặt phần mềm bản quyền, vệ sinh máy và hỗ trợ kỹ thuật 24/7.";
            List<ProductResponse> wResp = products.stream().limit(2).map(productMapper::toResponse).collect(Collectors.toList());
            return AiChatResponse.builder()
                    .reply(warrantyReply)
                    .suggestedProducts(wResp)
                    .recommendedProducts(wResp)
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 3. Ý định hỏi về vận chuyển / giao hàng
        if (normQuery.contains("van chuyen") || normQuery.contains("giao hang") || normQuery.contains("ship") || normQuery.contains("freeship") || normQuery.contains("hoa toc")) {
            String shipReply = "🚚 **Chính sách vận chuyển & Giao hàng tại NEXOR:**\n\n" +
                    "- **Miễn phí giao hàng toàn quốc**: Áp dụng cho mọi đơn hàng có giá trị từ **500.000đ** trở lên.\n" +
                    "- **Giao hỏa tốc 2 giờ**: Khu vực nội thành Hà Nội & TP. Hồ Chí Minh nhận hàng ngay trong ngày.\n" +
                    "- **Đồng kiểm khi nhận (COD)**: Quý khách được quyền mở hộp kiểm tra đúng model, ngoại quan nguyên vẹn trước khi thanh toán.\n" +
                    "- **Đóng gói chuẩn công nghệ**: Thùng carton 5 lớp kèm túi khí chống sốc và dán niêm phong an toàn tuyệt đối.";
            List<ProductResponse> sResp = products.stream().limit(2).map(productMapper::toResponse).collect(Collectors.toList());
            return AiChatResponse.builder()
                    .reply(shipReply)
                    .suggestedProducts(sResp)
                    .recommendedProducts(sResp)
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 4. Ý định hỏi về trả góp / khuyến mãi
        if (normQuery.contains("tra gop") || normQuery.contains("khuyen mai") || normQuery.contains("uu dai") || normQuery.contains("giam gia") || normQuery.contains("sale")) {
            String promoReply = "🎁 **Chương trình khuyến mãi & Hỗ trợ trả góp tại NEXOR:**\n\n" +
                    "- **Trả góp 0% lãi suất**: Hỗ trợ qua thẻ tín dụng hơn 25 ngân hàng hoặc duyệt hồ sơ online qua CCCD chỉ mất 10-15 phút.\n" +
                    "- **Flash Sale mỗi ngày**: Giảm sâu đến 30% cho các sản phẩm công nghệ hot nhất.\n" +
                    "- **Ưu đãi Học sinh - Sinh viên**: Tặng thêm voucher giảm giá 500.000đ khi mua laptop hoặc máy tính bảng.\n" +
                    "- **Thu cũ đổi mới (Trade-in)**: Trợ giá thu mua máy cũ lên đến 2.000.000đ để quý khách lên đời máy mới tiết kiệm nhất!";
            List<ProductResponse> pResp = products.stream().limit(3).map(productMapper::toResponse).collect(Collectors.toList());
            return AiChatResponse.builder()
                    .reply(promoReply)
                    .suggestedProducts(pResp)
                    .recommendedProducts(pResp)
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 5. Tìm kiếm theo danh mục và từ khóa
        List<Product> matched = filterRelevantProducts(rawQuery, products);

        StringBuilder reply = new StringBuilder();
        reply.append("Dạ chào anh/chị! 👋 NEXOR rất vui được hỗ trợ.\n\n");

        if (!matched.isEmpty()) {
            reply.append("Dưới đây là các mẫu sản phẩm chính hãng phù hợp nhất với nhu cầu của anh/chị:\n\n");
            for (Product p : matched) {
                String priceStr = p.getPrice() != null ? nf.format(p.getPrice()) + "đ" : "Liên hệ";
                reply.append(String.format("🔹 **%s [ID: %d]**\n", p.getName(), p.getId()));
                reply.append(String.format("   - **Giá ưu đãi:** %s\n", priceStr));
                if (StringUtils.hasText(p.getDescription())) {
                    reply.append(String.format("   - **Đặc điểm:** %s\n", p.getDescription().trim()));
                }
                reply.append("\n");
            }
            reply.append("🌟 **Đặc quyền tại NEXOR:**\n");
            reply.append("- Miễn phí vận chuyển toàn quốc cho đơn từ 500.000đ 🚚\n");
            reply.append("- Bảo hành chính hãng 12 - 24 tháng, 1 đổi 1 trong 30 ngày 🛡️\n\n");
            reply.append("Anh/chị hãy bấm vào thẻ sản phẩm bên dưới để xem chi tiết thông số hoặc nhắn thêm nếu cần em tư vấn thêm nhé! 😊");
        } else {
            reply.append("Hiện tại NEXOR chưa tìm thấy sản phẩm khớp hoàn toàn với từ khóa của anh/chị. Dưới đây là các dòng sản phẩm tiêu biểu đang bán chạy nhất tại cửa hàng:\n\n");
            for (Product p : products.stream().limit(3).collect(Collectors.toList())) {
                String priceStr = p.getPrice() != null ? nf.format(p.getPrice()) + "đ" : "Liên hệ";
                reply.append(String.format("🔹 **%s [ID: %d]** (Giá: %s)\n", p.getName(), p.getId(), priceStr));
            }
            reply.append("\nAnh/chị có thể mô tả cụ thể hơn về khoảng ngân sách hoặc dòng máy mong muốn để em gợi ý chính xác nhất nhé! ✨");
        }

        List<ProductResponse> recommended = matched.stream()
                .limit(4)
                .map(productMapper::toResponse)
                .collect(Collectors.toList());

        return AiChatResponse.builder()
                .reply(reply.toString())
                .suggestedProducts(recommended)
                .recommendedProducts(recommended)
                .provider("NEXOR AI Assistant")
                .build();
    }

    private String callGeminiApi(String prompt) {
        String effectiveKey = getEffectiveGeminiApiKey();
        String effectiveModel = getEffectiveGeminiModel();
        if (!StringUtils.hasText(effectiveKey)) return null;

        String[] candidateModels = new String[]{
                effectiveModel,
                "gemini-1.5-flash",
                "gemini-2.0-flash",
                "gemini-2.5-flash"
        };

        for (String model : candidateModels) {
            if (!StringUtils.hasText(model)) continue;
            try {
                String url = String.format("%s/%s:generateContent?key=%s", geminiApiUrl, model.trim(), effectiveKey.trim());
                Map<String, Object> part = Map.of("text", prompt);
                Map<String, Object> content = Map.of("parts", List.of(part));
                Map<String, Object> requestPayload = Map.of("contents", List.of(content));

                String requestBody = objectMapper.writeValueAsString(requestPayload);

                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(4)) // 4s timeout để phản hồi người dùng không vượt quá 2-3s
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

    public String cleanMarkdownOutput(String text) {
        if (!StringUtils.hasText(text)) {
            return "";
        }
        String cleaned = text.trim();

        // Bỏ code block bắt đầu (`markdown, `md, `)
        if (cleaned.startsWith("`")) {
            int firstNewline = cleaned.indexOf('\n');
            if (firstNewline != -1) {
                cleaned = cleaned.substring(firstNewline + 1).trim();
            } else {
                cleaned = cleaned.replaceFirst("^`[a-zA-Z]*", "").trim();
            }
        }

        // Bỏ code block kết thúc (`)
        if (cleaned.endsWith("`")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3).trim();
        }

        return cleaned;
    }

    private String formatSpecs(Object specs) {
        if (specs == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();

        if (specs instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() != null && entry.getValue() != null) {
                    sb.append("- **").append(entry.getKey().toString().trim()).append("**: ")
                            .append(entry.getValue().toString().trim()).append("\n");
                }
            }
        } else if (specs instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> itemMap) {
                    Object key = itemMap.containsKey("key") ? itemMap.get("key") : itemMap.get("specKey");
                    Object val = itemMap.containsKey("value") ? itemMap.get("value") : itemMap.get("specValue");
                    Object group = itemMap.containsKey("group") ? itemMap.get("group") : itemMap.get("groupName");
                    if (key != null && val != null) {
                        if (group != null && StringUtils.hasText(group.toString())) {
                            sb.append("- **[").append(group.toString().trim()).append("] ")
                                    .append(key.toString().trim()).append("**: ")
                                    .append(val.toString().trim()).append("\n");
                        } else {
                            sb.append("- **").append(key.toString().trim()).append("**: ")
                                    .append(val.toString().trim()).append("\n");
                        }
                    } else {
                        sb.append("- ").append(itemMap).append("\n");
                    }
                } else if (item != null && StringUtils.hasText(item.toString())) {
                    sb.append("- ").append(item.toString().trim()).append("\n");
                }
            }
        } else if (specs instanceof String str && StringUtils.hasText(str)) {
            sb.append(str.trim()).append("\n");
        }

        return sb.toString().trim();
    }

    private String buildPrompt(String productName, String brand, String categoryName, Object specs, List<String> keywords) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là chuyên gia Content Marketing & SEO Thương Mại Điện Tử hàng đầu.\n");
        sb.append("Hãy viết bài mô tả sản phẩm hấp dẫn, chuẩn kỹ thuật, tối ưu hóa SEO cho sản phẩm sau:\n");
        sb.append("- Tên sản phẩm: ").append(productName).append("\n");
        if (StringUtils.hasText(brand)) {
            sb.append("- Thương hiệu: ").append(brand.trim()).append("\n");
        }
        sb.append("- Danh mục: ").append(categoryName).append("\n");

        String formattedSpecs = formatSpecs(specs);
        if (StringUtils.hasText(formattedSpecs)) {
            sb.append("- Thông số kỹ thuật chi tiết:\n").append(formattedSpecs).append("\n");
        }

        if (keywords != null && !keywords.isEmpty()) {
            sb.append("- Từ khóa SEO trọng tâm: ").append(String.join(", ", keywords)).append("\n");
        }

        sb.append("\n--- YÊU CẦU ĐỊNH DẠNG ĐẦU RA BẮT BUỘC ---\n");
        sb.append("Chỉ trả về nội dung Markdown thuần túy (tuyệt đối KHÔNG bọc trong khối code block `markdown hoặc `).\n");
        sb.append("Cấu trúc bài viết phải bao gồm chính xác 4 phần sau:\n\n");
        sb.append("### 1. Tiêu đề\n");
        sb.append("Tiêu đề hấp dẫn, chứa tên sản phẩm và điểm nhấn công nghệ, kèm đoạn giới thiệu mở đầu 2-3 câu lôi cuốn.\n\n");
        sb.append("### 2. Điểm nổi bật\n");
        sb.append("Trình bày từ 3-5 gạch đầu dòng (bullet points) nêu bật công nghệ đột phá, thiết kế, hiệu năng và trải nghiệm sử dụng thực tế.\n\n");
        sb.append("### 3. Thông số kỹ thuật\n");
        sb.append("Liệt kê đầy đủ, chính xác các thông số kỹ thuật (dựa trên thông số cung cấp).\n\n");
        sb.append("### 4. Đối tượng phù hợp\n");
        sb.append("Phân tích rõ sản phẩm phù hợp nhất với nhóm khách hàng nào (học sinh, sinh viên, dân văn phòng, game thủ, sáng tạo nội dung...) kèm cam kết chất lượng, bảo hành chính hãng tại NEXOR.\n");
        return sb.toString();
    }

    private String generateSmartSeoDescription(String productName, String brand, String categoryName, Object specs, List<String> keywords) {
        String brandPrefix = StringUtils.hasText(brand) ? (" từ thương hiệu danh tiếng **" + brand.trim() + "**") : "";
        String keywordStr = (keywords != null && !keywords.isEmpty()) ? String.join(", ", keywords) : "công nghệ tiên tiến, thiết kế đẳng cấp";
        String specsBlock = formatSpecs(specs);
        if (!StringUtils.hasText(specsBlock)) {
            specsBlock = "- **Thương hiệu**: " + (StringUtils.hasText(brand) ? brand.trim() : "Chính hãng") + "\n" +
                    "- **Phân khúc**: " + categoryName + "\n" +
                    "- **Tính năng chính**: Tối ưu hiệu năng, tiết kiệm điện năng, kết nối thông minh\n" +
                    "- **Bảo hành**: 12 tháng chính hãng 1 đổi 1";
        }

        return String.format(
                "## %s – Đỉnh Cao Công Nghệ, Trải Nghiệm Hoàn Mỹ\n\n" +
                "**%s**%s là sự kết hợp hoàn hảo giữa ngôn ngữ thiết kế thời thượng và hiệu năng vượt bậc trong phân khúc **%s**. " +
                "Sở hữu độ hoàn thiện cao cấp cùng độ bền bỉ đáng tin cậy, sản phẩm mang lại trải nghiệm đỉnh cao cho cả nhu cầu công việc lẫn giải trí thường ngày.\n\n" +
                "### Điểm nổi bật vượt trội\n" +
                "- **Hiệu năng bứt phá**: Tối ưu hóa xử lý mượt mà, phản hồi tức thì với tốc độ ấn tượng.\n" +
                "- **Trải nghiệm đỉnh cao**: Tích hợp các tính năng công nghệ thông minh (%s) nâng tầm tiện ích.\n" +
                "- **Thiết kế sang trọng**: Kiểu dáng hiện đại, gia công tỉ mỉ, vật liệu cao cấp và an toàn tuyệt đối.\n" +
                "- **Tiết kiệm năng lượng**: Tối ưu thời lượng sử dụng bền bỉ suốt cả ngày dài.\n\n" +
                "### Thông số kỹ thuật\n" +
                "%s\n\n" +
                "### Đối tượng phù hợp\n" +
                "Sản phẩm là lựa chọn lý tưởng dành cho người dùng cá nhân, học sinh, sinh viên và giới chuyên môn cần một thiết bị bền bỉ, mạnh mẽ và thời trang. " +
                "Được phân phối chính hãng tại NEXOR với cam kết 100%% New Seal, bảo hành 12 tháng 1 đổi 1 và hỗ trợ giao hàng hỏa tốc toàn quốc.",
                productName, productName, brandPrefix, categoryName, keywordStr, specsBlock
        );
    }

    private String generateSeoTitle(String productName, String brand, String categoryName) {
        if (StringUtils.hasText(brand)) {
            return String.format("%s %s - Chính Hãng, Giá Tốt Nhất Phân Khúc %s | NEXOR", brand.trim(), productName, categoryName);
        }
        return String.format("%s - Chính Hãng, Giá Tốt Nhất Phân Khúc %s | NEXOR", productName, categoryName);
    }

    private String generateKeywords(String productName, String brand, String categoryName, List<String> keywords) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(brand)) {
            sb.append(brand.trim().toLowerCase()).append(", ");
        }
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
