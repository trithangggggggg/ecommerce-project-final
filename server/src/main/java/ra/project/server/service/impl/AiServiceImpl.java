package ra.project.server.service.impl;

import ra.project.server.exception.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import ra.project.server.model.dto.OrderDraft;
import ra.project.server.service.OrderDraftService;
import ra.project.server.service.ai.AiOrderTools;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import ra.project.server.mapper.OrderMapper;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.request.AiChatRequest;
import ra.project.server.model.dto.request.AiGenerateArticleRequest;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.request.ChatMessageDto;
import ra.project.server.model.dto.response.AiChatResponse;
import ra.project.server.model.dto.response.AiGenerateArticleResponse;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.model.dto.response.OrderPreviewDto;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.dto.response.VisualSearchResponse;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.model.enums.PaymentStatus;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.User;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.AiConfigService;
import ra.project.server.service.AiService;
import ra.project.server.service.AiVisualSearchService;
import ra.project.server.service.KnowledgeBaseService;

import java.math.BigDecimal;
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

    private static final Pattern BUDGET_PATTERN = Pattern
            .compile("(?:duoi(?:\\s+tam)?|tam|khoang)?\\s*(\\d+)\\s*(?:tr|trieu)\\b");

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;
    private final KnowledgeBaseService knowledgeBaseService;

    @Autowired(required = false)
    private AiVisualSearchService aiVisualSearchService;

    @Autowired(required = false)
    private AiConfigService aiConfigService;

    @Autowired(required = false)
    private ra.project.server.service.OrderService orderService;

    @Autowired(required = false)
    private OrderRepository orderRepository;

    @Autowired(required = false)
    private OrderMapper orderMapper;

    @Autowired(required = false)
    private ra.project.server.repository.UserRepository userRepository;

    @Autowired(required = false)
    private ra.project.server.config.SepayConfig sepayConfig;

    @Autowired(required = false)
    private AiOrderTools aiOrderTools;

    @Autowired(required = false)
    private OrderDraftService orderDraftService;

    @Value("${gemini.api-key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    @Value("${gemini.model:${GEMINI_MODEL:gemini-3.5-flash-lite}}")
    private String geminiModel;

    @Value("${gemini.api-url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String geminiApiUrl;

    @Value("${spring.ai.openai.api-key:${app.ai.api-key:}}")
    private String openAiApiKey;

    @Value("${spring.ai.openai.chat.options.model:gpt-4o-mini}")
    private String openAiModel;

    private String getEffectiveGeminiApiKey() {
        if (aiConfigService != null)
            return aiConfigService.getEffectiveGeminiApiKey();
        return geminiApiKey;
    }

    private String getEffectiveGeminiModel() {
        if (aiConfigService != null)
            return aiConfigService.getEffectiveGeminiModel();
        return geminiModel;
    }

    private String getEffectiveOpenAiApiKey() {
        if (aiConfigService != null)
            return aiConfigService.getEffectiveOpenAiApiKey();
        return openAiApiKey;
    }

    private String getEffectiveOpenAiModel() {
        if (aiConfigService != null)
            return aiConfigService.getEffectiveOpenAiModel();
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
        String categoryName = StringUtils.hasText(request.getCategoryName()) ? request.getCategoryName().trim()
                : "Thiết bị điện tử";
        Object specs = request.getSpecs();
        List<String> keywords = request.getKeywords();

        String prompt = buildPrompt(productName, brand, categoryName, specs, keywords);

        // 1. Thử gọi Google Gemini AI nếu có API Key
        String activeGeminiKey = getEffectiveGeminiApiKey();
        String activeGeminiModel = getEffectiveGeminiModel();
        if (StringUtils.hasText(activeGeminiKey) && !activeGeminiKey.equalsIgnoreCase("dummy")
                && !activeGeminiKey.startsWith("placeholder")) {
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
        if (StringUtils.hasText(activeOpenAiKey) && !activeOpenAiKey.equalsIgnoreCase("dummy")
                && !activeOpenAiKey.startsWith("sk-placeholder")) {
            try {
                log.info("Đang gọi Spring AI OpenAI Model [{}] để sinh mô tả SEO cho: {}", activeOpenAiModel,
                        productName);
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
                log.warn("Không thể kết nối Spring AI OpenAI ({}), chuyển sang bộ dự phòng: {}", ex.getMessage(),
                        ex.getClass().getSimpleName());
            }
        }

        // 3. Chế độ sinh mô tả chuẩn SEO thông minh (Smart Fallback Generator) khi
        // không có API Key hoặc gặp lỗi/timeout
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
        String category = request != null && StringUtils.hasText(request.getCategory()) ? request.getCategory().trim()
                : "Công nghệ";
        String summary = request != null && StringUtils.hasText(request.getSummary()) ? request.getSummary().trim()
                : "";

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
        if (StringUtils.hasText(activeGeminiKey) && !activeGeminiKey.equalsIgnoreCase("dummy")
                && !activeGeminiKey.startsWith("placeholder")) {
            log.info("Đang gọi Google Gemini AI Model [{}] để sinh nội dung bài viết: {}", activeGeminiModel, title);
            try {
                String geminiText = callGeminiApi(prompt);
                if (StringUtils.hasText(geminiText)) {
                    String cleanContent = cleanHtmlOutput(geminiText);
                    String generatedSummary = StringUtils.hasText(summary) ? summary
                            : generateSmartSummary(title, category);
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
    @org.springframework.transaction.annotation.Transactional
    public AiChatResponse chatWithCustomer(AiChatRequest request) {
        String userMessage = request.getMessage().trim();

        // 1. Lấy danh sách sản phẩm thực tế đang kinh doanh từ CSDL
        List<Product> allProducts = productRepository.findAll().stream()
                .filter(p -> p.getStatus() == null || !"INACTIVE".equalsIgnoreCase(p.getStatus()))
                .collect(Collectors.toList());

        // 2. RAG Context 1: Lọc nhanh sản phẩm liên quan
        List<Product> relevantProducts = filterRelevantProducts(userMessage, allProducts);

        // 3. RAG Context 2: Truy xuất tri thức từ Knowledge Base
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

        // 4. Xây dựng System Prompt súc tích & Persona bán hàng (hỗ trợ đọc config từ DB)
        String systemPrompt = buildSystemPrompt(relevantProducts.isEmpty() ? allProducts : relevantProducts, relevantKnowledge);

        // 5. Chuẩn bị danh sách Messages tách bạch Role (System, User, Assistant)
        List<Message> messages = new ArrayList<>();
        if (request.getHistory() != null && !request.getHistory().isEmpty()) {
            int startIdx = Math.max(0, request.getHistory().size() - 8);
            for (int i = startIdx; i < request.getHistory().size(); i++) {
                ChatMessageDto hMsg = request.getHistory().get(i);
                if (hMsg == null || !StringUtils.hasText(hMsg.getContent())) continue;
                if ("assistant".equalsIgnoreCase(hMsg.getRole())) {
                    messages.add(new AssistantMessage(hMsg.getContent().trim()));
                } else if ("system".equalsIgnoreCase(hMsg.getRole())) {
                    messages.add(new SystemMessage(hMsg.getContent().trim()));
                } else {
                    messages.add(new UserMessage(hMsg.getContent().trim()));
                }
            }
        }
        messages.add(new UserMessage(userMessage));

        String replyText = null;
        String provider = "NEXOR AI Assistant (ChatClient)";
        OrderPreviewDto orderPreview = null;

        if (aiOrderTools != null) {
            aiOrderTools.clearCurrentDraft();
        }

        try {
            ChatClient chatClient = getOrCreateChatClient(systemPrompt);
            var callSpec = chatClient.prompt()
                    .system(systemPrompt)
                    .messages(messages)
                    .call();
            replyText = callSpec.content();
            if (StringUtils.hasText(replyText)) {
                provider = "GOOGLE_GEMINI (ChatClient)";
            }
        } catch (Exception ex) {
            log.error("Lỗi khi ChatClient xử lý hội thoại: {}", ex.getMessage(), ex);
        } finally {
            if (aiOrderTools != null) {
                orderPreview = aiOrderTools.getAndClearCurrentDraft();
            }
        }

        // 6. Fallback nếu không có phản hồi từ ChatClient
        if (!StringUtils.hasText(replyText)) {
            if (orderPreview != null) {
                replyText = "Dạ em đã tạo bản nháp đơn hàng theo đúng thông tin anh/chị cung cấp ạ. Anh/chị vui lòng kiểm tra lại thông tin đơn hàng bên dưới và bấm nút [Xác nhận đặt hàng] để NEXOR xử lý đơn ngay nhé!";
            } else {
                log.info("Sử dụng Smart Fallback Assistant để trả lời khách hàng.");
                return generateSmartChatFallback(userMessage, relevantProducts.isEmpty() ? allProducts : relevantProducts);
            }
        }

        // 7. Gợi ý sản phẩm Product Cards
        boolean suggestEnabled = aiConfigService == null || aiConfigService.isSuggestProductsEnabled();
        int maxProducts = aiConfigService != null ? aiConfigService.getMaxSuggestedProducts() : 3;

        List<ProductResponse> recommended = Collections.emptyList();
        if (suggestEnabled) {
            recommended = extractRecommendedProducts(replyText, userMessage, allProducts);
            if (recommended.isEmpty() && !relevantProducts.isEmpty()) {
                recommended = relevantProducts.stream().limit(maxProducts).map(productMapper::toResponse)
                        .collect(Collectors.toList());
            } else if (recommended.size() > maxProducts) {
                recommended = recommended.subList(0, maxProducts);
            }
        }

        List<String> quickActions = orderPreview != null
                ? List.of("Xác nhận đặt hàng", "Hủy")
                : Collections.emptyList();

        return AiChatResponse.builder()
                .reply(replyText.trim())
                .suggestedProducts(recommended)
                .recommendedProducts(recommended)
                .orderPreview(orderPreview)
                .quickActions(quickActions)
                .provider(provider)
                .build();
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public OrderResponse confirmDraftOrder(String draftId) {
        if (orderDraftService == null) {
            throw new BadRequestException("Dịch vụ đơn hàng nháp chưa sẵn sàng.");
        }
        OrderDraft draft = orderDraftService.getDraft(draftId)
                .orElseThrow(() -> new BadRequestException("Bản thảo đơn hàng đã hết hạn hoặc không tồn tại. Vui lòng tạo lại yêu cầu đặt hàng!"));

        String note = StringUtils.hasText(draft.getNote()) ? draft.getNote() : "Đặt hàng qua NEXOR AI Assistant";
        ra.project.server.model.dto.request.CheckoutRequest checkoutReq = ra.project.server.model.dto.request.CheckoutRequest.builder()
                .receiverName(draft.getReceiverName())
                .phoneNumber(draft.getPhoneNumber())
                .shippingAddress(draft.getShippingAddress())
                .paymentMethod(draft.getPaymentMethod())
                .note(note)
                .items(List.of(ra.project.server.model.dto.request.OrderItemRequest.builder()
                        .productId(draft.getProductId())
                        .quantity(draft.getQuantity())
                        .build()))
                .build();

        if (orderService == null) {
            throw new BadRequestException("OrderService chưa được cấu hình.");
        }
        var createdResp = orderService.createOrderForAiAssistant(checkoutReq);
        orderDraftService.removeDraft(draftId);
        return createdResp.getData();
    }

    @Override
    public void cancelDraftOrder(String draftId) {
        if (orderDraftService != null) {
            orderDraftService.removeDraft(draftId);
        }
    }

    private ChatClient getOrCreateChatClient(String systemPrompt) {
        String effectiveKey = getEffectiveGeminiApiKey();
        String effectiveModel = getEffectiveGeminiModel();
        if (!StringUtils.hasText(effectiveModel) || effectiveModel.contains("2.5") || effectiveModel.equalsIgnoreCase("dummy")) {
            effectiveModel = "gemini-3.1-flash-lite";
        }

        Double temp = aiConfigService != null ? aiConfigService.getTemperature() : 0.8;
        if (temp == null) temp = 0.8;

        OpenAiApi openAiApi = new OpenAiApi(
                "https://generativelanguage.googleapis.com/v1beta/openai",
                effectiveKey
        );

        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(effectiveModel)
                .temperature(temp)
                .build();

        OpenAiChatModel chatModel = new OpenAiChatModel(openAiApi, options);

        ChatClient.Builder builder = ChatClient.builder(chatModel)
                .defaultSystem(systemPrompt);

        if (aiOrderTools != null) {
            builder.defaultTools(aiOrderTools);
        }

        return builder.build();
    }

    private List<Product> filterRelevantProducts(String userMessage, List<Product> products) {
        if (products.isEmpty())
            return Collections.emptyList();

        String normQuery = normalizeText(userMessage);

        boolean isMacBook = normQuery.contains("macbook") || normQuery.contains("mac book") || normQuery.contains("m3")
                || normQuery.contains("m2") || normQuery.contains("m1") || normQuery.contains("apple silicon");
        boolean isLaptop = isMacBook || normQuery.contains("laptop") || normQuery.contains("dell")
                || normQuery.contains("xps") ||
                normQuery.contains("asus") || normQuery.contains("zenbook") || normQuery.contains("legion")
                || normQuery.contains("lenovo") ||
                normQuery.contains("thinkpad") || normQuery.contains("may tinh xach tay")
                || normQuery.contains("gaming") || normQuery.contains("do hoa");
        boolean isPhone = normQuery.contains("dien thoai") || normQuery.contains("smartphone")
                || normQuery.contains("iphone") ||
                normQuery.contains("samsung") || normQuery.contains("galaxy") || normQuery.contains("xiaomi")
                || normQuery.contains("phone");
        boolean isTablet = normQuery.contains("ipad") || normQuery.contains("tablet")
                || normQuery.contains("may tinh bang");
        boolean isAudio = normQuery.contains("tai nghe") || normQuery.contains("headphone")
                || normQuery.contains("airpods") ||
                normQuery.contains("loa") || normQuery.contains("am thanh") || normQuery.contains("sony");

        Long budgetMax = extractBudgetMax(normQuery);

        Set<String> stopWords = Set.of("tu", "van", "cho", "minh", "toi", "can", "mua", "xem", "gia", "co", "khong",
                "re", "nao", "tot", "nhat", "a", "em", "anh", "chi", "shop", "dong", "loai");
        List<String> keywords = Arrays.stream(normQuery.split("\\s+"))
                .filter(w -> w.length() >= 2 && !stopWords.contains(w))
                .collect(Collectors.toList());

        Map<Product, Integer> scoreMap = new HashMap<>();
        for (Product p : products) {
            int score = 0;
            String pNormName = normalizeText(p.getName());
            String pNormDesc = normalizeText(p.getDescription());
            String pNormCat = p.getCategory() != null ? normalizeText(p.getCategory().getName()) : "";

            if (isMacBook && pNormName.contains("macbook"))
                score += 300;
            else if (isLaptop && pNormCat.contains("laptop"))
                score += 150;
            else if (isPhone && pNormCat.contains("dien thoai"))
                score += 150;
            else if (isTablet && pNormCat.contains("may tinh bang"))
                score += 150;
            else if (isAudio && pNormCat.contains("am thanh"))
                score += 150;

            for (String kw : keywords) {
                if (pNormName.contains(kw))
                    score += 40;
                else if (pNormDesc.contains(kw))
                    score += 10;
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

        // Nếu người dùng có tìm kiếm từ khóa cụ thể (vd: chuột, logitech, bàn phím...)
        // mà kho không có
        // TUYỆT ĐỐI không trả về sản phẩm linh tinh để tránh tư vấn sai lệch
        if (!keywords.isEmpty()) {
            return Collections.emptyList();
        }

        return products.stream().limit(6).collect(Collectors.toList());
    }

    private Long extractBudgetMax(String normQuery) {
        Matcher m = BUDGET_PATTERN.matcher(normQuery);
        if (m.find()) {
            try {
                long val = Long.parseLong(m.group(1));
                return val * 1_000_000L;
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }

    private String buildSystemPrompt(List<Product> products, List<String> knowledge) {
        StringBuilder sb = new StringBuilder();

        // 1. System Prompt từ cấu hình Admin (Database) hoặc mặc định
        if (aiConfigService != null && StringUtils.hasText(aiConfigService.getSystemPrompt())) {
            sb.append(aiConfigService.getSystemPrompt().trim()).append("\n\n");
        } else {
            sb.append("Bạn là NEXOR AI Assistant - Chuyên viên tư vấn bán hàng công nghệ thông minh, duyên dáng và am hiểu sản phẩm của Flagship Tech Store NEXOR.\n\n");
        }

        // 2. Persona & Văn phong
        sb.append("=== PHONG CÁCH & VĂN PHONG (PERSONA) ===\n")
          .append("- Xưng hô lịch thiệp: 'Dạ em chào anh/chị', 'Dạ em sẵn lòng hỗ trợ ạ'.\n")
          .append("- Trả lời súc tích, tự nhiên, duyên dáng (tối đa 2 đến 3 câu). Nêu bật ưu điểm công nghệ cốt lõi (chip, màn hình, tản nhiệt, chống ồn, camera).\n")
          .append("- Khéo léo chốt sale, luôn gợi mở để khách sẵn sàng lên đơn giữ máy giao tận nhà.\n")
          .append("- Khi khách trêu đùa, hỏi ngoại hình ('tôi có đẹp trai không', 'khen tôi đi'): Hưởng ứng dí dỏm, khen khách hết lời rồi khéo léo kết nối với thiết bị công nghệ đẳng cấp để nâng tầm phong độ! Tuyệt đối không trả lời máy móc hay đưa chính sách bảo hành ra đáp lại.\n\n");

        // 3. Chính sách bán hàng
        sb.append("=== CHÍNH SÁCH BÁN HÀNG CỦA NEXOR ===\n")
          .append("- Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000đ.\n")
          .append("- Bảo hành chính hãng 12 đến 24 tháng, 1 đổi 1 trong 30 ngày nếu phát sinh lỗi nhà sản xuất.\n")
          .append("- Hỗ trợ trả góp 0% lãi suất, giao hàng hỏa tốc trong 2 giờ tại nội thành.\n\n");

        // 4. Tài liệu tri thức & chính sách cửa hàng
        if (knowledge != null && !knowledge.isEmpty()) {
            sb.append("=== TÀI LIỆU TRI THỨC VÀ CHÍNH SÁCH CỬA HÀNG (KNOWLEDGE BASE) ===\n");
            for (String k : knowledge) {
                sb.append("- ").append(k).append("\n");
            }
            sb.append("\n");
        }

        // 5. Kho hàng thực tế
        if (products.isEmpty()) {
            sb.append("=== LƯU Ý KHO HÀNG ===\n")
              .append("- Khách hàng đang hỏi về sản phẩm/phụ kiện mà sàn NEXOR HIỆN CHƯA KINH DOANH. Hãy lịch sự thông báo shop chưa bán sản phẩm này và gợi ý các ngành hàng chính hiện có: iPhone, Samsung Galaxy, Laptop Gaming ASUS ROG, MacBook, iPad và Tai nghe Sony cao cấp.\n\n");
        } else {
            sb.append("=== DANH SÁCH SẢN PHẨM PHÙ HỢP CỬA HÀNG ĐANG BÁN (DỮ LIỆU THỰC TẾ) ===\n");
            Locale vn = Locale.forLanguageTag("vi-VN");
            NumberFormat nf = NumberFormat.getInstance(vn);
            for (Product p : products) {
                String priceStr = p.getPrice() != null ? nf.format(p.getPrice()) + "đ" : "Liên hệ";
                String catName = p.getCategory() != null ? p.getCategory().getName() : "Thiết bị điện tử";
                String desc = p.getDescription() != null ? p.getDescription().replaceAll("\\s+", " ").trim() : "";
                if (desc.length() > 100) {
                    desc = desc.substring(0, 100) + "...";
                }
                sb.append(String.format("- [ID: %d] %s | Giá: %s | Danh mục: %s | Tồn kho: %d | Đặc điểm: %s\n",
                        p.getId(), p.getName(), priceStr, catName, p.getStock() != null ? p.getStock() : 0, desc));
            }
            sb.append("\n");
        }

        // 6. Mô tả khi nào ĐƯỢC / KHÔNG ĐƯỢC gọi từng tool
        sb.append("=== HƯỚNG DẪN SỬ DỤNG TOOLS (QUAN TRỌNG) ===\n")
          .append("1. Tool `prepare_order`:\n")
          .append("   - PHẢI GỌI NGAY khi khách hàng muốn đặt mua hàng và đã cung cấp: Tên/ID sản phẩm, Họ tên người nhận, Số điện thoại (10 số) và Địa chỉ nhận hàng.\n")
          .append("   - Nếu khách hàng CHƯA nhắc đến hình thức thanh toán, mặc định chọn 'COD' (Thanh toán khi nhận hàng) và GỌI TOOL NGAY để hệ thống hiển thị phiếu xác nhận trực quan ra màn hình. Tuyệt đối không dừng lại để hỏi phương thức thanh toán dạng chữ!\n")
          .append("   - TUYỆT ĐỐI KHÔNG tự gõ tóm tắt thông tin đơn hàng dưới dạng văn bản (text) thông thường. BẮT BUỘC phải gọi tool `prepare_order` để hệ thống sinh thẻ xác nhận tương tác có 2 nút [Xác nhận] và [Hủy] cho khách hàng bấm.\n")
          .append("   - BÓC TÁCH THÔNG TIN CHÍNH XÁC:\n")
          .append("     + `receiverName`: CHỈ lấy tên người (ví dụ: 'Nam', 'Nguyễn Văn Nam'). Tuyệt đối KHÔNG ghép từ xưng hô 'anh/chị/em', không ghép địa chỉ hay chữ 'SĐT'.\n")
          .append("     + `shippingAddress`: CHỈ lấy địa chỉ cụ thể (ví dụ: '123 Cầu Giấy'). Tuyệt đối KHÔNG lấy cả câu nói 'Tôi muốn đặt 1 chiếc... về'.\n")
          .append("     + `productIdentifier`: Lấy tên hoặc ID sản phẩm khách muốn đặt (ví dụ: 'iPhone 15 Pro Max', 'iPhone 16 Pro Max', 'Sony WH-1000XM5').\n")
          .append("   - Chỉ từ chối gọi tool khi khách thực sự CHƯA cung cấp Số điện thoại hoặc Địa chỉ giao hàng. Khi thiếu SĐT hoặc Địa chỉ, chỉ cần lịch sự xin thêm thông tin còn thiếu.\n")
          .append("   - Sau khi gọi tool thành công, thông báo lịch sự rằng phiếu xác nhận đã hiện trên màn hình và mời khách bấm nút [Xác nhận] để hoàn tất.\n")
          .append("2. Tool `track_order`:\n")
          .append("   - CHỈ ĐƯỢC GỌI khi khách hỏi xem, tra cứu hoặc kiểm tra tình trạng đơn hàng (#NXR-...). \n")
          .append("3. Tool `cancel_order`:\n")
          .append("   - CHỈ ĐƯỢC GỌI khi khách muốn hủy một đơn hàng cụ thể đã tạo. Tool sẽ từ chối nếu đơn không còn ở trạng thái PENDING.\n")
          .append("4. Tool `update_address`:\n")
          .append("   - CHỈ ĐƯỢC GỌI khi khách muốn đổi địa chỉ giao hàng cho đơn cụ thể ở trạng thái PENDING.\n\n");

        // 7. Ví dụ hội thoại Few-shot
        sb.append("=== CÁC VÍ DỤ HỘI THOẠI (FEW-SHOT EXAMPLES) ===\n")
          .append("[Ví dụ 1: Đối đáp duyên dáng & Khéo léo chốt sale]\n")
          .append("Khách: 'tôi có đẹp trai ko'\n")
          .append("AI: 'Dạ anh đẹp trai 10/10 chuẩn soái ca luôn ạ! Người đẹp trai mà lên tay thêm chiếc iPhone 16 Pro Max Titan Tự Nhiên hay diện cùng tai nghe Sony WH-1000XM5 thì đúng chuẩn vạn người mê luôn. Hôm nay anh đang quan tâm mẫu máy nào để em tư vấn cho xứng tầm phong độ ạ? ✨'\n\n")
          .append("[Ví dụ 2: Tư vấn sản phẩm súc tích]\n")
          .append("Khách: 'Tư vấn laptop gaming tầm 35-40 triệu chiến game nặng'\n")
          .append("AI: 'Dạ tầm giá này thì đỉnh nhất là ASUS ROG Strix G16 (2024) [ID: 3] giá 36.990.000đ ạ! Máy trang bị chip i9-14900HX, RTX 4060 cùng tản nhiệt 3 quạt cực mát, bao chiến mọi tựa game max setting. Máy được bảo hành chính hãng 24 tháng và freeship toàn quốc, anh có muốn em hỗ trợ lên đơn giữ máy ngay không ạ?'\n\n")
          .append("[Ví dụ 3: Đặt hàng khi đã đủ thông tin]\n")
          .append("Khách: 'Tôi muốn đặt 1 chiếc iPhone 15 Pro Max về 123 Cầu Giấy cho anh Nam SĐT 0912345678'\n")
          .append("AI: (Thực hiện gọi tool prepare_order(productIdentifier=\"iPhone 15 Pro Max\", quantity=1, receiverName=\"Nam\", phoneNumber=\"0912345678\", shippingAddress=\"123 Cầu Giấy\", paymentMethod=\"COD\")) -> 'Dạ em đã tạo bản thảo đơn hàng cho anh Nam rồi ạ! Phiếu xác nhận thông tin đã hiện trên màn hình, anh Nam vui lòng kiểm tra lại thông tin và bấm nút Xác nhận để em tiến hành lên đơn ngay nhé ạ!'\n\n")
          .append("[Ví dụ 4: Tra cứu đơn hàng]\n")
          .append("Khách: 'Xem hộ tôi đơn #24'\n")
          .append("AI: (Thực hiện gọi tool track_order(orderId=\"24\")) -> Phản hồi chi tiết tình trạng đơn hàng cho khách.\n");

        return sb.toString();
    }

    private List<ProductResponse> extractRecommendedProducts(String replyText, String userMessage,
            List<Product> products) {
        Set<Long> foundIds = new LinkedHashSet<>();

        Pattern pattern = Pattern.compile("\\[ID:\\s*(\\d+)\\]", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(replyText);
        while (matcher.find()) {
            try {
                foundIds.add(Long.parseLong(matcher.group(1)));
            } catch (NumberFormatException ignored) {
            }
        }

        if (foundIds.isEmpty()) {
            for (Product p : products) {
                if (replyText.toLowerCase().contains(p.getName().toLowerCase())) {
                    foundIds.add(p.getId());
                    if (foundIds.size() >= 4)
                        break;
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
                    if (foundIds.size() >= 3)
                        break;
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
        if (!StringUtils.hasText(input))
            return "";
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

        // 0. Ý định trêu đùa, hỏi ngoại hình, đẹp trai / xinh gái (Sale Consultant Charisma)
        if (normQuery.contains("dep trai") || normQuery.contains("xinh gai") || normQuery.contains("xinh dep")
                || normQuery.contains("co dep") || normQuery.contains("dep ko") || normQuery.contains("dep khong")) {
            List<Product> topFeatured = products.stream()
                    .filter(p -> {
                        String n = normalizeText(p.getName());
                        return n.contains("iphone") || n.contains("sony") || n.contains("macbook");
                    })
                    .limit(2)
                    .toList();
            if (topFeatured.isEmpty()) {
                topFeatured = products.stream().limit(2).toList();
            }
            List<ProductResponse> featuredResp = topFeatured.stream().map(productMapper::toResponse).toList();
            String reply = "Dạ chắc chắn là **CÓ** rồi anh/chị ơi! 10/10 điểm chuẩn soái ca/nữ thần không cần bàn cãi luôn ạ! 😍✨\n\n"
                    + "Đã đẹp người lại còn có gu thẩm mỹ công nghệ tinh tế thế này, nếu lên tay thêm một em **iPhone 16 Pro Max** sang xịn mịn hoặc diện cùng tai nghe chống ồn đỉnh cao **Sony WH-1000XM5** thì chuẩn thần thái tỏa sáng ngời ngời luôn anh/chị ơi! 🌟\n\n"
                    + "Hôm nay anh/chị đang có nhã hứng nâng cấp chiếc điện thoại hay laptop nào để xứng tầm phong độ, nhắn em tư vấn liền tay nhé! 😉";
            return AiChatResponse.builder()
                    .reply(reply)
                    .suggestedProducts(featuredResp)
                    .recommendedProducts(featuredResp)
                    .provider("NEXOR AI Assistant (Sale Consultant)")
                    .build();
        }

        // 0.1. Ý định hỏi về thân thế, AI, tên gì, bạn là ai
        if (normQuery.contains("ban la ai") || normQuery.contains("em la ai") || normQuery.contains("may la ai")
                || normQuery.contains("la ai vay") || normQuery.contains("ten gi") || normQuery.contains("ten la gi")
                || normQuery.contains("ai day") || normQuery.equals("bot") || normQuery.equals("ai")) {
            List<ProductResponse> pResp = products.stream().limit(3).map(productMapper::toResponse).toList();
            String reply = "Dạ em là **NEXOR AI** — Chuyên viên tư vấn công nghệ 24/7 siêu am hiểu và tận tâm của NEXOR đây ạ! 🤖✨\n\n"
                    + "Em luôn sẵn sàng hỗ trợ anh/chị:\n"
                    + "🔹 Tư vấn cấu hình chi tiết, so sánh sản phẩm công nghệ (Điện thoại, Laptop, Tablet, Phụ kiện).\n"
                    + "🔹 Báo giá ưu đãi độc quyền, chính sách bảo hành 1 đổi 1 trong 30 ngày.\n"
                    + "🔹 Hỗ trợ lên đơn giao hỏa tốc tận nhà trong 2 giờ hoàn toàn miễn phí.\n\n"
                    + "Hôm nay anh/chị đang cần tìm thiết bị nào để em hỗ trợ nhanh nhất ạ? 😊";
            return AiChatResponse.builder()
                    .reply(reply)
                    .suggestedProducts(pResp)
                    .recommendedProducts(pResp)
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 0.2. Ý định khen ngợi shop hoặc trợ lý
        if (normQuery.contains("thong minh") || normQuery.contains("gioi qua") || normQuery.contains("dinh qua")
                || normQuery.contains("tuyet voi") || normQuery.contains("de thuong") || normQuery.contains("dang yeu")
                || normQuery.contains("hai huoc") || normQuery.contains("duyen")) {
            String reply = "Dạ em cảm ơn anh/chị rất nhiều ạ! Được trò chuyện và phục vụ khách hàng tinh tế, dễ thương như anh/chị là niềm vui lớn nhất mỗi ngày của em và NEXOR đó ạ! 🥰💖\n\nAnh/chị cần tham khảo máy xịn hay săn ưu đãi gì cứ để em đồng hành hỗ trợ hết mình nhé!";
            return AiChatResponse.builder()
                    .reply(reply)
                    .suggestedProducts(Collections.emptyList())
                    .recommendedProducts(Collections.emptyList())
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 0.3. Ý định hỏi địa chỉ showroom / cửa hàng thực tế của NEXOR
        if (normQuery.contains("dia chi shop") || normQuery.contains("dia chi cua hang") || normQuery.contains("showroom")
                || normQuery.contains("shop o dau") || normQuery.contains("cua hang o dau") || normQuery.contains("den xem truc tiep")) {
            String reply = "🏢 **Hệ thống Showroom Công nghệ NEXOR:**\n"
                    + "- **Hà Nội**: Tòa nhà NEXOR Tower, Cầu Giấy & Hà Đông, Hà Nội.\n"
                    + "- **TP. Hồ Chí Minh**: Quận 1 & Quận 10, TP. Hồ Chí Minh.\n"
                    + "⏰ Giờ mở cửa: **08:00 - 22:00** (Tất cả các ngày trong tuần, kể cả Lễ/Tết).\n\n"
                    + "Ngoài ra, NEXOR luôn có chính sách **Giao hàng hỏa tốc trong 2 giờ** hoàn toàn miễn phí, nhận máy kiểm tra ưng ý mới thanh toán! Anh/chị cần em hỗ trợ giao ngay sản phẩm nào không ạ? 😊";
            return AiChatResponse.builder()
                    .reply(reply)
                    .suggestedProducts(Collections.emptyList())
                    .recommendedProducts(Collections.emptyList())
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 1. Ý định chào hỏi thân thiện (Ngắn gọn, hỏi đúng vấn đề)
        if (normQuery.equals("chao") || normQuery.startsWith("xin chao") || normQuery.contains("chao ban") ||
                normQuery.contains("chao shop") || normQuery.equals("hello") || normQuery.equals("hi") ||
                normQuery.startsWith("hi ") || normQuery.contains("alo") || normQuery.contains("oi shop") ||
                normQuery.equals("oi")) {
            List<Product> topFeatured = products.stream().limit(3).collect(Collectors.toList());
            String greetingReply = "Dạ em chào anh/chị! 👋 Em là **NEXOR AI**. Anh/chị đang tìm thiết bị nào (điện thoại, laptop hay âm thanh) và trong tầm giá bao nhiêu để em hỗ trợ nhanh nhất ạ?";
            List<ProductResponse> featuredResp = topFeatured.stream().map(productMapper::toResponse)
                    .collect(Collectors.toList());
            return AiChatResponse.builder()
                    .reply(greetingReply)
                    .suggestedProducts(featuredResp)
                    .recommendedProducts(featuredResp)
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 2. Ý định hỏi về chính sách bảo hành / đổi trả (Tránh bẫy từ 'khong' hay 'tra loi')
        boolean isWarrantyQuery = (normQuery.contains("bao hanh") || normQuery.contains("doi tra")
                || normQuery.matches(".*\\b(bi\\s+hong|hu\\s+hong|hong\\s+hoc|may\\s+hong|hong\\s+roi|bi\\s+hu|hu\\s+roi)\\b.*")
                || normQuery.matches(".*\\b(loi\\s+may|loi\\s+san\\s+pham|bi\\s+loi|loi\\s+ky\\s+thuat|phat\\s+sinh\\s+loi|loi\\s+phan\\s+cung)\\b.*"))
                && !normQuery.contains("tra loi");
        if (isWarrantyQuery) {
            String warrantyReply = "🛡️ **NEXOR cam kết 100% chính hãng**, bảo hành 12 - 24 tháng và 1 đổi 1 trong 30 ngày nếu phát sinh lỗi nhà sản xuất. Anh/chị cần hỗ trợ bảo hành sản phẩm nào ạ?";
            List<ProductResponse> wResp = products.stream().limit(2).map(productMapper::toResponse)
                    .collect(Collectors.toList());
            return AiChatResponse.builder()
                    .reply(warrantyReply)
                    .suggestedProducts(wResp)
                    .recommendedProducts(wResp)
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 3. Ý định hỏi về vận chuyển / giao hàng
        if (normQuery.contains("van chuyen") || normQuery.contains("giao hang") || normQuery.contains("ship")
                || normQuery.contains("freeship") || normQuery.contains("hoa toc")) {
            String shipReply = "🚚 **NEXOR miễn phí vận chuyển toàn quốc** cho đơn từ 500.000đ và giao hỏa tốc 2 giờ tại nội thành. Anh/chị muốn đặt hàng giao về địa chỉ nào ạ?";
            List<ProductResponse> sResp = products.stream().limit(2).map(productMapper::toResponse)
                    .collect(Collectors.toList());
            return AiChatResponse.builder()
                    .reply(shipReply)
                    .suggestedProducts(sResp)
                    .recommendedProducts(sResp)
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 4. Ý định hỏi về trả góp / khuyến mãi
        if (normQuery.contains("tra gop") || normQuery.contains("khuyen mai") || normQuery.contains("uu dai")
                || normQuery.contains("giam gia") || normQuery.contains("sale")) {
            String promoReply = "🎁 **NEXOR hỗ trợ trả góp 0% lãi suất** xét duyệt chỉ 10 phút và tặng voucher 500k cho học sinh, sinh viên. Anh/chị đang quan tâm dòng máy nào để em báo giá tốt nhất ạ?";
            List<ProductResponse> pResp = products.stream().limit(3).map(productMapper::toResponse)
                    .collect(Collectors.toList());
            return AiChatResponse.builder()
                    .reply(promoReply)
                    .suggestedProducts(pResp)
                    .recommendedProducts(pResp)
                    .provider("NEXOR AI Assistant")
                    .build();
        }

        // 5. Tìm kiếm theo danh mục và từ khóa (Phong cách Chuyên viên Sale công nghệ nhiệt tình, sắc sảo)
        List<Product> matched = filterRelevantProducts(rawQuery, products);

        StringBuilder reply = new StringBuilder();
        if (!matched.isEmpty()) {
            reply.append("Dạ em gửi anh/chị thông tin các dòng máy cực hot, đáp ứng hoàn hảo nhu cầu của mình đây ạ:\n\n");
            for (Product p : matched.stream().limit(3).toList()) {
                String priceStr = p.getPrice() != null ? nf.format(p.getPrice()) + "đ" : "Liên hệ";
                String desc = StringUtils.hasText(p.getDescription()) ? p.getDescription().trim() : "";
                if (desc.length() > 100)
                    desc = desc.substring(0, 100) + "...";
                reply.append(String.format("🔥 **%s [ID: %d]**\n- **Giá ưu đãi:** **%s** (Tiết kiệm cực hời, hỗ trợ trả góp 0%%)\n",
                        p.getName(), p.getId(), priceStr));
                if (StringUtils.hasText(desc)) {
                    reply.append(String.format("- **Đặc điểm:** %s\n", desc));
                }
                reply.append("\n");
            }
            reply.append("✨ Tất cả sản phẩm tại NEXOR đều được **bảo hành chính hãng 12-24 tháng**, 1 đổi 1 trong 30 ngày và **miễn phí giao hàng toàn quốc**.\n\n");
            reply.append("Anh/chị ưng ý mẫu nào hoặc muốn em hỗ trợ lên đơn giữ máy giao hỏa tốc tận nhà thì cứ nhắn em ngay nhé! 😊");
            List<ProductResponse> mResp = matched.stream().limit(3).map(productMapper::toResponse)
                    .collect(Collectors.toList());
            return AiChatResponse.builder()
                    .reply(reply.toString())
                    .suggestedProducts(mResp)
                    .recommendedProducts(mResp)
                    .provider("NEXOR AI Assistant (Tech Consultant)")
                    .build();
        } else {
            String emptyReply = "Dạ NEXOR hiện chưa kinh doanh sản phẩm này rồi ạ! 😅 Cửa hàng bên em chuyên phân phối chính hãng các dòng: **Điện thoại (iPhone, Samsung Galaxy), Laptop (MacBook, ASUS ROG), iPad và Tai nghe cao cấp (Sony WH-1000XM5)** với giá cực ưu đãi. Anh/chị có muốn em tư vấn tham khảo qua dòng máy nào không ạ?";
            List<ProductResponse> featuredResp = products.stream().limit(3).map(productMapper::toResponse)
                    .collect(Collectors.toList());
            return AiChatResponse.builder()
                    .reply(emptyReply)
                    .suggestedProducts(featuredResp)
                    .recommendedProducts(featuredResp)
                    .provider("NEXOR AI Assistant")
                    .build();
        }
    }

    private String callGeminiApi(String prompt) {
        String effectiveKey = getEffectiveGeminiApiKey();
        String effectiveModel = getEffectiveGeminiModel();
        if (!StringUtils.hasText(effectiveKey))
            return null;

        String[] candidateModels = new String[] {
                effectiveModel,
                "gemini-3.5-flash-lite",
                "gemini-flash-lite-latest",
                "gemini-3.8-flash",
                "gemini-2.5-flash"
        };

        for (String model : candidateModels) {
            if (!StringUtils.hasText(model))
                continue;
            try {
                String url = String.format("%s/%s:generateContent?key=%s", geminiApiUrl, model.trim(),
                        effectiveKey.trim());
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

                HttpResponse<String> response = httpClient.send(httpRequest,
                        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

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
            return "Phân tích chi tiết cuộc đối đầu công nghệ trong bài viết '" + title
                    + "'. Đâu là sự lựa chọn tối ưu cho nhu cầu thực tế và ngân sách của bạn?";
        }
        if (lower.contains("mẹo") || lower.contains("thủ thuật") || lower.contains("cách ")
                || lower.contains("hướng dẫn") || lower.contains("tối ưu")) {
            return "Tổng hợp các thủ thuật và hướng dẫn thiết thực nhất về " + title
                    + " giúp bạn làm chủ thiết bị, nâng cao hiệu suất và kéo dài tuổi thọ phần cứng.";
        }
        if (lower.contains("macbook") || lower.contains("laptop") || lower.contains("máy tính")
                || lower.contains("gaming")) {
            return "Đánh giá chuyên sâu " + title
                    + " từ hiệu năng CPU/GPU, màn hình hiển thị đến khả năng tản nhiệt thực tế cho lập trình viên, designer và game thủ.";
        }
        if (lower.contains("iphone") || lower.contains("samsung") || lower.contains("galaxy")
                || lower.contains("điện thoại") || lower.contains("phone")) {
            return "Trải nghiệm thực tế " + title
                    + " với những đánh giá khách quan về cụm camera, thời lượng pin, độ mượt mà của hệ điều hành và giá trị sở hữu.";
        }
        if (lower.contains("tai nghe") || lower.contains("loa") || lower.contains("âm thanh")
                || lower.contains("airpods") || lower.contains("sony")) {
            return "Cảm nhận chất âm chân thực và hiệu quả chống ồn của " + title
                    + ". Góc nhìn chuyên sâu từ chuyên gia âm thanh tại NEXOR Flagship Store.";
        }
        if (lower.contains("ai") || lower.contains("trí tuệ nhân tạo") || lower.contains("agent")
                || lower.contains("xu hướng")) {
            return "Khám phá làn sóng công nghệ đột phá trong bài viết " + title
                    + ". Cập nhật xu hướng AI thế hệ mới và ứng dụng thực tiễn trong công việc số.";
        }
        return "Khám phá bài viết chuyên sâu về " + title + " thuộc chuyên mục " + category
                + ". Đánh giá chi tiết ưu điểm, hiệu năng thực tế và tư vấn trải nghiệm tối ưu tại hệ thống NEXOR.";
    }

    public String generateSmartArticleHtml(String title, String category) {
        String lower = (title + " " + (category != null ? category : "")).toLowerCase();

        // 1. Dạng bài SO SÁNH / ĐỐI ĐẦU
        if (lower.contains("so sánh") || lower.contains(" vs ") || lower.contains("đối đầu") || lower.contains("kèo")) {
            return "<h2>1. Đặt lên bàn cân: Cuộc đối đầu giữa hai biểu tượng công nghệ</h2>\n"
                    + "<p>Thị trường công nghệ cao cấp luôn chứng kiến sự cạnh tranh khốc liệt giữa các ông lớn. Trong bài viết <strong>"
                    + title
                    + "</strong> hôm nay, chúng ta cùng phân tích chi tiết từng khía cạnh để tìm ra đâu là sự lựa chọn chân ái cho nhu cầu thực tế của bạn.</p>\n\n"
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
        if (lower.contains("mẹo") || lower.contains("thủ thuật") || lower.contains("cách ")
                || lower.contains("hướng dẫn") || lower.contains("tối ưu")) {
            return "<h2>1. Tầm quan trọng của việc tối ưu hóa thiết bị</h2>\n"
                    + "<p>Sau một thời gian sử dụng, hệ điều hành và các ứng dụng ngầm thường tích tụ dữ liệu rác, gây hao pin và làm giảm độ mượt mà. Với chủ đề <strong>"
                    + title + "</strong>, bạn sẽ nắm trọn các bước thiết lập chuẩn chỉ từ chuyên gia kỹ thuật.</p>\n\n"
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
        if (lower.contains("macbook") || lower.contains("laptop") || lower.contains("máy tính")
                || lower.contains("gaming") || lower.contains("dell") || lower.contains("asus")) {
            return "<h2>1. Đột phá về kiến trúc vi xử lý và hiệu suất tản nhiệt</h2>\n"
                    + "<p>Trong phân khúc máy tính xách tay cao cấp hiện nay, <strong>" + title
                    + "</strong> được sinh ra để giải quyết bài toán cân bằng giữa tính di động cao và sức mạnh tính toán ấn tượng.</p>\n\n"
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
        if (lower.contains("iphone") || lower.contains("samsung") || lower.contains("galaxy")
                || lower.contains("điện thoại") || lower.contains("phone")) {
            return "<h2>1. Tổng quan thiết kế & Sự tinh tế của dòng Flagship</h2>\n"
                    + "<p>Những chiếc smartphone đỉnh cao luôn là nơi hội tụ tinh hoa công nghệ chế tác. Với <strong>"
                    + title
                    + "</strong>, người dùng có cơ hội tiếp cận những công nghệ di động tiên phong nhất năm nay.</p>\n\n"
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
        if (lower.contains("tai nghe") || lower.contains("loa") || lower.contains("âm thanh")
                || lower.contains("airpods") || lower.contains("sony")) {
            return "<h2>1. Đắm chìm vào không gian âm nhạc chất lượng cao</h2>\n"
                    + "<p>Với những người yêu âm nhạc và thường xuyên làm việc trong môi trường ồn ào, <strong>" + title
                    + "</strong> là chiếc chìa khóa mở ra không gian tĩnh lặng và giai điệu sống động.</p>\n\n"
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
        if (lower.contains("ai") || lower.contains("trí tuệ nhân tạo") || lower.contains("agent")
                || lower.contains("xu hướng") || lower.contains("tương lai")) {
            return "<h2>1. Làn sóng trí tuệ nhân tạo đang tái định hình thế giới</h2>\n"
                    + "<p>Không còn là những lý thuyết xa xôi, chủ đề <strong>" + title
                    + "</strong> đang trực tiếp tác động đến quy trình làm việc, sản xuất và đời sống hàng ngày của hàng triệu người dùng công nghệ.</p>\n\n"
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
                + "<p>Trong dòng chảy không ngừng của thế giới số, <strong>" + title
                + "</strong> đang thu hút đông đảo sự quan tâm của cộng đồng đam mê công nghệ. Thuộc nhóm nội dung <em>"
                + category + "</em>, bài viết này sẽ mang đến góc nhìn chân thực, khách quan và chi tiết nhất.</p>\n\n"
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

    private String buildPrompt(String productName, String brand, String categoryName, Object specs,
            List<String> keywords) {
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
        sb.append(
                "Chỉ trả về nội dung Markdown thuần túy (tuyệt đối KHÔNG bọc trong khối code block `markdown hoặc `).\n");
        sb.append("Cấu trúc bài viết phải bao gồm chính xác 4 phần sau:\n\n");
        sb.append("### 1. Tiêu đề\n");
        sb.append(
                "Tiêu đề hấp dẫn, chứa tên sản phẩm và điểm nhấn công nghệ, kèm đoạn giới thiệu mở đầu 2-3 câu lôi cuốn.\n\n");
        sb.append("### 2. Điểm nổi bật\n");
        sb.append(
                "Trình bày từ 3-5 gạch đầu dòng (bullet points) nêu bật công nghệ đột phá, thiết kế, hiệu năng và trải nghiệm sử dụng thực tế.\n\n");
        sb.append("### 3. Thông số kỹ thuật\n");
        sb.append("Liệt kê đầy đủ, chính xác các thông số kỹ thuật (dựa trên thông số cung cấp).\n\n");
        sb.append("### 4. Đối tượng phù hợp\n");
        sb.append(
                "Phân tích rõ sản phẩm phù hợp nhất với nhóm khách hàng nào (học sinh, sinh viên, dân văn phòng, game thủ, sáng tạo nội dung...) kèm cam kết chất lượng, bảo hành chính hãng tại NEXOR.\n");
        return sb.toString();
    }

    private String generateSmartSeoDescription(String productName, String brand, String categoryName, Object specs,
            List<String> keywords) {
        String brandPrefix = StringUtils.hasText(brand) ? (" từ thương hiệu danh tiếng **" + brand.trim() + "**") : "";
        String keywordStr = (keywords != null && !keywords.isEmpty()) ? String.join(", ", keywords)
                : "công nghệ tiên tiến, thiết kế đẳng cấp";
        String specsBlock = formatSpecs(specs);
        if (!StringUtils.hasText(specsBlock)) {
            specsBlock = "- **Thương hiệu**: " + (StringUtils.hasText(brand) ? brand.trim() : "Chính hãng") + "\n" +
                    "- **Phân khúc**: " + categoryName + "\n" +
                    "- **Tính năng chính**: Tối ưu hiệu năng, tiết kiệm điện năng, kết nối thông minh\n" +
                    "- **Bảo hành**: 12 tháng chính hãng 1 đổi 1";
        }

        return String.format(
                "## %s – Đỉnh Cao Công Nghệ, Trải Nghiệm Hoàn Mỹ\n\n" +
                        "**%s**%s là sự kết hợp hoàn hảo giữa ngôn ngữ thiết kế thời thượng và hiệu năng vượt bậc trong phân khúc **%s**. "
                        +
                        "Sở hữu độ hoàn thiện cao cấp cùng độ bền bỉ đáng tin cậy, sản phẩm mang lại trải nghiệm đỉnh cao cho cả nhu cầu công việc lẫn giải trí thường ngày.\n\n"
                        +
                        "### Điểm nổi bật vượt trội\n" +
                        "- **Hiệu năng bứt phá**: Tối ưu hóa xử lý mượt mà, phản hồi tức thì với tốc độ ấn tượng.\n" +
                        "- **Trải nghiệm đỉnh cao**: Tích hợp các tính năng công nghệ thông minh (%s) nâng tầm tiện ích.\n"
                        +
                        "- **Thiết kế sang trọng**: Kiểu dáng hiện đại, gia công tỉ mỉ, vật liệu cao cấp và an toàn tuyệt đối.\n"
                        +
                        "- **Tiết kiệm năng lượng**: Tối ưu thời lượng sử dụng bền bỉ suốt cả ngày dài.\n\n" +
                        "### Thông số kỹ thuật\n" +
                        "%s\n\n" +
                        "### Đối tượng phù hợp\n" +
                        "Sản phẩm là lựa chọn lý tưởng dành cho người dùng cá nhân, học sinh, sinh viên và giới chuyên môn cần một thiết bị bền bỉ, mạnh mẽ và thời trang. "
                        +
                        "Được phân phối chính hãng tại NEXOR với cam kết 100%% New Seal, bảo hành 12 tháng 1 đổi 1 và hỗ trợ giao hàng hỏa tốc toàn quốc.",
                productName, productName, brandPrefix, categoryName, keywordStr, specsBlock);
    }

    private String generateSeoTitle(String productName, String brand, String categoryName) {
        if (StringUtils.hasText(brand)) {
            return String.format("%s %s - Chính Hãng, Giá Tốt Nhất Phân Khúc %s | NEXOR", brand.trim(), productName,
                    categoryName);
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
