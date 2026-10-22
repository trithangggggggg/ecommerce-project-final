package ra.project.server.service;

import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.request.CheckoutRequest;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.enums.OrderStatus;

import java.util.List;

public interface OrderService {

    ApiResponse<OrderResponse> checkout(CheckoutRequest request);

    ApiResponse<List<OrderResponse>> getMyOrders();

    ApiResponse<OrderResponse> getMyOrderById(Long orderId);

    ApiResponse<List<OrderResponse>> getAllOrders(OrderStatus status);

    ApiResponse<OrderResponse> getOrderById(Long orderId);

    ApiResponse<OrderResponse> updateOrderStatus(Long orderId, OrderStatus status);

    ApiResponse<OrderResponse> cancelMyOrder(Long orderId);
}
