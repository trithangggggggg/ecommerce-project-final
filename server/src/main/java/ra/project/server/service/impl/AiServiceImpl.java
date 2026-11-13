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
import org.springframework.web.multipart.MultipartFile;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.request.AiChatRequest;
import ra.project.server.model.dto.request.AiGenerateArticleRequest;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.request.ChatMessageDto;
import ra.project.server.model.dto.response.AiChatResponse;
import ra.project.server.model.dto.response.AiGenerateArticleResponse;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.dto.response.VisualSearchResponse;
import ra.project.server.model.entity.Product;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.AiConfigService;
import ra.project.server.service.AiService;
import ra.project.server.service.AiVisualSearchService;
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

    private static final Pattern BUDGET_PATTERN = Pattern.compile("(?:duoi(?:\\s+tam)?|tam|khoang)?\\s*(\\d+)\\s*(?:tr|trieu)\\b");

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;
    private final KnowledgeBaseService knowledgeBaseService;

    @Autowired(required = false)
    private AiVisualSearchService aiVisualSearchService;

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
    public AiGenerateArticleResponse generateArticleContent(AiGenerateArticleRequest request) {
        String title = request != null && StringUtils.hasText(request.getTitle()) ? request.getTitle().trim() : "";
        if (!StringUtils.hasText(title)) {
            throw new BadRequestException("Tiêu đề bài viết không được để trống");
        }
        String category = request != null && StringUtils.hasText(request.getCategory()) ? request.getCategory().trim() : "Công nghệ";
        String summary = request != null && StringUtils.hasText(request.getSummary()) ? request.getSummary().trim() : "";

        String prompt = "Bạn là chuyên gia biên tập tin tức và đánh giá công nghệ hàng đầu cho NEXOR Flagship Tech Store. "
                + "Hãy viết một bài viết chuyên sâu, chuẩn SEO, định dạng HTML phong phú (hỗ trợ trực tiếp cho trình soạn thảo CKEditor 5) "
                + "dựa trên các thông tin sau:\n"
                + "- Tiêu đề bài viết: " + title + "\n"
                + "- Chuyên mục: " + category + "\n"
                + (StringUtils.hasText(summary) ? "- Tóm tắt ban đầu: " + summary + "\n" : "")
                + "\nYêu cầu cấu trúc bài viết:\n"
                + "1. Mở đầu hấp dẫn, nêu bật xu hướng và bối cảnh công nghệ mới nhất.\n"
                + "2. Sử dụng đúng các thẻ HTML: <h2> cho từng phần chính, <h3> cho các mục con, <p> cho đoạn văn, <ul><li> cho danh sách điểm nổi bật / thông số kỹ thuật, <blockquote> cho nhận xét chuyên gia, <strong> để nhấn mạnh.\n"
                + "3. Cuối bài có phần Đánh giá & Lời khuyên (Kết luận) phù hợp với người dùng / người mua sắm.\n"
                + "4. Chỉ trả về trực tiếp mã HTML cho phần nội dung (KHÔNG bọc trong thẻ ```html ``` hay <html><body>).";

        String activeGeminiKey = getEffectiveGeminiApiKey();
        String activeGeminiModel = getEffectiveGeminiModel();
        if (StringUtils.hasText(activeGeminiKey) && !activeGeminiKey.equalsIgnoreCase("dummy") && !activeGeminiKey.startsWith("placeholder")) {
            log.info("Đang gọi Google Gemini AI Model [{}] để sinh nội dung bài viết: {}", activeGeminiModel, title);
            try {
                String geminiText = callGeminiApi(prompt);
                if (StringUtils.hasText(geminiText)) {
                    String cleanContent = cleanHtmlOutput(geminiText);
                    String generatedSummary = StringUtils.hasText(summary) ? summary : generateSmartSummary(title, category);
                    return AiGenerateArticleResponse.builder()
                            .title(title)
                            .summary(generatedSummary)
                            .content(cleanContent)
                            .provider("GOOGLE_GEMINI (" + activeGeminiModel + ")")
                            .build();
                }
            } catch (Exception ex) {
                log.warn("Lỗi khi gọi Gemini AI tạo bài viết: {}", ex.getMessage());
            }
        }

        // Smart Fallback
        String fallbackContent = generateSmartArticleHtml(title, category);
        String fallbackSummary = StringUtils.hasText(summary) ? summary : generateSmartSummary(title, category);

        return AiGenerateArticleResponse.builder()
                .title(title)
                .summary(fallbackSummary)
                .content(fallbackContent)
                .provider("SMART_TECH_WRITER (Fallback)")
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
        Matcher m = BUDGET_PATTERN.matcher(normQuery);
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
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                log.warn("Gọi Gemini API (model {}) bị gián đoạn: {}", model, ex.getMessage());
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

    public String cleanHtmlOutput(String text) {
        if (!StringUtils.hasText(text)) {
            return "";
        }
        String cleaned = text.trim();
        if (cleaned.startsWith("```html")) {
            cleaned = cleaned.substring(7).trim();
        } else if (cleaned.startsWith("```")) {
            int firstNewline = cleaned.indexOf('\n');
            if (firstNewline != -1) {
                cleaned = cleaned.substring(firstNewline + 1).trim();
            }
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3).trim();
        }
        return cleaned;
    }

    public String generateSmartSummary(String title, String category) {
        String lower = (title + " " + category).toLowerCase();
        if (lower.contains("so sánh") || lower.contains(" vs ") || lower.contains("đối đầu") || lower.contains("kèo")) {
            return "Phân tích chi tiết cuộc đối đầu công nghệ trong bài viết '" + title + "'. Đâu là sự lựa chọn tối ưu cho nhu cầu thực tế và ngân sách của bạn?";
        }
        if (lower.contains("mẹo") || lower.contains("thủ thuật") || lower.contains("cách ") || lower.contains("hướng dẫn") || lower.contains("tối ưu")) {
            return "Tổng hợp các thủ thuật và hướng dẫn thiết thực nhất về " + title + " giúp bạn làm chủ thiết bị, nâng cao hiệu suất và kéo dài tuổi thọ phần cứng.";
        }
        if (lower.contains("macbook") || lower.contains("laptop") || lower.contains("máy tính") || lower.contains("gaming")) {
            return "Đánh giá chuyên sâu " + title + " từ hiệu năng CPU/GPU, màn hình hiển thị đến khả năng tản nhiệt thực tế cho lập trình viên, designer và game thủ.";
        }
        if (lower.contains("iphone") || lower.contains("samsung") || lower.contains("galaxy") || lower.contains("điện thoại") || lower.contains("phone")) {
            return "Trải nghiệm thực tế " + title + " với những đánh giá khách quan về cụm camera, thời lượng pin, độ mượt mà của hệ điều hành và giá trị sở hữu.";
        }
        if (lower.contains("tai nghe") || lower.contains("loa") || lower.contains("âm thanh") || lower.contains("airpods") || lower.contains("sony")) {
            return "Cảm nhận chất âm chân thực và hiệu quả chống ồn của " + title + ". Góc nhìn chuyên sâu từ chuyên gia âm thanh tại NEXOR Flagship Store.";
        }
        if (lower.contains("ai") || lower.contains("trí tuệ nhân tạo") || lower.contains("agent") || lower.contains("xu hướng")) {
            return "Khám phá làn sóng công nghệ đột phá trong bài viết " + title + ". Cập nhật xu hướng AI thế hệ mới và ứng dụng thực tiễn trong công việc số.";
        }
        return "Khám phá bài viết chuyên sâu về " + title + " thuộc chuyên mục " + category
                + ". Đánh giá chi tiết ưu điểm, hiệu năng thực tế và tư vấn trải nghiệm tối ưu tại hệ thống NEXOR.";
    }

    public String generateSmartArticleHtml(String title, String category) {
        String lower = (title + " " + (category != null ? category : "")).toLowerCase();

        // 1. Dạng bài SO SÁNH / ĐỐI ĐẦU
        if (lower.contains("so sánh") || lower.contains(" vs ") || lower.contains("đối đầu") || lower.contains("kèo")) {
            return "<h2>1. Đặt lên bàn cân: Cuộc đối đầu giữa hai biểu tượng công nghệ</h2>\n"
                    + "<p>Thị trường công nghệ cao cấp luôn chứng kiến sự cạnh tranh khốc liệt giữa các ông lớn. Trong bài viết <strong>" + title + "</strong> hôm nay, chúng ta cùng phân tích chi tiết từng khía cạnh để tìm ra đâu là sự lựa chọn chân ái cho nhu cầu thực tế của bạn.</p>\n\n"
                    + "<h2>2. Ngôn ngữ thiết kế & Trải nghiệm cầm nắm thực tế</h2>\n"
                    + "<p>Mỗi thiết bị đều theo đuổi một triết lý thẩm mỹ và vật liệu chế tác riêng biệt:</p>\n"
                    + "<ul>\n"
                    + "  <li><strong>Chất liệu và độ hoàn thiện:</strong> Sử dụng khung viền kim loại cao cấp kết hợp mặt kính cường lực chống trầy xước, mang lại cảm giác sang trọng và đầm tay.</li>\n"
                    + "  <li><strong>Màn hình hiển thị:</strong> Tần số quét cao thích ứng cùng độ sáng đỉnh vượt trội, đảm bảo hiển thị sắc nét ngay cả dưới ánh nắng gắt trực tiếp.</li>\n"
                    + "</ul>\n\n"
                    + "<h2>3. Đọ sức hiệu năng & Khả năng xử lý tác vụ nặng</h2>\n"
                    + "<p>Khi đặt cả hai vào các bài kiểm tra áp lực từ render video, chơi game 3D đồ họa cao đến đa nhiệm liên tục, sự khác biệt về kiến trúc chip và tối ưu hóa hệ điều hành bắt đầu bộc lộ rõ rệt.</p>\n"
                    + "<blockquote>\n"
                    + "  <p>Một thiết bị vượt trội về độ ổn định mượt mà lâu dài, trong khi đối thủ lại chiếm ưu thế về khả năng đa nhiệm linh hoạt và các tính năng thông minh.</p>\n"
                    + "</blockquote>\n\n"
                    + "<h2>4. Thời lượng pin, tốc độ sạc & Hệ sinh thái</h2>\n"
                    + "<p>Khả năng duy trì liên lạc suốt ngày dài và hệ sinh thái phụ kiện đồng bộ đi kèm là yếu tố quyết định sự gắn bó lâu dài của người dùng với sản phẩm.</p>\n\n"
                    + "<h2>5. Kết luận: Đâu là thiết bị xứng đáng xuống tiền?</h2>\n"
                    + "<p>Tùy thuộc vào thói quen sử dụng và hệ sinh thái sẵn có của bạn, cả hai đều là những cỗ máy xuất sắc nhất phân khúc. Hãy ghé ngay showroom <strong>NEXOR Flagship Store</strong> để trực tiếp cầm trên tay và đưa ra lựa chọn phù hợp nhất!</p>";
        }

        // 2. Dạng bài THỦ THUẬT / MẸO / HƯỚNG DẪN TỐI ƯU
        if (lower.contains("mẹo") || lower.contains("thủ thuật") || lower.contains("cách ") || lower.contains("hướng dẫn") || lower.contains("tối ưu")) {
            return "<h2>1. Tầm quan trọng của việc tối ưu hóa thiết bị</h2>\n"
                    + "<p>Sau một thời gian sử dụng, hệ điều hành và các ứng dụng ngầm thường tích tụ dữ liệu rác, gây hao pin và làm giảm độ mượt mà. Với chủ đề <strong>" + title + "</strong>, bạn sẽ nắm trọn các bước thiết lập chuẩn chỉ từ chuyên gia kỹ thuật.</p>\n\n"
                    + "<h2>2. Các bước thiết lập quan trọng cần làm ngay</h2>\n"
                    + "<ul>\n"
                    + "  <li><strong>Bước 1 - Dọn dẹp ứng dụng chạy ngầm:</strong> Tắt các tiến trình không cần thiết và hạn chế quyền định vị nền của những app ít sử dụng.</li>\n"
                    + "  <li><strong>Bước 2 - Tùy chỉnh hiệu suất năng lượng:</strong> Kích hoạt các chế độ tiết kiệm điện thông minh hoặc điều chỉnh tần số quét thích ứng theo kịch bản sử dụng.</li>\n"
                    + "  <li><strong>Bước 3 - Cập nhật bản vá phần mềm mới nhất:</strong> Luôn đảm bảo máy chạy trên phiên bản firmware được nhà sản xuất tối ưu lỗi bảo mật và hiệu năng.</li>\n"
                    + "</ul>\n\n"
                    + "<blockquote>\n"
                    + "  <p>Chỉ với vài thao tác tinh chỉnh đơn giản trong phần cài đặt, thiết bị của bạn có thể kéo dài thêm từ 20% đến 30% thời lượng sử dụng mỗi ngày.</p>\n"
                    + "</blockquote>\n\n"
                    + "<h2>3. Những thói quen sử dụng sai lầm cần tránh</h2>\n"
                    + "<p>Hạn chế thói quen vừa cắm sạc vừa dùng các tác vụ nặng, tránh để máy ở nơi có nhiệt độ cao và nên khởi động lại thiết bị định kỳ một lần mỗi tuần để giải phóng hoàn toàn bộ nhớ RAM.</p>\n\n"
                    + "<h2>4. Lời khuyên từ kỹ thuật viên NEXOR</h2>\n"
                    + "<p>Nếu bạn gặp bất kỳ trở ngại nào trong quá trình thao tác, đừng ngần ngại mang máy đến chi nhánh <strong>NEXOR</strong> gần nhất để được kỹ thuật viên hỗ trợ kiểm tra và vệ sinh máy hoàn toàn miễn phí!</p>";
        }

        // 3. Dạng bài LAPTOP / MACBOOK / PC GAMING
        if (lower.contains("macbook") || lower.contains("laptop") || lower.contains("máy tính") || lower.contains("gaming") || lower.contains("dell") || lower.contains("asus")) {
            return "<h2>1. Đột phá về kiến trúc vi xử lý và hiệu suất tản nhiệt</h2>\n"
                    + "<p>Trong phân khúc máy tính xách tay cao cấp hiện nay, <strong>" + title + "</strong> được sinh ra để giải quyết bài toán cân bằng giữa tính di động cao và sức mạnh tính toán ấn tượng.</p>\n\n"
                    + "<h2>2. Màn hình chuẩn màu đồ họa & Bàn phím gõ êm ái</h2>\n"
                    + "<p>Trải nghiệm thị giác và xúc giác luôn là điểm cộng lớn của dòng máy này:</p>\n"
                    + "<ul>\n"
                    + "  <li><strong>Độ phủ màu chuyên nghiệp:</strong> Đạt 100% sRGB và chuẩn DCI-P3, độ sáng cao giúp làm việc ngoài trời hoặc phòng studio không lo sai lệch màu.</li>\n"
                    + "  <li><strong>Hành trình phím tối ưu:</strong> Độ nảy phản hồi xúc giác rõ ràng, khoảng cách phím hợp lý cùng trackpad kích thước lớn phủ kính mượt mà.</li>\n"
                    + "</ul>\n\n"
                    + "<h2>3. Benchmark thực tế: Làm việc, lập trình và giải trí</h2>\n"
                    + "<p>Thử nghiệm khả năng biên dịch mã nguồn lớn, dựng video 4K đa luồng và chơi các tựa game Esport mới nhất. Hệ thống tản nhiệt thông minh giữ cho bề mặt kê tay luôn mát mẻ và quạt hoạt động êm ái.</p>\n"
                    + "<blockquote>\n"
                    + "  <p>Hiệu năng trên mỗi watt điện năng tiêu thụ đạt mức ấn tượng, mang lại thời lượng pin đủ sức đồng hành trọn vẹn cả ngày làm việc.</p>\n"
                    + "</blockquote>\n\n"
                    + "<h2>4. Cổng kết nối và khả năng mở rộng linh hoạt</h2>\n"
                    + "<p>Trang bị các chuẩn kết nối hiện đại tốc độ cao như Thunderbolt, USB-C Power Delivery và khe cắm thẻ nhớ tiện lợi cho công việc sáng tạo nội dung.</p>\n\n"
                    + "<h2>5. Tổng kết: Ai là người nên sở hữu chiếc máy này?</h2>\n"
                    + "<p>Đây là sự đầu tư xứng đáng cho các lập trình viên, nhà sáng tạo nội dung số và chuyên gia cần một cỗ máy làm việc tin cậy. Sản phẩm đang được phân phối chính hãng tại <strong>NEXOR Flagship Store</strong> với chính sách bảo hành 1 đổi 1 chu đáo.</p>";
        }

        // 4. Dạng bài SMARTPHONE / ĐIỆN THOẠI FLAGSHIP
        if (lower.contains("iphone") || lower.contains("samsung") || lower.contains("galaxy") || lower.contains("điện thoại") || lower.contains("phone")) {
            return "<h2>1. Tổng quan thiết kế & Sự tinh tế của dòng Flagship</h2>\n"
                    + "<p>Những chiếc smartphone đỉnh cao luôn là nơi hội tụ tinh hoa công nghệ chế tác. Với <strong>" + title + "</strong>, người dùng có cơ hội tiếp cận những công nghệ di động tiên phong nhất năm nay.</p>\n\n"
                    + "<h2>2. Camera đỉnh cao: Sáng tạo nội dung không giới hạn</h2>\n"
                    + "<p>Hệ thống quang học thế hệ mới mang lại sự bứt phá vượt bậc về khả năng thu sáng và xử lý ảnh điện toán:</p>\n"
                    + "<ul>\n"
                    + "  <li><strong>Cảm biến chính độ phân giải cao:</strong> Giữ trọn từng chi tiết dù trong điều kiện ngược sáng hay môi trường thiếu sáng phức tạp.</li>\n"
                    + "  <li><strong>Ống kính Tele Zoom quang học:</strong> Bắt trọn những khung hình từ khoảng cách xa với độ sắc nét tự nhiên không vỡ hạt.</li>\n"
                    + "  <li><strong>Thuật toán chân dung AI:</strong> Xóa phông mượt mà, tách bạch lọn tóc và tông màu da tự nhiên, rực rỡ.</li>\n"
                    + "</ul>\n\n"
                    + "<h2>3. Sức mạnh phần cứng & Trí tuệ nhân tạo trên thiết bị (On-device AI)</h2>\n"
                    + "<p>Trang bị con chip sản xuất trên tiến trình tối tân, hỗ trợ các tính năng AI dịch thuật trực tiếp, chỉnh sửa hình ảnh thông minh và tối ưu hóa hiệu năng chơi game 120 FPS không giật lag.</p>\n"
                    + "<blockquote>\n"
                    + "  <p>Sự kết hợp ăn ý giữa phần cứng siêu mạnh và phần mềm thông minh tạo nên trải nghiệm vuốt chạm mượt mà chuẩn flagship.</p>\n"
                    + "</blockquote>\n\n"
                    + "<h2>4. Thời lượng pin bền bỉ & Tốc độ sạc nhanh ấn tượng</h2>\n"
                    + "<p>Dung lượng pin lớn cùng công nghệ quản lý điện năng thông minh cho phép bạn tự tin sử dụng suốt cả ngày dài mà không cần lo lắng về việc sạc lại giữa chừng.</p>\n\n"
                    + "<h2>5. Kết luận</h2>\n"
                    + "<p>Chiếc điện thoại này hoàn toàn đáp ứng trọn vẹn mọi kỳ vọng từ công việc đến giải trí đỉnh cao. Đừng quên ghé ngay <strong>NEXOR</strong> để trải nghiệm máy thử nghiệm thực tế và nhận các phần quà ưu đãi độc quyền!</p>";
        }

        // 5. Dạng bài ÂM THANH / TAI NGHE / LOA
        if (lower.contains("tai nghe") || lower.contains("loa") || lower.contains("âm thanh") || lower.contains("airpods") || lower.contains("sony")) {
            return "<h2>1. Đắm chìm vào không gian âm nhạc chất lượng cao</h2>\n"
                    + "<p>Với những người yêu âm nhạc và thường xuyên làm việc trong môi trường ồn ào, <strong>" + title + "</strong> là chiếc chìa khóa mở ra không gian tĩnh lặng và giai điệu sống động.</p>\n\n"
                    + "<h2>2. Công nghệ chống ồn chủ động (ANC) & Chế độ xuyên âm</h2>\n"
                    + "<p>Hệ thống microphone kép đa hướng lọc sạch tiếng ồn tàu xe, tiếng người trò chuyện nơi văn phòng, giúp bạn tập trung tuyệt đối vào công việc.</p>\n"
                    + "<ul>\n"
                    + "  <li><strong>Chất âm Hi-Res sắc nét:</strong> Âm trầm sâu lắng uy lực, dải trung ấm áp và dải cao tách bạch không chói gắt.</li>\n"
                    + "  <li><strong>Đàm thoại trong trẻo:</strong> Thuật toán AI lọc tạp âm gió giúp giọng nói luôn rõ ràng trong các cuộc gọi họp online.</li>\n"
                    + "</ul>\n\n"
                    + "<blockquote>\n"
                    + "  <p>Cảm giác đeo êm ái suốt nhiều giờ liền mà không gây bí tai hay đau vành tai, hoàn hảo cho những chuyến bay hay làm việc cả ngày dài.</p>\n"
                    + "</blockquote>\n\n"
                    + "<h2>3. Đánh giá tổng thể & Địa chỉ mua sắm uy tín</h2>\n"
                    + "<p>Một sự nâng cấp xứng tầm cho trải nghiệm thính giác của bạn. Sản phẩm được bảo hành chính hãng 12 tháng tại các chi nhánh của <strong>NEXOR Store</strong>.</p>";
        }

        // 6. Dạng bài AI & XU HƯỚNG CÔNG NGHỆ TƯƠNG LAI
        if (lower.contains("ai") || lower.contains("trí tuệ nhân tạo") || lower.contains("agent") || lower.contains("xu hướng") || lower.contains("tương lai")) {
            return "<h2>1. Làn sóng trí tuệ nhân tạo đang tái định hình thế giới</h2>\n"
                    + "<p>Không còn là những lý thuyết xa xôi, chủ đề <strong>" + title + "</strong> đang trực tiếp tác động đến quy trình làm việc, sản xuất và đời sống hàng ngày của hàng triệu người dùng công nghệ.</p>\n\n"
                    + "<h2>2. Từ trợ lý ảo thụ động đến hệ thống tự hành thông minh</h2>\n"
                    + "<p>Bước ngoặt lớn nhất nằm ở khả năng tự suy luận logic, phối hợp nhiều công cụ và xử lý chuỗi tác vụ phức tạp một cách chủ động:</p>\n"
                    + "<ul>\n"
                    + "  <li><strong>Tự động hóa tác vụ:</strong> Rút ngắn thời gian xử lý dữ liệu và tạo báo cáo từ nhiều giờ xuống chỉ còn vài giây.</li>\n"
                    + "  <li><strong>Cá nhân hóa trải nghiệm:</strong> Hệ thống hiểu ngữ cảnh người dùng tốt hơn, đưa ra các phản hồi chuẩn xác theo thời gian thực.</li>\n"
                    + "  <li><strong>Bảo mật & Quyền riêng tư:</strong> Xu hướng xử lý dữ liệu cục bộ ngay trên vi xử lý NPU của máy tính và điện thoại.</li>\n"
                    + "</ul>\n\n"
                    + "<blockquote>\n"
                    + "  <p>Những cá nhân và doanh nghiệp biết tận dụng công cụ AI từ sớm sẽ có lợi thế cạnh tranh vượt trội trong kỷ nguyên số.</p>\n"
                    + "</blockquote>\n\n"
                    + "<h2>3. Cơ hội và thách thức trong giai đoạn chuyển mình</h2>\n"
                    + "<p>Bên cạnh năng suất vượt trội, người dùng cần trang bị tư duy phản biện để kiểm chứng thông tin và nâng cao năng lực bảo mật dữ liệu cá nhân.</p>\n\n"
                    + "<h2>4. Đón đầu kỷ nguyên AI cùng NEXOR</h2>\n"
                    + "<p>Tại <strong>NEXOR</strong>, chúng tôi luôn cập nhật nhanh nhất các dòng phần cứng trang bị NPU AI tiên tiến nhất để bạn sẵn sàng bứt phá mọi giới hạn!</p>";
        }

        // 7. Dạng bài ĐÁNH GIÁ CHUYÊN SÂU (Mặc định cho các chủ đề khác)
        return "<h2>1. Đặt vấn đề: Tại sao chủ đề này lại nhận được nhiều sự quan tâm?</h2>\n"
                + "<p>Trong dòng chảy không ngừng của thế giới số, <strong>" + title + "</strong> đang thu hút đông đảo sự quan tâm của cộng đồng đam mê công nghệ. Thuộc nhóm nội dung <em>" + category + "</em>, bài viết này sẽ mang đến góc nhìn chân thực, khách quan và chi tiết nhất.</p>\n\n"
                + "<h2>2. Những điểm sáng nổi bật và giá trị thực tế mang lại</h2>\n"
                + "<p>Sau khi tổng hợp các bài thử nghiệm và phản hồi thực tế từ người dùng, đây là những ưu điểm đáng giá nhất:</p>\n"
                + "<ul>\n"
                + "  <li><strong>Tính ứng dụng cao:</strong> Giải quyết trực tiếp các nhu cầu cấp thiết trong học tập, làm việc và phong cách sống hiện đại.</li>\n"
                + "  <li><strong>Độ hoàn thiện và tính ổn định:</strong> Vận hành tin cậy, tỉ mỉ trong từng trải nghiệm sử dụng hàng ngày.</li>\n"
                + "  <li><strong>Tương thích linh hoạt:</strong> Dễ dàng phối ghép và đồng bộ cùng các thiết bị khác trong hệ sinh thái số.</li>\n"
                + "</ul>\n\n"
                + "<blockquote>\n"
                + "  <p>Một bước tiến công nghệ đáng giá, dung hòa xuất sắc giữa mức chi phí đầu tư và giá trị thực tiễn đem lại cho người dùng.</p>\n"
                + "</blockquote>\n\n"
                + "<h2>3. Một số điểm người dùng cần lưu ý</h2>\n"
                + "<p>Bên cạnh những điểm cộng sáng giá, bạn cũng nên cân nhắc kỹ về ngân sách và nhu cầu thực sự để chọn đúng phiên bản cấu hình phù hợp nhất với bản thân.</p>\n\n"
                + "<h2>4. Đánh giá tổng quan & Tư vấn mua hàng</h2>\n"
                + "<p>Nếu bạn muốn sở hữu và trải nghiệm sản phẩm chuẩn chính hãng với mức giá cạnh tranh nhất, hãy đến ngay hệ thống bán lẻ công nghệ <strong>NEXOR Flagship Store</strong> hoặc liên hệ hotline để được đội ngũ kỹ thuật viên tư vấn tận tâm!</p>";
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

    @Override
    public VisualSearchResponse visualSearch(MultipartFile image) {
        if (aiVisualSearchService != null) {
            return aiVisualSearchService.searchByImage(image);
        }
        throw new IllegalStateException("AiVisualSearchService chưa được nạp");
    }
}
