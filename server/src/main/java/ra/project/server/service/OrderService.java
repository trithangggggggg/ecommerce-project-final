package ra.project.server.service;

import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.AdminCreateOrderRequest;
import ra.project.server.model.dto.request.AdminOrderUpdateRequest;
import ra.project.server.model.dto.request.CheckoutRequest;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;

import java.util.List;

public interface OrderService {

    ApiResponse<OrderResponse> checkout(CheckoutRequest request);

    ApiResponse<OrderResponse> adminCreateOrder(AdminCreateOrderRequest request);

    ApiResponse<List<OrderResponse>> getMyOrders();

    ApiResponse<OrderResponse> getMyOrderById(Long orderId);

    ApiResponse<List<OrderResponse>> getAllOrders(OrderStatus status);

    ApiResponse<List<OrderResponse>> getAllOrders(OrderStatus status, String keyword, PaymentMethod paymentMethod);

    ApiResponse<OrderResponse> getOrderById(Long orderId);

    ApiResponse<OrderResponse> updateOrderInfo(Long orderId, AdminOrderUpdateRequest request);

    ApiResponse<OrderResponse> updateOrderStatus(Long orderId, OrderStatus status);

    ApiResponse<OrderResponse> updateOrderStatus(Long orderId, OrderStatus status, Long carrierId, String trackingCode);

    ApiResponse<OrderResponse> updateOrderStatus(Long orderId, OrderStatus status, Long carrierId, String trackingCode, String cancelReason);

    ApiResponse<OrderResponse> cancelMyOrder(Long orderId);

    ApiResponse<OrderResponse> cancelMyOrder(Long orderId, String reason);
}
