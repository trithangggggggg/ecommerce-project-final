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

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );
    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
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

        // 3. Gửi ảnh lên Gemini Vision để nhận diện đặc trưng (Giai đoạn 1: AI Visual Identification)
        VisualSearchAttributes detectedAttrs = null;
        String provider = "Google Gemini Vision AI";

        try {
            detectedAttrs = callGeminiVisionApi(base64Data, mimeType);
        } catch (Exception ex) {
            log.warn("Gemini Vision API gặp sự cố: {}. Chuyển sang chế độ Smart Fallback", ex.getMessage());
        }

        // 4. Nếu Gemini không trả về kết quả (hết quota, timeout hoặc chưa cấu hình API key) -> Kích hoạt Fallback
        if (detectedAttrs == null || (!StringUtils.hasText(detectedAttrs.getCategory()) && !StringUtils.hasText(detectedAttrs.getBrand()))) {
            log.info("Kích hoạt NEXOR Smart Fallback Engine cho visual search");
            detectedAttrs = buildFallbackAttributes(image.getOriginalFilename());
            provider = "NEXOR Smart Fallback";
        }

        log.info("Kết quả nhận diện ảnh AI: Brand='{}', ProductLine='{}', Title='{}', Category='{}', Color='{}', Confidence='{}'",
                detectedAttrs.getBrand(), detectedAttrs.getProductLine(), detectedAttrs.getIdentifiedTitle(),
                detectedAttrs.getCategory(), detectedAttrs.getColor(), detectedAttrs.getConfidence());

        // 5. Giai đoạn 2: Truy vấn ProductRepository & So khớp dòng sản phẩm trong kho hàng NEXOR
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
        List<String> candidateModels = new ArrayList<>();
        if (StringUtils.hasText(effectiveModel) && !effectiveModel.contains("3.5")) {
            candidateModels.add(effectiveModel.trim());
        }
        if (!candidateModels.contains("gemini-1.5-flash")) candidateModels.add("gemini-1.5-flash");
        if (!candidateModels.contains("gemini-2.0-flash")) candidateModels.add("gemini-2.0-flash");
        if (!candidateModels.contains("gemini-2.5-flash")) candidateModels.add("gemini-2.5-flash");
        if (!candidateModels.contains("gemini-1.5-pro")) candidateModels.add("gemini-1.5-pro");

        String prompt = "Bạn là chuyên gia thẩm định và nhận diện thiết bị công nghệ hàng đầu của sàn thương mại điện tử NEXOR.\n" +
                "Nhiệm vụ của bạn là quan sát kỹ logo, phom dáng, cụm camera, cổng kết nối, viền màn hình, bàn phím và các đặc điểm vật lý trong hình ảnh để nhận diện chính xác thương hiệu và dòng sản phẩm cụ thể.\n" +
                "Hãy trả về ĐÚNG MỘT JSON hợp lệ duy nhất (không kèm markdown ```json, không kèm giải thích bên ngoài):\n" +
                "{\n" +
                "  \"isTechProduct\": true,\n" +
                "  \"brand\": \"<Thương hiệu nhận diện chuẩn xác nhất, ví dụ: Apple, Samsung, Sony, Asus, Dell, Lenovo, HP, Logitech, Acer, MSI, Xiaomi... hoặc Unknown nếu không rõ>\",\n" +
                "  \"category\": \"<Tên danh mục thiết bị: Laptop, Điện thoại, Máy tính bảng, Thiết bị âm thanh, Đồng hồ & Phụ kiện, Linh kiện & Phụ kiện, hoặc Khác>\",\n" +
                "  \"productLine\": \"<Dòng sản phẩm cụ thể nhận diện được, ví dụ: MacBook Air, MacBook Pro, iPhone 16 Pro, Galaxy S24 Ultra, ROG Strix, WH-1000XM5, iPad Air, ThinkPad...>\",\n" +
                "  \"identifiedTitle\": \"<Tên thương mại chi tiết nhất nhận diện từ hình ảnh, ví dụ: Apple MacBook Air M3 13-inch, Sony WH-1000XM4 Wireless Headphones, Samsung Galaxy S24 Ultra...>\",\n" +
                "  \"color\": \"<Màu sắc chủ đạo, ví dụ: Xám không gian, Bạc, Đen, Trắng, Titan tự nhiên, Xanh dương, Vàng...>\",\n" +
                "  \"confidence\": \"<HIGH nếu nhìn rõ logo/phom dáng/thiết kế đặc trưng, MEDIUM nếu nhận diện được dòng chung, LOW nếu mờ/không rõ>\",\n" +
                "  \"distinctiveFeatures\": [\"<đặc điểm nhận dạng 1, vd: Logo quả táo cắn dở phía sau>\", \"<đặc điểm nhận dạng 2, vd: Cụm 3 camera bếp từ>\", \"<đặc điểm nhận dạng 3>\"],\n" +
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
                        "mimeType", mimeType,
                        "data", base64Data
                );
                Map<String, Object> imagePart = Map.of("inlineData", inlineData);

                Map<String, Object> content = Map.of("parts", List.of(textPart, imagePart));
                Map<String, Object> requestPayload = new LinkedHashMap<>();
                requestPayload.put("contents", List.of(content));

                Map<String, Object> generationConfig = new LinkedHashMap<>();
                generationConfig.put("temperature", 0.1);
                generationConfig.put("responseMimeType", "application/json");
                requestPayload.put("generationConfig", generationConfig);

                String requestBody = objectMapper.writeValueAsString(requestPayload);

                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(endpointUrl))
                        .timeout(Duration.ofSeconds(15))
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
                            VisualSearchAttributes parsed = parseGeminiJsonResponse(textNode.asText().trim());
                            if (parsed != null && (StringUtils.hasText(parsed.getCategory()) || StringUtils.hasText(parsed.getBrand()))) {
                                return parsed;
                            }
                        }
                    }
                } else {
                    log.warn("Gemini Vision (model {}) trả về mã {}: {}", model, response.statusCode(), response.body());
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                log.warn("Gọi Gemini Vision API (model {}) bị gián đoạn: {}", model, ex.getMessage());
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
            int startIdx = cleanedJson.indexOf('{');
            int endIdx = cleanedJson.lastIndexOf('}');
            if (startIdx >= 0 && endIdx > startIdx) {
                cleanedJson = cleanedJson.substring(startIdx, endIdx + 1);
            }

            JsonNode node = objectMapper.readTree(cleanedJson);
            String category = node.path("category").asText(null);
            String brand = node.path("brand").asText(null);
            String productLine = node.path("productLine").asText(null);
            String identifiedTitle = node.path("identifiedTitle").asText(null);
            String color = node.path("color").asText(null);
            String confidence = node.path("confidence").asText("HIGH");
            Boolean isTechProduct = node.has("isTechProduct") ? node.path("isTechProduct").asBoolean(true) : true;

            List<String> distinctiveFeatures = new ArrayList<>();
            JsonNode featNode = node.path("distinctiveFeatures");
            if (featNode.isArray()) {
                for (JsonNode f : featNode) {
                    if (StringUtils.hasText(f.asText())) {
                        distinctiveFeatures.add(f.asText().trim());
                    }
                }
            }

            List<String> keywords = new ArrayList<>();
            JsonNode kwNode = node.path("keywords");
            if (kwNode.isArray()) {
                for (JsonNode kw : kwNode) {
                    if (StringUtils.hasText(kw.asText())) {
                        keywords.add(kw.asText().trim());
                    }
                }
            }

            // Nếu chưa có identifiedTitle thì tự tổng hợp từ Brand + ProductLine
            if (!StringUtils.hasText(identifiedTitle)) {
                StringBuilder sb = new StringBuilder();
                if (StringUtils.hasText(brand) && !"unknown".equalsIgnoreCase(brand)) sb.append(brand).append(" ");
                if (StringUtils.hasText(productLine)) sb.append(productLine);
                else if (StringUtils.hasText(category)) sb.append(category);
                identifiedTitle = sb.toString().trim();
            }

            return VisualSearchAttributes.builder()
                    .category(category)
                    .brand(brand)
                    .productLine(productLine)
                    .identifiedTitle(identifiedTitle)
                    .color(color)
                    .confidence(confidence)
                    .isTechProduct(isTechProduct)
                    .distinctiveFeatures(distinctiveFeatures)
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
        String productLine = "Công nghệ";
        String identifiedTitle = "Thiết bị công nghệ NEXOR";
        String color = "Đen / Bạc";
        String confidence = "HIGH";
        List<String> distinctiveFeatures = new ArrayList<>(List.of("Thiết kế hiện đại", "Chất liệu cao cấp"));
        List<String> keywords = new ArrayList<>(List.of("Công nghệ", "Chính hãng", "NEXOR"));

        if (cleanName.contains("tai-nghe") || cleanName.contains("headphone") || cleanName.contains("earphone") || cleanName.contains("airpod") || cleanName.contains("sony")) {
            category = "Thiết bị âm thanh";
            if (cleanName.contains("airpod")) {
                brand = "Apple";
                productLine = "AirPods";
                identifiedTitle = "Apple AirPods True Wireless";
            } else {
                brand = "Sony";
                productLine = "WH-1000XM / WF-1000XM";
                identifiedTitle = "Tai nghe chống ồn Sony chính hãng";
            }
            keywords.add("Tai nghe");
            distinctiveFeatures = List.of("Đệm tai êm ái chống ồn chủ động", "Chất âm chuẩn Hi-Res");
        } else if (cleanName.contains("laptop") || cleanName.contains("macbook") || cleanName.contains("dell") || cleanName.contains("thinkpad") || cleanName.contains("asus") || cleanName.contains("rog")) {
            category = "Laptop";
            keywords.add("Laptop");
            if (cleanName.contains("macbook") || cleanName.contains("apple")) {
                brand = "Apple";
                productLine = "MacBook";
                identifiedTitle = "Apple MacBook Pro / Air";
                keywords.add("MacBook");
                distinctiveFeatures = List.of("Vỏ nhôm Unibody nguyên khối", "Màn hình Retina tai thỏ", "Bàn phím Magic Keyboard");
            } else if (cleanName.contains("dell")) {
                brand = "Dell";
                productLine = "XPS";
                identifiedTitle = "Laptop Dell XPS Ultrabook";
                keywords.add("XPS");
                distinctiveFeatures = List.of("Màn hình InfinityEdge viền siêu mỏng", "Khung nhôm và sợi carbon");
            } else if (cleanName.contains("asus") || cleanName.contains("rog")) {
                brand = "ASUS";
                productLine = "ROG Strix";
                identifiedTitle = "Laptop Gaming ASUS ROG Strix";
                keywords.add("ROG");
                distinctiveFeatures = List.of("Hệ thống LED RGB Aura Sync", "Tản nhiệt buồng hơi chuẩn Gaming");
            } else {
                brand = "Dell";
                productLine = "Laptop";
                identifiedTitle = "Laptop văn phòng & đồ họa";
            }
        } else if (cleanName.contains("iphone") || cleanName.contains("samsung") || cleanName.contains("galaxy") || cleanName.contains("phone") || cleanName.contains("dien-thoai")) {
            category = "Điện thoại";
            keywords.add("Smartphone");
            if (cleanName.contains("iphone")) {
                brand = "Apple";
                productLine = "iPhone";
                identifiedTitle = "Điện thoại Apple iPhone Flagship";
                keywords.add("iPhone");
                distinctiveFeatures = List.of("Khung viền Titan phẳng", "Cụm camera ba mắt chéo", "Màn hình Dynamic Island");
            } else if (cleanName.contains("samsung") || cleanName.contains("galaxy")) {
                brand = "Samsung";
                productLine = "Galaxy";
                identifiedTitle = "Samsung Galaxy S-Series Ultra";
                keywords.add("Galaxy");
                distinctiveFeatures = List.of("Cụm camera đa ống kính rời", "Thiết kế góc cạnh vuông vức");
            } else {
                brand = "Samsung";
                productLine = "Smartphone";
                identifiedTitle = "Điện thoại thông minh Android";
            }
        } else if (cleanName.contains("ipad") || cleanName.contains("tablet")) {
            category = "Máy tính bảng";
            brand = "Apple";
            productLine = "iPad";
            identifiedTitle = "Apple iPad Tablet";
            keywords.add("iPad");
            distinctiveFeatures = List.of("Màn hình Retina viền mỏng", "Hỗ trợ bút cảm ứng Apple Pencil");
        }

        return VisualSearchAttributes.builder()
                .category(category)
                .brand(brand)
                .productLine(productLine)
                .identifiedTitle(identifiedTitle)
                .color(color)
                .confidence(confidence)
                .isTechProduct(true)
                .distinctiveFeatures(distinctiveFeatures)
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
                    .filter(p -> (p.getIsDeleted() == null || !p.getIsDeleted()) &&
                            (p.getStatus() == null || "ACTIVE".equalsIgnoreCase(p.getStatus()) || "1".equals(p.getStatus()) || "true".equalsIgnoreCase(p.getStatus())))
                    .collect(Collectors.toList());
        }

        if (allProducts.isEmpty()) {
            return Collections.emptyList();
        }

        // Nếu ảnh nhận diện rõ ràng KHÔNG PHẢI thiết bị công nghệ (chó mèo, đồ ăn, xe cộ...) -> Không match gán ép
        if (Boolean.FALSE.equals(attrs.getIsTechProduct())) {
            log.info("Hình ảnh không phải thiết bị công nghệ -> Trả về danh sách rỗng");
            return Collections.emptyList();
        }

        String targetCat = removeAccent(attrs.getCategory() != null ? attrs.getCategory().toLowerCase().trim() : "");
        String targetBrand = removeAccent(attrs.getBrand() != null ? attrs.getBrand().toLowerCase().trim() : "");
        String targetProductLine = removeAccent(attrs.getProductLine() != null ? attrs.getProductLine().toLowerCase().trim() : "");
        String targetColor = removeAccent(attrs.getColor() != null ? attrs.getColor().toLowerCase().trim() : "");
        List<String> targetKws = attrs.getKeywords() != null
                ? attrs.getKeywords().stream().map(kw -> removeAccent(kw.toLowerCase().trim())).filter(StringUtils::hasText).collect(Collectors.toList())
                : Collections.emptyList();

        List<ScoredProduct> scoredList = new ArrayList<>();

        for (Product product : allProducts) {
            int score = 0;
            List<String> reasons = new ArrayList<>();

            String pCat = product.getCategory() != null ? removeAccent(product.getCategory().getName().toLowerCase()) : "";
            String pBrand = removeAccent(product.getBrand() != null ? product.getBrand().toLowerCase() : "");
            String pName = removeAccent(product.getName().toLowerCase());

            // 1. So khớp Danh mục (Tối đa 35%)
            if (StringUtils.hasText(targetCat) && StringUtils.hasText(pCat)) {
                if (pCat.equals(targetCat)) {
                    score += 35;
                    reasons.add("Khớp chính xác danh mục " + product.getCategory().getName());
                } else if (pCat.contains(targetCat) || targetCat.contains(pCat)) {
                    score += 25;
                    reasons.add("Trùng nhóm danh mục " + product.getCategory().getName());
                }
            }

            // 2. So khớp Thương hiệu (Tối đa 35%)
            boolean brandMatched = false;
            if (StringUtils.hasText(targetBrand) && !"unknown".equalsIgnoreCase(targetBrand)) {
                if (StringUtils.hasText(pBrand) && pBrand.equals(targetBrand)) {
                    score += 35;
                    brandMatched = true;
                    reasons.add("Khớp thương hiệu " + product.getBrand());
                } else if (StringUtils.hasText(pBrand) && (pBrand.contains(targetBrand) || targetBrand.contains(pBrand))) {
                    score += 25;
                    brandMatched = true;
                    reasons.add("Thuộc thương hiệu " + product.getBrand());
                } else if (pName.contains(targetBrand)) {
                    score += 20;
                    brandMatched = true;
                    reasons.add("Tên sản phẩm chứa thương hiệu " + attrs.getBrand());
                }
            }

            // 3. So khớp Dòng sản phẩm / Model Name cụ thể (Tối đa 30% điểm thưởng quyết định)
            if (StringUtils.hasText(targetProductLine)) {
                String[] lineTokens = targetProductLine.split("\\s+");
                int lineTokenMatches = 0;
                for (String token : lineTokens) {
                    if (token.length() >= 2 && pName.contains(token)) {
                        lineTokenMatches++;
                    }
                }

                if (pName.contains(targetProductLine)) {
                    score += 30;
                    reasons.add("Khớp chính xác dòng " + attrs.getProductLine());
                } else if (lineTokenMatches > 0) {
                    int linePoints = Math.min(25, lineTokenMatches * 15);
                    score += linePoints;
                    reasons.add("Khớp đặc điểm dòng " + attrs.getProductLine());
                }
            }

            // 4. So khớp Màu sắc (Tối đa 10%)
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

            // 5. So khớp Từ khóa (Tối đa 20%)
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
        if (bestVariantEntity != null && productMapper != null) {
            try {
                bestVariantResponse = productMapper.toVariantResponse(bestVariantEntity);
            } catch (Exception ignored) {
            }
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
