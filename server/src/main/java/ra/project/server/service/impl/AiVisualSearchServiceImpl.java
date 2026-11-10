package ra.project.server.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import ra.project.server.exception.BadRequestException;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.response.ProductVariantResponse;
import ra.project.server.model.dto.response.VisualSearchAttributes;
import ra.project.server.model.dto.response.VisualSearchProductItem;
import ra.project.server.model.dto.response.VisualSearchResponse;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.ProductOptionValue;
import ra.project.server.model.entity.ProductVariant;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.AiConfigService;
import ra.project.server.service.AiVisualSearchService;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiVisualSearchServiceImpl implements AiVisualSearchService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Autowired(required = false)
    private AiConfigService aiConfigService;

    @Value("${gemini.api-key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    @Value("${gemini.model:${GEMINI_MODEL:gemini-1.5-flash}}")
    private String geminiModel;

    @Value("${gemini.api-url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String geminiApiUrl;

    private static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );
    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(6))
            .build();

    private String getEffectiveGeminiApiKey() {
        if (aiConfigService != null) return aiConfigService.getEffectiveGeminiApiKey();
        return geminiApiKey;
    }

    private String getEffectiveGeminiModel() {
        if (aiConfigService != null) return aiConfigService.getEffectiveGeminiModel();
        return geminiModel;
    }

    @Override
    @Transactional(readOnly = true)
    public VisualSearchResponse searchByImage(MultipartFile image) {
        // 1. Kiểm tra tính hợp lệ của file tải lên
        validateImageFile(image);

        // 2. Chuyển ảnh sang dạng Base64
        String base64Data;
        String mimeType;
        try {
            byte[] bytes = image.getBytes();
            base64Data = Base64.getEncoder().encodeToString(bytes);
            mimeType = resolveMimeType(image);
        } catch (Exception ex) {
            log.error("Lỗi khi đọc dữ liệu ảnh: {}", ex.getMessage());
            throw new BadRequestException("Không thể xử lý file ảnh tải lên: " + ex.getMessage());
        }

        // 3. Gửi ảnh lên Gemini Vision để nhận diện đặc trưng
        VisualSearchAttributes detectedAttrs = null;
        String provider = "Google Gemini Vision AI";

        try {
            detectedAttrs = callGeminiVisionApi(base64Data, mimeType);
        } catch (Exception ex) {
            log.warn("Gemini Vision API gặp sự cố: {}. Chuyển sang chế độ Smart Fallback", ex.getMessage());
        }

        // 4. Nếu Gemini không trả về kết quả (hết quota, timeout hoặc chưa có API key) -> Kích hoạt Fallback
        if (detectedAttrs == null || (!StringUtils.hasText(detectedAttrs.getCategory()) && !StringUtils.hasText(detectedAttrs.getBrand()))) {
            log.info("Kích hoạt NEXOR Smart Fallback Engine cho visual search");
            detectedAttrs = buildFallbackAttributes(image.getOriginalFilename());
            provider = "NEXOR Smart Fallback";
        }

        log.info("Thuộc tính ảnh nhận diện được: Category='{}', Brand='{}', Color='{}', Keywords={}",
                detectedAttrs.getCategory(), detectedAttrs.getBrand(), detectedAttrs.getColor(), detectedAttrs.getKeywords());

        // 5. Truy vấn ProductRepository & So khớp tính % matchPercent
        List<VisualSearchProductItem> matchedProducts = matchProducts(detectedAttrs);

        return VisualSearchResponse.builder()
                .detectedAttributes(detectedAttrs)
                .totalMatches(matchedProducts.size())
                .products(matchedProducts)
                .provider(provider)
                .build();
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng tải lên file hình ảnh sản phẩm");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("Dung lượng ảnh vượt quá giới hạn cho phép (Tối đa 5MB)");
        }

        String contentType = file.getContentType();
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        boolean isAllowedMime = contentType != null && ALLOWED_MIME_TYPES.contains(contentType.toLowerCase());
        boolean hasAllowedExt = filename.endsWith(".jpg") || filename.endsWith(".jpeg")
                || filename.endsWith(".png") || filename.endsWith(".webp");

        if (!isAllowedMime && !hasAllowedExt) {
            throw new BadRequestException("Định dạng ảnh không hợp lệ. Chỉ chấp nhận các định dạng: JPEG, PNG, WEBP");
        }
    }

    private String resolveMimeType(MultipartFile file) {
        String contentType = file.getContentType();
        if (StringUtils.hasText(contentType) && ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            return contentType.toLowerCase();
        }
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }

    private VisualSearchAttributes callGeminiVisionApi(String base64Data, String mimeType) {
        String apiKey = getEffectiveGeminiApiKey();
        if (!StringUtils.hasText(apiKey)) {
            log.warn("Chưa cấu hình GEMINI_API_KEY trong hệ thống");
            return null;
        }

        String effectiveModel = getEffectiveGeminiModel();
        String[] candidateModels = new String[]{
                effectiveModel,
                "gemini-1.5-flash",
                "gemini-2.0-flash",
                "gemini-2.5-flash"
        };

        String prompt = "Bạn là chuyên gia thẩm định và nhận diện sản phẩm thương mại điện tử công nghệ của sàn NEXOR.\n" +
                "Hãy phân tích hình ảnh sản phẩm và trả về ĐÚNG MỘT JSON hợp lệ duy nhất (không kèm markdown ```json, không kèm giải thích bên ngoài):\n" +
                "{\n" +
                "  \"category\": \"<Tên danh mục sản phẩm, ví dụ: Laptop, Điện thoại, Máy tính bảng, Tai nghe, Chuột, Bàn phím, Âm thanh, Màn hình, Gaming...>\",\n" +
                "  \"brand\": \"<Thương hiệu nhận diện được, ví dụ: Apple, Samsung, Dell, Asus, Sony, Lenovo, HP, Logitech... hoặc Unknown nếu không rõ>\",\n" +
                "  \"color\": \"<Màu sắc chủ đạo của thiết bị, ví dụ: Đen, Trắng, Xám, Bạc, Xanh, Vàng...>\",\n" +
                "  \"keywords\": [\"<từ khóa 1>\", \"<từ khóa 2>\", \"<từ khóa 3>\", \"<từ khóa 4>\"]\n" +
                "}";

        String cleanApiUrl = geminiApiUrl != null && geminiApiUrl.endsWith("/")
                ? geminiApiUrl.substring(0, geminiApiUrl.length() - 1)
                : geminiApiUrl;

        for (String model : candidateModels) {
            if (!StringUtils.hasText(model)) continue;
            try {
                String endpointUrl = String.format("%s/%s:generateContent?key=%s", cleanApiUrl, model.trim(), apiKey.trim());

                Map<String, Object> textPart = Map.of("text", prompt);
                Map<String, Object> inlineData = Map.of(
                        "mime_type", mimeType,
                        "data", base64Data
                );
                Map<String, Object> imagePart = Map.of("inline_data", inlineData);

                Map<String, Object> content = Map.of("parts", List.of(textPart, imagePart));
                Map<String, Object> requestPayload = new LinkedHashMap<>();
                requestPayload.put("contents", List.of(content));

                Map<String, Object> generationConfig = new LinkedHashMap<>();
                generationConfig.put("temperature", 0.2);
                generationConfig.put("responseMimeType", "application/json");
                requestPayload.put("generationConfig", generationConfig);

                String requestBody = objectMapper.writeValueAsString(requestPayload);

                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(endpointUrl))
                        .timeout(Duration.ofSeconds(6))
                        .header("Content-Type", "application/json; charset=utf-8")
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && !candidates.isEmpty()) {
                        JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                        if (!textNode.isMissingNode() && StringUtils.hasText(textNode.asText())) {
                            return parseGeminiJsonResponse(textNode.asText().trim());
                        }
                    }
                } else {
                    log.warn("Gemini Vision (model {}) trả về mã {}: {}", model, response.statusCode(), response.body());
                }
            } catch (Exception ex) {
                log.warn("Gọi Gemini Vision API (model {}) thất bại: {}", model, ex.getMessage());
            }
        }
        return null;
    }

    private VisualSearchAttributes parseGeminiJsonResponse(String rawResponse) {
        if (!StringUtils.hasText(rawResponse)) {
            return null;
        }
        try {
            String cleanedJson = rawResponse.trim();
            // Trích xuất an toàn khối JSON nằm giữa cặp dấu ngoặc {} đầu và cuối
            int startIdx = cleanedJson.indexOf('{');
            int endIdx = cleanedJson.lastIndexOf('}');
            if (startIdx >= 0 && endIdx > startIdx) {
                cleanedJson = cleanedJson.substring(startIdx, endIdx + 1);
            }

            JsonNode node = objectMapper.readTree(cleanedJson);
            String category = node.path("category").asText(null);
            String brand = node.path("brand").asText(null);
            String color = node.path("color").asText(null);

            List<String> keywords = new ArrayList<>();
            JsonNode kwNode = node.path("keywords");
            if (kwNode.isArray()) {
                for (JsonNode kw : kwNode) {
                    if (StringUtils.hasText(kw.asText())) {
                        keywords.add(kw.asText().trim());
                    }
                }
            }

            return VisualSearchAttributes.builder()
                    .category(category)
                    .brand(brand)
                    .color(color)
                    .keywords(keywords)
                    .build();
        } catch (Exception ex) {
            log.error("Không thể phân tích cú pháp JSON từ Gemini Vision: {}", rawResponse, ex);
            return null;
        }
    }

    private VisualSearchAttributes buildFallbackAttributes(String filename) {
        String cleanName = filename != null ? filename.toLowerCase() : "";
        String category = "Thiết bị điện tử";
        String brand = "Apple";
        String color = "Đen / Bạc";
        List<String> keywords = new ArrayList<>(List.of("Công nghệ", "Chính hãng", "NEXOR"));

        if (cleanName.contains("laptop") || cleanName.contains("macbook") || cleanName.contains("dell") || cleanName.contains("thinkpad")) {
            category = "Laptop";
            keywords.add("Laptop");
            if (cleanName.contains("macbook") || cleanName.contains("apple")) {
                brand = "Apple";
                keywords.add("MacBook");
            } else if (cleanName.contains("dell")) {
                brand = "Dell";
                keywords.add("XPS");
            }
        } else if (cleanName.contains("iphone") || cleanName.contains("samsung") || cleanName.contains("phone") || cleanName.contains("dien-thoai")) {
            category = "Điện thoại";
            keywords.add("Smartphone");
            if (cleanName.contains("iphone")) {
                brand = "Apple";
                keywords.add("iPhone");
            } else if (cleanName.contains("samsung")) {
                brand = "Samsung";
                keywords.add("Galaxy");
            }
        } else if (cleanName.contains("ipad") || cleanName.contains("tablet")) {
            category = "Máy tính bảng";
            brand = "Apple";
            keywords.add("iPad");
        } else if (cleanName.contains("tai-nghe") || cleanName.contains("headphone") || cleanName.contains("airpod") || cleanName.contains("sony")) {
            category = "Thiết bị âm thanh";
            brand = "Sony";
            keywords.add("Tai nghe");
        }

        return VisualSearchAttributes.builder()
                .category(category)
                .brand(brand)
                .color(color)
                .keywords(keywords)
                .build();
    }

    private List<VisualSearchProductItem> matchProducts(VisualSearchAttributes attrs) {
        List<Product> allProducts = null;
        try {
            allProducts = productRepository.findAllActiveForSearch();
        } catch (Exception ex) {
            log.debug("findAllActiveForSearch không khả dụng, sử dụng findAll cơ bản: {}", ex.getMessage());
        }

        if (allProducts == null || allProducts.isEmpty()) {
            allProducts = productRepository.findAll().stream()
                    .filter(p -> (p.getIsDeleted() == null || !p.getIsDeleted()) && "ACTIVE".equalsIgnoreCase(p.getStatus()))
                    .collect(Collectors.toList());
        }

        if (allProducts.isEmpty()) {
            return Collections.emptyList();
        }

        String targetCat = removeAccent(attrs.getCategory() != null ? attrs.getCategory().toLowerCase().trim() : "");
        String targetBrand = removeAccent(attrs.getBrand() != null ? attrs.getBrand().toLowerCase().trim() : "");
        String targetColor = removeAccent(attrs.getColor() != null ? attrs.getColor().toLowerCase().trim() : "");
        List<String> targetKws = attrs.getKeywords() != null
                ? attrs.getKeywords().stream().map(kw -> removeAccent(kw.toLowerCase().trim())).filter(StringUtils::hasText).collect(Collectors.toList())
                : Collections.emptyList();

        List<ScoredProduct> scoredList = new ArrayList<>();

        for (Product product : allProducts) {
            int score = 0;
            List<String> reasons = new ArrayList<>();

            // 1. So khớp Danh mục (Tối đa 35%)
            if (StringUtils.hasText(targetCat) && product.getCategory() != null) {
                String pCat = removeAccent(product.getCategory().getName().toLowerCase());
                if (pCat.equals(targetCat)) {
                    score += 35;
                    reasons.add("Khớp chính xác danh mục " + product.getCategory().getName());
                } else if (pCat.contains(targetCat) || targetCat.contains(pCat)) {
                    score += 25;
                    reasons.add("Trùng nhóm danh mục " + product.getCategory().getName());
                }
            }

            // 2. So khớp Thương hiệu (Tối đa 35%)
            if (StringUtils.hasText(targetBrand) && !"unknown".equalsIgnoreCase(targetBrand)) {
                String pBrand = removeAccent(product.getBrand() != null ? product.getBrand().toLowerCase() : "");
                String pName = removeAccent(product.getName().toLowerCase());
                if (StringUtils.hasText(pBrand) && pBrand.equals(targetBrand)) {
                    score += 35;
                    reasons.add("Khớp thương hiệu " + product.getBrand());
                } else if (StringUtils.hasText(pBrand) && (pBrand.contains(targetBrand) || targetBrand.contains(pBrand))) {
                    score += 25;
                    reasons.add("Thuộc thương hiệu " + product.getBrand());
                } else if (pName.contains(targetBrand)) {
                    score += 20;
                    reasons.add("Tên sản phẩm chứa thương hiệu " + attrs.getBrand());
                }
            }

            // 3. So khớp Màu sắc (Tối đa 10%)
            if (StringUtils.hasText(targetColor) && !"unknown".equalsIgnoreCase(targetColor)) {
                String pText = removeAccent((product.getName() + " " + (product.getDescription() != null ? product.getDescription() : "")).toLowerCase());
                boolean colorMatched = pText.contains(targetColor);

                if (!colorMatched && product.getVariants() != null) {
                    for (ProductVariant v : product.getVariants()) {
                        if (v.getOptionValues() != null) {
                            for (ProductOptionValue pov : v.getOptionValues()) {
                                if (pov.getValue() != null && removeAccent(pov.getValue().toLowerCase()).contains(targetColor)) {
                                    colorMatched = true;
                                    break;
                                }
                            }
                        }
                        if (colorMatched) break;
                    }
                }

                if (colorMatched) {
                    score += 10;
                    reasons.add("Trùng màu sắc " + attrs.getColor());
                }
            }

            // 4. So khớp Từ khóa (Tối đa 20%)
            if (!targetKws.isEmpty()) {
                String pFullText = removeAccent((product.getName() + " " + (product.getDescription() != null ? product.getDescription() : "")).toLowerCase());
                int matchedKwCount = 0;
                for (String kw : targetKws) {
                    if (pFullText.contains(kw)) {
                        matchedKwCount++;
                    }
                }
                if (matchedKwCount > 0) {
                    double kwRatio = (double) matchedKwCount / targetKws.size();
                    int kwPoints = Math.min(20, (int) Math.round(kwRatio * 20));
                    score += kwPoints;
                    reasons.add("Trùng " + matchedKwCount + " từ khóa nhận diện");
                }
            }

            int finalPercent = Math.min(100, Math.max(0, score));

            if (finalPercent >= 15) {
                scoredList.add(new ScoredProduct(product, finalPercent, String.join(", ", reasons)));
            }
        }

        // Sắp xếp giảm dần theo điểm % matchPercent
        scoredList.sort((a, b) -> Integer.compare(b.matchPercent, a.matchPercent));

        // Lấy tối đa 10 sản phẩm
        List<ScoredProduct> topMatches = scoredList.stream().limit(10).collect(Collectors.toList());

        // Nếu không có sản phẩm nào đạt ngưỡng >= 15%, lấy tối đa 5 sản phẩm đầu tiên của cửa hàng làm gợi ý
        if (topMatches.isEmpty()) {
            topMatches = allProducts.stream()
                    .limit(5)
                    .map(p -> new ScoredProduct(p, 25, "Gợi ý sản phẩm nổi bật từ NEXOR (chưa khớp chính xác đặc trưng ảnh)"))
                    .collect(Collectors.toList());
        }

        // Chuyển đổi sang VisualSearchProductItem kèm Variant giá tốt nhất
        return topMatches.stream()
                .map(this::toProductItem)
                .collect(Collectors.toList());
    }

    private VisualSearchProductItem toProductItem(ScoredProduct sp) {
        Product product = sp.product;

        // Tìm Variant tốt nhất: active, còn hàng và giá thấp nhất
        ProductVariant bestVariantEntity = null;
        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
            bestVariantEntity = product.getVariants().stream()
                    .filter(v -> Boolean.TRUE.equals(v.getStatus()) && v.getStock() != null && v.getStock() > 0)
                    .min(Comparator.comparing(ProductVariant::getPrice))
                    .orElse(null);

            // Nếu không có variant còn hàng, lấy variant active bất kỳ có giá thấp nhất
            if (bestVariantEntity == null) {
                bestVariantEntity = product.getVariants().stream()
                        .filter(v -> Boolean.TRUE.equals(v.getStatus()))
                        .min(Comparator.comparing(ProductVariant::getPrice))
                        .orElse(null);
            }
        }

        ProductVariantResponse bestVariantResponse = null;
        if (bestVariantEntity != null) {
            bestVariantResponse = productMapper.toVariantResponse(bestVariantEntity);
        }

        BigDecimal effectivePrice = product.getPrice();
        BigDecimal originalPrice = null;

        if (bestVariantEntity != null) {
            effectivePrice = bestVariantEntity.getPrice();
            originalPrice = bestVariantEntity.getOriginalPrice();
        }

        String categoryName = product.getCategory() != null ? product.getCategory().getName() : "Thiết bị điện tử";

        return VisualSearchProductItem.builder()
                .id(product.getId())
                .name(product.getName())
                .brand(product.getBrand())
                .categoryName(categoryName)
                .imageUrl(product.getImageUrl())
                .price(effectivePrice)
                .originalPrice(originalPrice)
                .matchPercent(sp.matchPercent)
                .matchReason(sp.reason)
                .bestVariant(bestVariantResponse)
                .build();
    }

    private String removeAccent(String input) {
        if (!StringUtils.hasText(input)) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        return DIACRITICS_PATTERN.matcher(normalized).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }

    private static class ScoredProduct {
        private final Product product;
        private final int matchPercent;
        private final String reason;

        public ScoredProduct(Product product, int matchPercent, String reason) {
            this.product = product;
            this.matchPercent = matchPercent;
            this.reason = reason;
        }
    }
}

