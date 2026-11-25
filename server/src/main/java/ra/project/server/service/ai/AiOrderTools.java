package ra.project.server.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import ra.project.server.model.dto.OrderDraft;
import ra.project.server.model.dto.response.OrderPreviewDto;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.Product;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.OrderDraftService;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiOrderTools {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final OrderDraftService orderDraftService;

    // ThreadLocal lưu trữ OrderPreviewDto được sinh ra trong turn hiện tại
    private final ThreadLocal<OrderPreviewDto> currentDraftPreview = new ThreadLocal<>();

    public OrderPreviewDto getAndClearCurrentDraft() {
        OrderPreviewDto dto = currentDraftPreview.get();
        currentDraftPreview.remove();
        return dto;
    }

    public void clearCurrentDraft() {
        currentDraftPreview.remove();
    }

    @Tool(
        name = "prepare_order",
        description = "Tạo bản thảo đơn hàng (Order Draft) khi khách hàng muốn đặt mua sản phẩm và đã cung cấp: Tên hoặc ID sản phẩm, Số lượng, Họ và tên người nhận, Số điện thoại và Địa chỉ giao hàng. Nếu khách chưa nhắc đến phương thức thanh toán, mặc định là 'COD' (Thanh toán khi nhận hàng). Tuyệt đối KHÔNG gọi tool khi khách chưa cung cấp Số điện thoại hoặc Địa chỉ."
    )
    public String prepareOrder(
        @ToolParam(description = "ID sản phẩm (số) hoặc tên sản phẩm khách muốn đặt (ví dụ: '1', 'iPhone 15 Pro', 'iPhone 16 Pro Max', 'Tai nghe Sony WH-1000XM5')") String productIdentifier,
        @ToolParam(required = false, description = "Số lượng sản phẩm muốn đặt (mặc định là 1 nếu khách không nói rõ)") Integer quantity,
        @ToolParam(description = "Họ và tên thật của người nhận hàng (CHỈ lấy tên người, ví dụ: 'Nam', 'Nguyễn Văn A', LOẠI BỎ từ xưng hô 'anh/chị', địa chỉ hoặc chữ 'SĐT')") String receiverName,
        @ToolParam(description = "Số điện thoại nhận hàng của khách (gồm 10 số, bắt đầu bằng số 0)") String phoneNumber,
        @ToolParam(description = "Địa chỉ nhận hàng chi tiết của khách (CHỈ lấy phần địa chỉ, ví dụ: '123 Cầu Giấy', 'Số 10 ngõ 5 Hoàng Hoa Thám', LOẠI BỎ câu dẫn 'Tôi muốn đặt... về')") String shippingAddress,
        @ToolParam(required = false, description = "Ghi chú giao hàng nếu có") String note,
        @ToolParam(required = false, description = "Phương thức thanh toán: 'COD' (mặc định nếu khách không nói) hoặc 'VIETQR' (chuyển khoản online)") String paymentMethod
    ) {
        log.info("[AiOrderTools] prepareOrder called with productIdentifier={}, qty={}, name={}, phone={}, addr={}, payment={}",
                productIdentifier, quantity, receiverName, phoneNumber, shippingAddress, paymentMethod);

        // 0. Tiền xử lý và làm sạch dữ liệu đầu vào chống parse lệch
        String cleanReceiverName = receiverName != null ? receiverName.trim() : "";
        cleanReceiverName = cleanReceiverName
                .replaceFirst("(?iu)^(cho\\s+)?(anh|chị|chi|em|bạn|ban|ông|bà)\\s+", "")
                .replaceFirst("(?iu)\\s+(sđt|sdt).*$", "")
                .trim();
        cleanReceiverName = cleanReceiverName
                .replaceFirst("(?iu)^(\\d+.*?(cầu giấy|hoàn kiếm|đống đa|ba đình|hai bà trưng|thanh xuân|hà nội|hồ chí minh|quận|huyện|phường|xã|đường|phố))\\s+", "")
                .trim();

        String cleanShippingAddress = shippingAddress != null ? shippingAddress.trim() : "";
        cleanShippingAddress = cleanShippingAddress
                .replaceFirst("(?iu)^(tôi muốn đặt.*?về|tôi muốn mua.*?về|đặt về|giao về|giao đến|địa chỉ:?|ship về|ship đến)\\s+", "")
                .replaceFirst("(?iu)\\s+(cho\\s+)?(anh|chị|chi|em|bạn|ban)?\\s+[a-zA-ZÀ-ỹ\\s]+(sđt|sdt).*$", "")
                .replaceFirst("(?iu)\\s+(sđt|sdt).*$", "")
                .trim();

        String cleanPhoneNumber = phoneNumber != null ? phoneNumber.replaceAll("[\\s\\.\\-]", "") : "";

        // 1. Backend Validation
        String nameErr = validateReceiverName(cleanReceiverName);
        if (nameErr != null) {
            log.warn("[AiOrderTools] Tên người nhận bị từ chối: {}", nameErr);
            return nameErr;
        }
        String phoneErr = validatePhoneNumber(cleanPhoneNumber);
        if (phoneErr != null) {
            log.warn("[AiOrderTools] Số điện thoại bị từ chối: {}", phoneErr);
            return phoneErr;
        }
        String addrErr = validateShippingAddress(cleanShippingAddress);
        if (addrErr != null) {
            log.warn("[AiOrderTools] Địa chỉ giao hàng bị từ chối: {}", addrErr);
            return addrErr;
        }

        String formattedReceiverName = capitalizeWords(cleanReceiverName);

        // 2. Tìm sản phẩm trong kho
        Product product = resolveProduct(productIdentifier);
        if (product == null) {
            return "Không tìm thấy sản phẩm '" + productIdentifier + "' trong hệ thống cửa hàng. Vui lòng hỏi lại khách hàng tên sản phẩm chính xác.";
        }
        if (product.getStock() != null && product.getStock() <= 0) {
            return "Sản phẩm '" + product.getName() + "' hiện đã tạm hết hàng trong kho.";
        }

        int qty = (quantity != null && quantity > 0) ? quantity : 1;
        BigDecimal unitPrice = product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO;
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(qty));

        PaymentMethod pm = PaymentMethod.COD;
        String pmName = "Thanh toán khi nhận hàng (COD)";
        if (paymentMethod != null) {
            String upperPm = paymentMethod.toUpperCase();
            if (upperPm.contains("QR") || upperPm.contains("SEPAY") || upperPm.contains("ONLINE") || upperPm.contains("CHUYEN_KHOAN")) {
                pm = PaymentMethod.SEPAY;
                pmName = "Chuyển khoản VietQR Online (SePay)";
            }
        }

        String draftId = "DRAFT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        long now = System.currentTimeMillis();
        long expiresAt = now + 5 * 60 * 1000L; // TTL 5 phút (đồng bộ thời hạn giữ đơn QR)

        String cleanNote = StringUtils.hasText(note) ? note.trim() : "Không có";

        OrderDraft draft = OrderDraft.builder()
                .draftId(draftId)
                .productId(product.getId())
                .productName(product.getName())
                .productImageUrl(product.getImageUrl())
                .quantity(qty)
                .unitPrice(unitPrice)
                .totalAmount(totalAmount)
                .receiverName(formattedReceiverName)
                .phoneNumber(cleanPhoneNumber)
                .shippingAddress(cleanShippingAddress)
                .note(cleanNote)
                .paymentMethod(pm)
                .paymentMethodName(pmName)
                .createdAt(now)
                .expiresAt(expiresAt)
                .build();

        orderDraftService.saveDraft(draft);

        OrderPreviewDto previewDto = OrderPreviewDto.builder()
                .draftId(draftId)
                .productId(product.getId())
                .productName(product.getName())
                .productImageUrl(product.getImageUrl())
                .quantity(qty)
                .unitPrice(unitPrice)
                .totalAmount(totalAmount)
                .receiverName(draft.getReceiverName())
                .phoneNumber(draft.getPhoneNumber())
                .shippingAddress(draft.getShippingAddress())
                .note(cleanNote)
                .paymentMethod(pm)
                .paymentMethodName(pmName)
                .awaitingConfirmation(true)
                .build();

        currentDraftPreview.set(previewDto);

        Locale vn = Locale.forLanguageTag("vi-VN");
        NumberFormat nf = NumberFormat.getInstance(vn);

        return String.format(
                "Đã tạo bản thảo đơn hàng thành công [Mã nháp: %s]!\n" +
                "- Sản phẩm: %s (SL: %d)\n" +
                "- Tổng tiền: %s\n" +
                "- Người nhận: %s (%s)\n" +
                "- Địa chỉ: %s\n" +
                "- Hình thức: %s\n" +
                "Phiếu xác nhận thông tin đơn hàng đã được hiển thị trực tiếp ra màn hình với 2 nút [Xác nhận] và [Hủy]. " +
                "Hãy thông báo ngắn gọn lịch sự để khách hàng kiểm tra lại thông tin và bấm nút 'Xác nhận' trên màn hình để hoàn tất lên đơn (hoặc bấm 'Hủy' nếu đổi ý).",
                draftId, product.getName(), qty, nf.format(totalAmount) + "đ",
                draft.getReceiverName(), draft.getPhoneNumber(), draft.getShippingAddress(), pmName
        );
    }

    @Tool(
        name = "track_order",
        description = "Tra cứu thông tin và tình trạng đơn hàng theo mã đơn hàng (#NXR-...) hoặc số điện thoại của khách."
    )
    public String trackOrder(
        @ToolParam(required = false, description = "Mã đơn hàng, ví dụ: 24, #24, #NXR-24") String orderId,
        @ToolParam(required = false, description = "Số điện thoại đặt hàng") String phoneNumber
    ) {
        log.info("[AiOrderTools] trackOrder called with orderId={}, phone={}", orderId, phoneNumber);

        Order targetOrder = null;
        if (StringUtils.hasText(orderId)) {
            String cleanId = orderId.replaceAll("[^0-9]", "");
            if (StringUtils.hasText(cleanId)) {
                try {
                    Long id = Long.parseLong(cleanId);
                    targetOrder = orderRepository.findById(id).orElse(null);
                } catch (Exception ignored) {}
            }
        }

        if (targetOrder == null && StringUtils.hasText(phoneNumber)) {
            String cleanPhone = phoneNumber.replaceAll("[^0-9]", "");
            List<Order> orders = orderRepository.findAll().stream()
                    .filter(o -> cleanPhone.equals(o.getPhoneNumber()))
                    .sorted((o1, o2) -> o2.getCreatedAt().compareTo(o1.getCreatedAt()))
                    .toList();
            if (!orders.isEmpty()) {
                targetOrder = orders.get(0);
            }
        }

        if (targetOrder == null) {
            return "Không tìm thấy thông tin đơn hàng phù hợp. Vui lòng hỏi lại khách hàng Mã đơn hàng (ví dụ #24) hoặc Số điện thoại đặt hàng.";
        }

        Locale vn = Locale.forLanguageTag("vi-VN");
        NumberFormat nf = NumberFormat.getInstance(vn);
        String totalStr = targetOrder.getTotalAmount() != null ? nf.format(targetOrder.getTotalAmount()) + "đ" : "0đ";

        String statusVn = switch (targetOrder.getStatus()) {
            case PENDING -> "Chờ xử lý";
            case PROCESSING -> "Đang xử lý tại kho";
            case SHIPPING -> "Đang giao hàng";
            case COMPLETED -> "Giao hàng thành công";
            case CANCELLED -> "Đã hủy";
            default -> targetOrder.getStatus().name();
        };

        return String.format(
                "Thông tin đơn hàng #NXR-%d:\n" +
                "- Người nhận: %s (%s)\n" +
                "- Địa chỉ giao: %s\n" +
                "- Tổng tiền: %s\n" +
                "- Trạng thái đơn hàng: %s\n" +
                "- Thanh toán: %s (%s)",
                targetOrder.getId(),
                targetOrder.getReceiverName(), targetOrder.getPhoneNumber(),
                targetOrder.getShippingAddress(), totalStr, statusVn,
                targetOrder.getPaymentMethod(), targetOrder.getPaymentStatus()
        );
    }

    @Tool(
        name = "cancel_order",
        description = "Hủy đơn hàng của khách. QUY TẮC BẮT BUỘC: Chỉ cho phép hủy khi đơn hàng ở trạng thái PENDING (Chờ xử lý). Nếu đơn đã sang PROCESSING, SHIPPING hoặc COMPLETED thì từ chối hủy."
    )
    public String cancelOrder(
        @ToolParam(description = "Mã đơn hàng cần hủy, ví dụ: 24, #24") String orderId,
        @ToolParam(required = false, description = "Lý do hủy đơn") String reason
    ) {
        log.info("[AiOrderTools] cancelOrder called with orderId={}, reason={}", orderId, reason);

        if (!StringUtils.hasText(orderId)) {
            return "Vui lòng cung cấp mã đơn hàng cần hủy.";
        }

        String cleanId = orderId.replaceAll("[^0-9]", "");
        Long id;
        try {
            id = Long.parseLong(cleanId);
        } catch (Exception e) {
            return "Mã đơn hàng không hợp lệ.";
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return "Không tìm thấy đơn hàng #NXR-" + id + " trong hệ thống.";
        }

        if (order.getStatus() == OrderStatus.CANCELLED) {
            return "Đơn hàng #NXR-" + id + " đã được hủy trước đó rồi ạ.";
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            return "Đơn hàng #NXR-" + id + " hiện đang ở trạng thái '" + order.getStatus() +
                    "' (đã được kho xử lý/giao vận) nên không thể hủy trực tiếp qua trợ lý AI. Vui lòng liên hệ hotline hỗ trợ khẩn cấp.";
        }

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
        return "Đã hủy thành công đơn hàng #NXR-" + id + " theo yêu cầu của quý khách.";
    }

    @Tool(
        name = "update_address",
        description = "Cập nhật địa chỉ nhận hàng mới cho đơn hàng. QUY TẮC BẮT BUỘC: Chỉ cho phép cập nhật khi đơn hàng ở trạng thái PENDING (Chờ xử lý)."
    )
    public String updateAddress(
        @ToolParam(description = "Mã đơn hàng cần đổi địa chỉ, ví dụ: 24, #24") String orderId,
        @ToolParam(description = "Địa chỉ nhận hàng mới chi tiết") String newAddress
    ) {
        log.info("[AiOrderTools] updateAddress called with orderId={}, newAddress={}", orderId, newAddress);

        if (!StringUtils.hasText(orderId)) {
            return "Vui lòng cung cấp mã đơn hàng cần đổi địa chỉ.";
        }
        if (!StringUtils.hasText(newAddress) || newAddress.trim().length() < 5) {
            return "Địa chỉ mới không hợp lệ hoặc quá ngắn. Vui lòng cung cấp địa chỉ cụ thể.";
        }

        String cleanId = orderId.replaceAll("[^0-9]", "");
        Long id;
        try {
            id = Long.parseLong(cleanId);
        } catch (Exception e) {
            return "Mã đơn hàng không hợp lệ.";
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return "Không tìm thấy đơn hàng #NXR-" + id + " trong hệ thống.";
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            return "Đơn hàng #NXR-" + id + " hiện đang ở trạng thái '" + order.getStatus() +
                    "', đơn đã được xuất kho xử lý nên không thể thay đổi địa chỉ lúc này.";
        }

        order.setShippingAddress(newAddress.trim());
        orderRepository.save(order);
        return "Đã cập nhật thành công địa chỉ giao hàng mới cho đơn #NXR-" + id + ": " + newAddress.trim();
    }

    // --- Validation Helpers ---

    private String validateReceiverName(String name) {
        if (!StringUtils.hasText(name)) {
            return "Họ tên người nhận không được để trống. Vui lòng hỏi lại họ và tên của khách hàng.";
        }
        String clean = name.trim();
        if (clean.length() < 2 || clean.length() > 50) {
            return "Họ tên người nhận phải từ 2 đến 50 ký tự. Vui lòng hỏi lại tên người nhận chính xác của khách hàng.";
        }
        String lower = clean.toLowerCase();
        // Từ chối tên chứa các câu nói thông thường, câu hỏi, từ chối
        List<String> forbidden = List.of(
                "thôi", "thoi", "hủy", "huy", "không", "khong", "ko",
                "chưa", "chua", "tôi", "toi", "mã", "ma", "qr", "shop",
                "đơn", "don", "hàng", "hang", "mua", "bán", "ban", "gì", "gi",
                "sao", "ở đâu", "o dau", "lỗi", "loi", "hỏi", "hoi", "tìm", "tim",
                "xem", "check", "alo", "dạ", "da"
        );
        for (String f : forbidden) {
            if (lower.matches(".*\\b" + Pattern.quote(f) + "\\b.*")) {
                return "Họ tên người nhận '" + clean + "' không hợp lệ vì chứa từ ngữ nhầm lẫn ('" + f + "'). Vui lòng hỏi lại họ và tên thật của khách hàng trước khi tạo đơn.";
            }
        }
        return null;
    }

    private String validatePhoneNumber(String phone) {
        if (!StringUtils.hasText(phone)) {
            return "Số điện thoại nhận hàng không được để trống. Vui lòng xin lại số điện thoại nhận hàng của khách.";
        }
        String clean = phone.replaceAll("[\\s\\.\\-]", "");
        if (!clean.matches("^0[35789]\\d{8}$")) {
            return "Số điện thoại '" + phone + "' không hợp lệ (phải gồm 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09). Vui lòng xin lại số điện thoại chính xác của khách.";
        }
        return null;
    }

    private String validateShippingAddress(String address) {
        if (!StringUtils.hasText(address) || address.trim().length() < 4) {
            return "Địa chỉ nhận hàng quá ngắn hoặc không rõ ràng. Vui lòng xin lại địa chỉ nhận hàng chi tiết (số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố).";
        }
        return null;
    }

    private String capitalizeWords(String text) {
        if (!StringUtils.hasText(text)) return text;
        String[] words = text.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) {
                if (sb.length() > 0) sb.append(" ");
                sb.append(Character.toUpperCase(w.charAt(0)));
                if (w.length() > 1) {
                    sb.append(w.substring(1).toLowerCase());
                }
            }
        }
        return sb.toString();
    }

    private Product resolveProduct(String identifier) {
        if (!StringUtils.hasText(identifier)) return null;
        String trimmed = identifier.trim();

        // 1. Chỉ parse là ID nếu identifier là dạng số thuần hoặc "[ID: 1]", "#1"
        if (trimmed.matches("^(?i)(\\[?id:?\\s*)?#?\\d+\\]?$")) {
            String num = trimmed.replaceAll("[^0-9]", "");
            if (StringUtils.hasText(num)) {
                try {
                    Long id = Long.parseLong(num);
                    Optional<Product> pOpt = productRepository.findById(id);
                    if (pOpt.isPresent()) return pOpt.get();
                } catch (Exception ignored) {}
            }
        }

        List<Product> all = productRepository.findAll().stream()
                .filter(p -> p.getStatus() == null || !"INACTIVE".equalsIgnoreCase(p.getStatus()))
                .toList();
        if (all.isEmpty()) return null;

        String lowerId = trimmed.toLowerCase();

        // 2. Tìm kiếm chính xác hoặc contains tên sản phẩm
        for (Product p : all) {
            if (p.getName() != null && p.getName().toLowerCase().contains(lowerId)) {
                return p;
            }
        }

        // 3. Match từ khóa theo độ tương đồng cao nhất
        List<String> searchTokens = Arrays.stream(lowerId.replaceAll("[^a-zA-Z0-9à-ỹ\\s]", " ").split("\\s+"))
                .filter(w -> w.length() >= 2 && !Set.of("muon", "dat", "mua", "chiec", "cai", "may", "dien", "thoai").contains(w))
                .toList();

        Product bestMatch = null;
        int maxScore = 0;
        for (Product p : all) {
            String pName = p.getName() != null ? p.getName().toLowerCase() : "";
            int score = 0;
            for (String token : searchTokens) {
                if (pName.contains(token)) {
                    score += token.length() >= 4 ? 20 : 10;
                    if (Set.of("15", "16", "24", "m3", "pro", "max", "ultra", "sony", "rog", "macbook", "ipad", "air", "plus").contains(token)) {
                        score += 30;
                    }
                }
            }
            if (score > maxScore) {
                maxScore = score;
                bestMatch = p;
            }
        }

        if (maxScore >= 30) {
            return bestMatch;
        }

        return null;
    }
}
