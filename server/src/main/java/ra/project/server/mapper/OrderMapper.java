package ra.project.server.mapper;

import org.springframework.stereotype.Component;
import ra.project.server.model.dto.response.OrderItemResponse;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.OrderItem;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.ProductVariant;

import java.util.Collections;
import java.util.List;

@Component
public class OrderMapper {

    public OrderResponse toResponse(Order order) {
        if (order == null) {
            return null;
        }

        List<OrderItemResponse> itemResponses = order.getOrderItems() != null
                ? order.getOrderItems().stream().map(this::toItemResponse).toList()
                : Collections.emptyList();

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUser() != null ? order.getUser().getId() : null)
                .username(order.getUser() != null ? order.getUser().getUsername() : null)
                .customerName(order.getUser() != null ? order.getUser().getFullName() : null)
                .receiverName(order.getReceiverName())
                .phoneNumber(order.getPhoneNumber())
                .shippingAddress(order.getShippingAddress())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .note(order.getNote())
                .cancelReason(order.getCancelReason())
                .compensationCoupon(order.getCompensationCoupon())
                .couponCode(order.getCouponCode())
                .discountAmount(order.getDiscountAmount())
                .orderItems(itemResponses)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    public OrderItemResponse toItemResponse(OrderItem item) {
        if (item == null) {
            return null;
        }
        Product product = item.getProduct();
        ProductVariant variant = item.getVariant();

        String pName = item.getProductName() != null ? item.getProductName() : (product != null ? product.getName() : null);
        String vName = item.getVariantName();
        String sku = item.getSku() != null ? item.getSku() : (variant != null ? variant.getSku() : null);

        String imgUrl = (item.getProductImageUrl() != null && !item.getProductImageUrl().isBlank())
                ? item.getProductImageUrl()
                : ((variant != null && variant.getImageUrl() != null && !variant.getImageUrl().isBlank())
                    ? variant.getImageUrl()
                    : (product != null ? product.getImageUrl() : null));

        return OrderItemResponse.builder()
                .id(item.getId())
                .productId(product != null ? product.getId() : null)
                .productName(pName)
                .variantId(variant != null ? variant.getId() : null)
                .variantName(vName)
                .sku(sku)
                .productImageUrl(imgUrl)
                .quantity(item.getQuantity())
                .price(item.getPrice())
                .totalPrice(item.getTotalPrice())
                .build();
    }
}
