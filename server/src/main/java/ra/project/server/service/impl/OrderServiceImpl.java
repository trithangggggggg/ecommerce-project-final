package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ForbiddenException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.mapper.OrderMapper;
import ra.project.server.model.dto.request.CheckoutRequest;
import ra.project.server.model.dto.request.OrderItemRequest;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.entity.*;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.repository.ProductVariantRepository;
import ra.project.server.repository.PromotionRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.service.OrderService;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final PromotionRepository promotionRepository;
    private final UserRepository userRepository;
    private final OrderMapper orderMapper;

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác này");
        }

        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "tên tài khoản", username));
    }

    @Override
    @Transactional
    public ApiResponse<OrderResponse> checkout(CheckoutRequest request) {
        User user = getCurrentAuthenticatedUser();

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Danh sách sản phẩm đặt hàng không được để trống");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new BadRequestException("Số lượng đặt hàng cho mỗi sản phẩm phải lớn hơn 0");
            }

            ProductVariant variant;
            Product product;

            if (itemReq.getVariantId() != null) {
                variant = productVariantRepository.findById(itemReq.getVariantId())
                        .orElseThrow(() -> new ResourceNotFoundException("Biến thể sản phẩm", "id", itemReq.getVariantId()));
                product = variant.getProduct();
            } else if (itemReq.getProductId() != null) {
                product = productRepository.findById(itemReq.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", itemReq.getProductId()));
                List<ProductVariant> variants = productVariantRepository.findByProductIdAndStatusTrue(product.getId());
                if (variants.isEmpty()) {
                    throw new BadRequestException("Sản phẩm '" + product.getName() + "' hiện không có biến thể khả dụng!");
                }
                variant = variants.get(0);
            } else {
                throw new BadRequestException("Vui lòng chọn biến thể sản phẩm (variantId) hoặc sản phẩm (productId)");
            }

            if (Boolean.FALSE.equals(product.getStatus()) || Boolean.FALSE.equals(variant.getStatus())) {
                throw new BadRequestException("Sản phẩm '" + product.getName() + "' (" + variant.getSku() + ") hiện đang ngừng kinh doanh");
            }

            String productName = product.getName();
            String variantName = "Tiêu chuẩn";
            if (variant.getOptionValues() != null && !variant.getOptionValues().isEmpty()) {
                variantName = variant.getOptionValues().stream()
                        .map(ProductOptionValue::getValue)
                        .collect(Collectors.joining(" / "));
            }
            String sku = variant.getSku();

            // Trừ kho an toàn đồng thời bằng query nguyên tử
            int affected = productVariantRepository.deductStock(variant.getId(), itemReq.getQuantity());
            if (affected <= 0) {
                int currentStock = variant.getStock() != null ? variant.getStock() : 0;
                throw new BadRequestException(String.format(
                        "Sản phẩm '%s' - %s (SKU: %s) không đủ số lượng tồn kho (tồn kho: %d, yêu cầu: %d)",
                        productName, variantName, sku, currentStock, itemReq.getQuantity()));
            }

            // Đồng bộ cột tồn kho denormalize trong products
            productRepository.syncProductTotalStock(product.getId());

            BigDecimal itemPrice = variant.getPrice();
            BigDecimal itemTotalPrice = itemPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalAmount = totalAmount.add(itemTotalPrice);

            String itemImageUrl = (variant != null && variant.getImageUrl() != null && !variant.getImageUrl().isBlank())
                    ? variant.getImageUrl()
                    : product.getImageUrl();

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .variant(variant)
                    .productName(productName)
                    .variantName(variantName)
                    .sku(sku)
                    .productImageUrl(itemImageUrl)
                    .quantity(itemReq.getQuantity())
                    .price(itemPrice)
                    .totalPrice(itemTotalPrice)
                    .build();

            orderItems.add(orderItem);
        }

        PaymentMethod paymentMethod = request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.COD;

        BigDecimal discountAmount = BigDecimal.ZERO;
        String appliedCoupon = null;

        if (StringUtils.hasText(request.getCouponCode())) {
            String code = request.getCouponCode().trim();
            Promotion promo = promotionRepository.findByCodeIgnoreCase(code)
                    .orElseThrow(() -> new BadRequestException("Mã giảm giá '" + code + "' không tồn tại trên hệ thống"));

            if (!"ACTIVE".equalsIgnoreCase(promo.getStatus())) {
                throw new BadRequestException("Mã giảm giá '" + code + "' hiện không còn hiệu lực");
            }
            if (promo.getMaxUsage() != null && promo.getUsedCount() != null && promo.getUsedCount() >= promo.getMaxUsage()) {
                throw new BadRequestException("Mã giảm giá '" + code + "' đã hết số lượt sử dụng");
            }

            // Kiểm tra quyền sở hữu đối với mã giảm giá đền bù / riêng tư
            Long ownerUserId = promo.getUserId();
            if (ownerUserId == null && (promo.getCode().toUpperCase().startsWith("DENBU") || orderRepository.findFirstByCompensationCoupon(promo.getCode()).isPresent())) {
                ownerUserId = orderRepository.findFirstByCompensationCoupon(promo.getCode())
                        .map(o -> o.getUser() != null ? o.getUser().getId() : null)
                        .orElse(null);
            }

            if (ownerUserId != null && !ownerUserId.equals(user.getId())) {
                throw new BadRequestException("Mã giảm giá này là mã đền bù dành riêng cho tài khoản được bồi thường đơn hàng. Bạn không thể sử dụng mã này.");
            }

            // Kiểm tra hạn sử dụng nếu có
            if (StringUtils.hasText(promo.getExpiry())) {
                try {
                    LocalDate expiryDate = LocalDate.parse(promo.getExpiry().trim());
                    if (expiryDate.isBefore(LocalDate.now())) {
                        throw new BadRequestException("Mã giảm giá '" + code + "' đã hết hạn vào ngày " + promo.getExpiry());
                    }
                } catch (DateTimeParseException ignored) {
                }
            }

            // Tính tiền giảm giá
            discountAmount = calculateDiscountAmount(totalAmount, promo.getDiscount());
            appliedCoupon = promo.getCode();

            // Tăng số lượt sử dụng
            promo.setUsedCount((promo.getUsedCount() != null ? promo.getUsedCount() : 0) + 1);
            promotionRepository.save(promo);
        }

        BigDecimal finalTotal = totalAmount.subtract(discountAmount);
        if (finalTotal.compareTo(BigDecimal.ZERO) < 0) {
            finalTotal = BigDecimal.ZERO;
        }

        Order order = Order.builder()
                .user(user)
                .receiverName(request.getReceiverName().trim())
                .phoneNumber(request.getPhoneNumber().trim())
                .shippingAddress(request.getShippingAddress().trim())
                .totalAmount(finalTotal)
                .couponCode(appliedCoupon)
                .discountAmount(discountAmount)
                .status(OrderStatus.PENDING)
                .paymentMethod(paymentMethod)
                .note(request.getNote() != null ? request.getNote().trim() : null)
                .build();

        for (OrderItem item : orderItems) {
            order.addOrderItem(item);
        }

        Order savedOrder = orderRepository.save(order);
        log.info("Người dùng '{}' đã đặt hàng thành công với mã đơn hàng: #{} (Giảm giá: {}, Tổng thanh toán: {})",
                user.getUsername(), savedOrder.getId(), discountAmount, finalTotal);

        return ApiResponse.created("Đặt hàng thành công", orderMapper.toResponse(savedOrder));
    }

    private BigDecimal calculateDiscountAmount(BigDecimal subtotal, String discountStr) {
        if (!StringUtils.hasText(discountStr) || subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        String clean = discountStr.trim().replace(".", "").replace(",", "");
        if (clean.endsWith("%")) {
            String percentStr = clean.replace("%", "").trim();
            try {
                BigDecimal percent = new BigDecimal(percentStr);
                return subtotal.multiply(percent).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            } catch (Exception e) {
                return BigDecimal.ZERO;
            }
        }
        String numOnly = clean.replaceAll("[^0-9]", "");
        if (!numOnly.isBlank()) {
            try {
                BigDecimal fixed = new BigDecimal(numOnly);
                return fixed.min(subtotal);
            } catch (Exception e) {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<OrderResponse>> getMyOrders() {
        User user = getCurrentAuthenticatedUser();
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<OrderResponse> responses = orders.stream()
                .map(orderMapper::toResponse)
                .toList();

        return ApiResponse.success("Lấy lịch sử đơn hàng thành công", responses);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<OrderResponse> getMyOrderById(Long orderId) {
        User user = getCurrentAuthenticatedUser();
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        if (!order.getUser().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new ForbiddenException("Bạn không có quyền xem đơn hàng này");
        }

        return ApiResponse.success("Lấy thông tin đơn hàng thành công", orderMapper.toResponse(order));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<OrderResponse>> getAllOrders(OrderStatus status) {
        List<Order> orders;
        if (status != null) {
            orders = orderRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            orders = orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        List<OrderResponse> responses = orders.stream()
                .map(orderMapper::toResponse)
                .toList();

        return ApiResponse.success("Lấy danh sách đơn hàng thành công (Admin)", responses);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<OrderResponse> getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        return ApiResponse.success("Lấy chi tiết đơn hàng thành công (Admin)", orderMapper.toResponse(order));
    }

    @Override
    @Transactional
    public ApiResponse<OrderResponse> updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        OrderStatus currentStatus = order.getStatus();

        if (currentStatus == newStatus) {
            return ApiResponse.success("Trạng thái đơn hàng không thay đổi", orderMapper.toResponse(order));
        }

        boolean isValidTransition = switch (currentStatus) {
            case PENDING -> newStatus == OrderStatus.PROCESSING 
                    || newStatus == OrderStatus.SHIPPING 
                    || newStatus == OrderStatus.COMPLETED 
                    || newStatus == OrderStatus.CANCELLED;
            case PROCESSING -> newStatus == OrderStatus.SHIPPING 
                    || newStatus == OrderStatus.COMPLETED 
                    || newStatus == OrderStatus.CANCELLED;
            case SHIPPING -> newStatus == OrderStatus.COMPLETED 
                    || newStatus == OrderStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };

        if (!isValidTransition) {
            if (currentStatus == OrderStatus.COMPLETED) {
                throw new BadRequestException("Không thể cập nhật trạng thái của đơn hàng đã hoàn thành (COMPLETED)");
            }
            if (currentStatus == OrderStatus.CANCELLED) {
                throw new BadRequestException("Không thể cập nhật trạng thái của đơn hàng đã hủy (CANCELLED)");
            }
            throw new BadRequestException(String.format(
                    "Không thể chuyển trạng thái từ %s sang %s.",
                    currentStatus, newStatus));
        }

        // Khi hủy đơn hàng, hoàn trả lại số lượng tồn kho (stock) cho biến thể
        if (newStatus == OrderStatus.CANCELLED) {
            restoreStockForOrder(order);
        }

        order.setStatus(newStatus);
        Order updatedOrder = orderRepository.save(order);
        log.info("Admin đã cập nhật trạng thái đơn hàng #{} từ {} sang {}", orderId, currentStatus, newStatus);

        return ApiResponse.success("Cập nhật trạng thái đơn hàng thành công", orderMapper.toResponse(updatedOrder));
    }

    @Override
    @Transactional
    public ApiResponse<OrderResponse> cancelMyOrder(Long orderId) {
        User user = getCurrentAuthenticatedUser();

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        if (!order.getUser().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new ForbiddenException("Bạn không có quyền thao tác trên đơn hàng này");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể hủy đơn hàng khi đơn còn ở trạng thái 'Chờ xử lý' (PENDING). Trạng thái hiện tại: " + order.getStatus().name());
        }

        // Hoàn trả tồn kho cho biến thể sản phẩm
        restoreStockForOrder(order);

        order.setStatus(OrderStatus.CANCELLED);
        Order cancelledOrder = orderRepository.save(order);
        log.info("Khách hàng '{}' đã hủy thành công đơn hàng #{}", user.getUsername(), orderId);

        return ApiResponse.success("Đã hủy đơn hàng #" + orderId + " thành công", orderMapper.toResponse(cancelledOrder));
    }

    private void restoreStockForOrder(Order order) {
        if (order.getOrderItems() != null) {
            for (OrderItem item : order.getOrderItems()) {
                if (item.getVariant() != null) {
                    productVariantRepository.restoreStock(item.getVariant().getId(), item.getQuantity());
                    if (item.getProduct() != null) {
                        productRepository.syncProductTotalStock(item.getProduct().getId());
                    }
                } else if (item.getProduct() != null) {
                    Product product = item.getProduct();
                    int currentStock = product.getStock() != null ? product.getStock() : 0;
                    product.setStock(currentStock + item.getQuantity());
                    productRepository.save(product);
                }
            }
        }
    }
}
