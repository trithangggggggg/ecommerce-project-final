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
import ra.project.server.model.dto.request.AdminCreateOrderRequest;
import ra.project.server.model.dto.request.AdminOrderUpdateRequest;
import ra.project.server.model.dto.request.CheckoutRequest;
import ra.project.server.model.dto.request.OrderItemRequest;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.entity.*;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.model.enums.PaymentStatus;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import ra.project.server.model.entity.ShippingCarrier;
import ra.project.server.repository.ShippingCarrierRepository;
import ra.project.server.service.SystemSettingService;

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
    private final ShippingCarrierRepository shippingCarrierRepository;

    @Autowired(required = false)
    private SystemSettingService systemSettingService;

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác này");
        }

        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "tên tài khoản", username));

        if (Boolean.FALSE.equals(user.getStatus())) {
            throw new ForbiddenException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!");
        }

        return user;
    }

    @Override
    @Transactional
    public ApiResponse<OrderResponse> checkout(CheckoutRequest request) {
        User user = getCurrentAuthenticatedUser();
        return createOrderForUser(user, request, true);
    }

    @Override
    @Transactional
    public ApiResponse<OrderResponse> adminCreateOrder(AdminCreateOrderRequest request) {
        User user = request.getUserId() != null
                ? userRepository.findById(request.getUserId())
                        .orElseThrow(() -> new ResourceNotFoundException("Khách hàng", "id", request.getUserId()))
                : getCurrentAuthenticatedUser();

        CheckoutRequest checkoutReq = CheckoutRequest.builder()
                .receiverName(request.getReceiverName())
                .phoneNumber(request.getPhoneNumber())
                .shippingAddress(request.getShippingAddress())
                .note(request.getNote())
                .couponCode(request.getCouponCode())
                .shippingCouponCode(request.getShippingCouponCode())
                .carrierId(request.getCarrierId())
                .paymentMethod(request.getPaymentMethod())
                .items(request.getItems())
                .build();

        return createOrderForUser(user, checkoutReq, false);
    }

    private ApiResponse<OrderResponse> createOrderForUser(User user, CheckoutRequest request, boolean enforcePublicPaymentSettings) {

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

            if ("INACTIVE".equalsIgnoreCase(product.getStatus()) || "COMING_SOON".equalsIgnoreCase(product.getStatus()) || Boolean.FALSE.equals(variant.getStatus())) {
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
        String appliedOrderCoupon = null;
        String appliedShippingCoupon = null;
        BigDecimal shippingDiscount = BigDecimal.ZERO;

        String rawCouponCode = request.getCouponCode() != null ? request.getCouponCode().trim() : null;
        String rawShippingCouponCode = request.getShippingCouponCode() != null ? request.getShippingCouponCode().trim() : null;

        // Nếu khách hàng chỉ nhập 1 mã vào ô couponCode nhưng mã đó là mã Freeship/vận chuyển
        if (StringUtils.hasText(rawCouponCode) && !StringUtils.hasText(rawShippingCouponCode)) {
            Promotion checkPromo = promotionRepository.findByCodeIgnoreCase(rawCouponCode).orElse(null);
            if (checkPromo != null && checkPromo.isShippingDiscount()) {
                rawShippingCouponCode = rawCouponCode;
                rawCouponCode = null;
            }
        }

        // 1. Áp dụng mã giảm giá tiền hàng
        if (StringUtils.hasText(rawCouponCode)) {
            Promotion promo = validatePromotion(rawCouponCode, user, totalAmount);
            if (promo.isShippingDiscount()) {
                throw new BadRequestException("Mã '" + promo.getCode() + "' là mã ưu đãi vận chuyển. Vui lòng nhập vào ô Mã giảm giá vận chuyển.");
            }

            discountAmount = calculateDiscountAmount(totalAmount, promo.getDiscount(), promo.getMaxDiscountAmount());
            appliedOrderCoupon = promo.getCode();

            promo.setUsedCount((promo.getUsedCount() != null ? promo.getUsedCount() : 0) + 1);
            promotionRepository.save(promo);
        }

        BigDecimal subtotalAfterDiscount = totalAmount.subtract(discountAmount);
        if (subtotalAfterDiscount.compareTo(BigDecimal.ZERO) < 0) {
            subtotalAfterDiscount = BigDecimal.ZERO;
        }

        ShippingCarrier selectedCarrier = null;
        if (request.getCarrierId() != null) {
            selectedCarrier = shippingCarrierRepository.findById(request.getCarrierId()).orElse(null);
        }

        PaymentMethod chosenPayment = request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.COD;
        if (enforcePublicPaymentSettings && systemSettingService != null) {
            if (chosenPayment == PaymentMethod.COD && !systemSettingService.getBoolean("payment.codEnabled", true)) {
                throw new BadRequestException("Phương thức thanh toán khi nhận hàng (COD) hiện đang tạm ngưng bởi quản trị viên.");
            }
            if (chosenPayment == PaymentMethod.SEPAY && !systemSettingService.getBoolean("payment.sepayEnabled", true)) {
                throw new BadRequestException("Phương thức thanh toán chuyển khoản VietQR / SePay hiện đang tạm ngưng bởi quản trị viên.");
            }
        }

        // Tính cước vận chuyển theo cấu hình hệ thống (SystemSetting DB) & chính sách ưu đãi tự động:
        BigDecimal defaultFeeConfig = systemSettingService != null
                ? systemSettingService.getDecimal("shipping.defaultFee", BigDecimal.valueOf(30000))
                : BigDecimal.valueOf(30000);
        BigDecimal baseShippingFee = defaultFeeConfig;
        if (selectedCarrier != null && selectedCarrier.getShippingFee() != null) {
            baseShippingFee = selectedCarrier.getShippingFee();
        }

        BigDecimal freeshipThreshold = systemSettingService != null
                ? systemSettingService.getDecimal("shipping.freeshipThreshold", BigDecimal.valueOf(20_000_000))
                : BigDecimal.valueOf(20_000_000);
        BigDecimal halfShipThreshold = systemSettingService != null
                ? systemSettingService.getDecimal("shipping.halfShipThreshold", BigDecimal.valueOf(10_000_000))
                : BigDecimal.valueOf(10_000_000);

        BigDecimal actualShippingFee;
        if (freeshipThreshold.compareTo(BigDecimal.ZERO) > 0 && subtotalAfterDiscount.compareTo(freeshipThreshold) >= 0) {
            actualShippingFee = BigDecimal.ZERO;
        } else if (halfShipThreshold.compareTo(BigDecimal.ZERO) > 0 && subtotalAfterDiscount.compareTo(halfShipThreshold) >= 0) {
            actualShippingFee = baseShippingFee.divide(BigDecimal.valueOf(2), 0, RoundingMode.HALF_UP);
        } else {
            actualShippingFee = baseShippingFee;
        }

        // 2. Áp dụng mã giảm giá vận chuyển (Voucher Freeship)
        if (StringUtils.hasText(rawShippingCouponCode)) {
            Promotion shippingPromo = validatePromotion(rawShippingCouponCode, user, subtotalAfterDiscount);
            if (!shippingPromo.isShippingDiscount()) {
                throw new BadRequestException("Mã '" + shippingPromo.getCode() + "' là mã giảm giá đơn hàng, không áp dụng cho phí vận chuyển.");
            }

            if (actualShippingFee.compareTo(BigDecimal.ZERO) > 0) {
                shippingDiscount = calculateDiscountAmount(actualShippingFee, shippingPromo.getDiscount(), shippingPromo.getMaxDiscountAmount());
                actualShippingFee = actualShippingFee.subtract(shippingDiscount);
                if (actualShippingFee.compareTo(BigDecimal.ZERO) < 0) {
                    actualShippingFee = BigDecimal.ZERO;
                }
            }
            appliedShippingCoupon = shippingPromo.getCode();

            shippingPromo.setUsedCount((shippingPromo.getUsedCount() != null ? shippingPromo.getUsedCount() : 0) + 1);
            promotionRepository.save(shippingPromo);
        }

        BigDecimal finalTotal = subtotalAfterDiscount.add(actualShippingFee);

        Order order = Order.builder()
                .user(user)
                .receiverName(request.getReceiverName().trim())
                .phoneNumber(request.getPhoneNumber().trim())
                .shippingAddress(request.getShippingAddress().trim())
                .shippingFee(actualShippingFee)
                .shippingDiscount(shippingDiscount)
                .shippingCouponCode(appliedShippingCoupon)
                .totalAmount(finalTotal)
                .couponCode(appliedOrderCoupon)
                .discountAmount(discountAmount)
                .status(OrderStatus.PENDING)
                .paymentMethod(paymentMethod)
                .shippingCarrier(selectedCarrier)
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

    private BigDecimal calculateDiscountAmount(BigDecimal subtotal, String discountStr, BigDecimal maxDiscountAmount) {
        if (!StringUtils.hasText(discountStr) || subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal calculatedDiscount = BigDecimal.ZERO;
        String clean = discountStr.trim().replace(".", "").replace(",", "");
        if (clean.endsWith("%")) {
            String percentStr = clean.replace("%", "").trim();
            try {
                BigDecimal percent = new BigDecimal(percentStr);
                calculatedDiscount = subtotal.multiply(percent).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            } catch (Exception e) {
                calculatedDiscount = BigDecimal.ZERO;
            }
        } else {
            String numOnly = clean.replaceAll("[^0-9]", "");
            if (!numOnly.isBlank()) {
                try {
                    BigDecimal fixed = new BigDecimal(numOnly);
                    calculatedDiscount = fixed.min(subtotal);
                } catch (Exception e) {
                    calculatedDiscount = BigDecimal.ZERO;
                }
            }
        }

        if (maxDiscountAmount != null && maxDiscountAmount.compareTo(BigDecimal.ZERO) > 0) {
            if (calculatedDiscount.compareTo(maxDiscountAmount) > 0) {
                calculatedDiscount = maxDiscountAmount;
            }
        }
        return calculatedDiscount;
    }

    private BigDecimal parseMinOrderAmount(String minOrderStr) {
        if (!StringUtils.hasText(minOrderStr) || minOrderStr.toLowerCase().contains("mọi đơn")) {
            return BigDecimal.ZERO;
        }
        String clean = minOrderStr.replaceAll("[^0-9]", "");
        if (clean.isBlank()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(clean);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
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
        return getAllOrders(status, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<OrderResponse>> getAllOrders(OrderStatus status, String keyword, PaymentMethod paymentMethod) {
        List<Order> orders;
        if (status != null) {
            orders = orderRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            orders = orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        if (paymentMethod != null) {
            orders = orders.stream()
                    .filter(o -> paymentMethod == o.getPaymentMethod())
                    .toList();
        }

        if (StringUtils.hasText(keyword)) {
            String kw = keyword.trim().toLowerCase();
            orders = orders.stream()
                    .filter(o -> String.valueOf(o.getId()).contains(kw)
                            || (o.getReceiverName() != null && o.getReceiverName().toLowerCase().contains(kw))
                            || (o.getPhoneNumber() != null && o.getPhoneNumber().toLowerCase().contains(kw))
                            || (o.getShippingAddress() != null && o.getShippingAddress().toLowerCase().contains(kw))
                            || (o.getTrackingCode() != null && o.getTrackingCode().toLowerCase().contains(kw))
                            || (o.getUser() != null && o.getUser().getUsername() != null && o.getUser().getUsername().toLowerCase().contains(kw))
                            || (o.getUser() != null && o.getUser().getFullName() != null && o.getUser().getFullName().toLowerCase().contains(kw)))
                    .toList();
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
    public ApiResponse<OrderResponse> updateOrderInfo(Long orderId, AdminOrderUpdateRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        if (request == null) {
            throw new BadRequestException("Dữ liệu cập nhật đơn hàng không được để trống");
        }

        if (request.getReceiverName() != null) {
            if (request.getReceiverName().isBlank()) {
                throw new BadRequestException("Tên người nhận không được để trống");
            }
            order.setReceiverName(request.getReceiverName().trim());
        }
        if (request.getPhoneNumber() != null) {
            if (request.getPhoneNumber().isBlank()) {
                throw new BadRequestException("Số điện thoại không được để trống");
            }
            order.setPhoneNumber(request.getPhoneNumber().trim());
        }
        if (request.getShippingAddress() != null) {
            if (request.getShippingAddress().isBlank()) {
                throw new BadRequestException("Địa chỉ nhận hàng không được để trống");
            }
            order.setShippingAddress(request.getShippingAddress().trim());
        }
        if (request.getNote() != null) {
            order.setNote(request.getNote().trim().isEmpty() ? null : request.getNote().trim());
        }
        if (request.getCarrierId() != null) {
            if (request.getCarrierId() <= 0) {
                order.setShippingCarrier(null);
            } else {
                ShippingCarrier carrier = shippingCarrierRepository.findById(request.getCarrierId())
                        .orElseThrow(() -> new ResourceNotFoundException("Đơn vị vận chuyển", "id", request.getCarrierId()));
                order.setShippingCarrier(carrier);
            }
        }
        if (request.getTrackingCode() != null) {
            order.setTrackingCode(request.getTrackingCode().trim().isEmpty() ? null : request.getTrackingCode().trim().toUpperCase());
        }
        if (request.getPaymentMethod() != null) {
            order.setPaymentMethod(request.getPaymentMethod());
        }
        if (request.getPaymentStatus() != null) {
            order.setPaymentStatus(request.getPaymentStatus());
            if (request.getPaymentStatus() == PaymentStatus.PAID && order.getPaidAt() == null) {
                order.setPaidAt(LocalDateTime.now());
            }
        }
        if (request.getCancelReason() != null) {
            order.setCancelReason(request.getCancelReason().trim().isEmpty() ? null : request.getCancelReason().trim());
        }

        Order updated = orderRepository.save(order);
        return ApiResponse.success("Cập nhật thông tin đơn hàng thành công", orderMapper.toResponse(updated));
    }

    @Override
    @Transactional
    public ApiResponse<OrderResponse> updateOrderStatus(Long orderId, OrderStatus newStatus) {
        return updateOrderStatus(orderId, newStatus, null, null, null);
    }

    @Override
    @Transactional
    public ApiResponse<OrderResponse> updateOrderStatus(Long orderId, OrderStatus newStatus, Long carrierId, String trackingCode) {
        return updateOrderStatus(orderId, newStatus, carrierId, trackingCode, null);
    }

    @Override
    @Transactional
    public ApiResponse<OrderResponse> updateOrderStatus(Long orderId, OrderStatus newStatus, Long carrierId, String trackingCode, String cancelReason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        OrderStatus currentStatus = order.getStatus();

        if (currentStatus == newStatus
                && carrierId == null
                && (trackingCode == null || trackingCode.trim().isEmpty())
                && !StringUtils.hasText(cancelReason)) {
            return ApiResponse.success("Trạng thái đơn hàng không thay đổi", orderMapper.toResponse(order));
        }

        boolean isValidTransition = switch (currentStatus) {
            case PENDING -> newStatus == OrderStatus.PROCESSING
                    || newStatus == OrderStatus.SHIPPING
                    || newStatus == OrderStatus.COMPLETED
                    || newStatus == OrderStatus.CANCELLED;
            case PROCESSING -> newStatus == OrderStatus.SHIPPING
                    || newStatus == OrderStatus.COMPLETED
                    || newStatus == OrderStatus.CANCELLED
                    || newStatus == OrderStatus.PROCESSING;
            case SHIPPING -> newStatus == OrderStatus.COMPLETED
                    || newStatus == OrderStatus.CANCELLED
                    || newStatus == OrderStatus.SHIPPING;
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

        // Khi hủy đơn hàng, hoàn trả lại số lượng tồn kho và lượt dùng voucher
        if (newStatus == OrderStatus.CANCELLED && currentStatus != OrderStatus.CANCELLED) {
            restoreStockForOrder(order);
            restorePromotionUsage(order);
            if (StringUtils.hasText(cancelReason)) {
                order.setCancelReason(cancelReason.trim());
            } else if (!StringUtils.hasText(order.getCancelReason())) {
                order.setCancelReason("Hủy bởi quản trị viên");
            }
        }

        // Cập nhật đơn vị vận chuyển và mã vận đơn (cho phép khi PROCESSING hoặc SHIPPING)
        if (carrierId != null && shippingCarrierRepository != null) {
            ShippingCarrier carrier = shippingCarrierRepository.findById(carrierId)
                    .orElseThrow(() -> new ResourceNotFoundException("Đơn vị vận chuyển", "id", carrierId));
            order.setShippingCarrier(carrier);
        }
        if (StringUtils.hasText(trackingCode)) {
            order.setTrackingCode(trackingCode.trim().toUpperCase());
        } else if (newStatus == OrderStatus.SHIPPING
                && order.getShippingCarrier() != null
                && !StringUtils.hasText(order.getTrackingCode())) {
            order.setTrackingCode(order.getShippingCarrier().getCode() + "-" + (System.currentTimeMillis() % 100000000));
        }

        order.setStatus(newStatus);
        Order updatedOrder = orderRepository.save(order);
        log.info("Admin đã cập nhật trạng thái đơn hàng #{} từ {} sang {}", orderId, currentStatus, newStatus);

        return ApiResponse.success("Cập nhật trạng thái đơn hàng thành công", orderMapper.toResponse(updatedOrder));
    }

    @Override
    @Transactional
    public ApiResponse<OrderResponse> cancelMyOrder(Long orderId) {
        return cancelMyOrder(orderId, null);
    }

    @Override
    @Transactional
    public ApiResponse<OrderResponse> cancelMyOrder(Long orderId, String reason) {
        User user = getCurrentAuthenticatedUser();

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng", "id", orderId));

        if (!order.getUser().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new ForbiddenException("Bạn không có quyền thao tác trên đơn hàng này");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể hủy đơn hàng khi đơn còn ở trạng thái 'Chờ xử lý' (PENDING). Trạng thái hiện tại: " + order.getStatus().name());
        }

        // Hoàn trả tồn kho và lượt dùng voucher
        restoreStockForOrder(order);
        restorePromotionUsage(order);

        order.setStatus(OrderStatus.CANCELLED);
        if (StringUtils.hasText(reason)) {
            order.setCancelReason(reason.trim());
        } else if (!StringUtils.hasText(order.getCancelReason())) {
            order.setCancelReason("Khách hàng chủ động hủy đơn");
        }
        Order cancelledOrder = orderRepository.save(order);
        log.info("Khách hàng '{}' đã hủy thành công đơn hàng #{} (Lý do: {})", user.getUsername(), orderId, order.getCancelReason());

        return ApiResponse.success("Đã hủy đơn hàng #" + orderId + " thành công", orderMapper.toResponse(cancelledOrder));
    }

    private void restorePromotionUsage(Order order) {
        decrementPromotionUsedCount(order.getCouponCode());
        decrementPromotionUsedCount(order.getShippingCouponCode());
    }

    private void decrementPromotionUsedCount(String code) {
        if (!StringUtils.hasText(code) || promotionRepository == null) {
            return;
        }
        promotionRepository.findByCodeIgnoreCase(code.trim()).ifPresent(promo -> {
            int used = promo.getUsedCount() != null ? promo.getUsedCount() : 0;
            if (used > 0) {
                promo.setUsedCount(used - 1);
                promotionRepository.save(promo);
            }
        });
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

    private Promotion validatePromotion(String code, User user, BigDecimal subtotal) {
        String trimmedCode = code.trim();
        Promotion promo = promotionRepository.findByCodeIgnoreCase(trimmedCode)
                .orElseThrow(() -> new BadRequestException("Mã giảm giá '" + trimmedCode + "' không tồn tại trên hệ thống"));

        if (!"ACTIVE".equalsIgnoreCase(promo.getStatus())) {
            throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' hiện không còn hiệu lực");
        }
        if (promo.getMaxUsage() != null && promo.getUsedCount() != null && promo.getUsedCount() >= promo.getMaxUsage()) {
            throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' đã hết số lượt sử dụng");
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

        if (StringUtils.hasText(promo.getStartDate())) {
            try {
                LocalDate startDate = LocalDate.parse(promo.getStartDate().trim());
                if (startDate.isAfter(LocalDate.now())) {
                    throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' chưa tới ngày áp dụng (bắt đầu từ ngày " + promo.getStartDate() + ")");
                }
            } catch (DateTimeParseException ignored) {
            }
        }

        if (StringUtils.hasText(promo.getExpiry())) {
            try {
                LocalDate expiryDate = LocalDate.parse(promo.getExpiry().trim());
                if (expiryDate.isBefore(LocalDate.now())) {
                    throw new BadRequestException("Mã giảm giá '" + trimmedCode + "' đã hết hạn vào ngày " + promo.getExpiry());
                }
            } catch (DateTimeParseException ignored) {
            }
        }

        if (subtotal != null && StringUtils.hasText(promo.getMinOrder())) {
            BigDecimal minOrderRequired = parseMinOrderAmount(promo.getMinOrder());
            if (minOrderRequired.compareTo(BigDecimal.ZERO) > 0 && subtotal.compareTo(minOrderRequired) < 0) {
                throw new BadRequestException("Đơn hàng chưa đạt giá trị tối thiểu " + promo.getMinOrder() + " để áp dụng mã giảm giá này");
            }
        }

        return promo;
    }
}
