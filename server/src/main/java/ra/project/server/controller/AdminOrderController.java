package ra.project.server.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.model.dto.request.AdminCreateOrderRequest;
import ra.project.server.model.dto.request.AdminOrderUpdateRequest;
import ra.project.server.model.dto.request.UpdateOrderStatusRequest;
import ra.project.server.model.dto.response.OrderResponse;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.service.OrderService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminOrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getAllOrders(
            @RequestParam(name = "status", required = false) OrderStatus status,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "paymentMethod", required = false) PaymentMethod paymentMethod
    ) {
        if (!StringUtils.hasText(keyword) && paymentMethod == null) {
            return ResponseEntity.ok(orderService.getAllOrders(status));
        }
        ApiResponse<List<OrderResponse>> response = orderService.getAllOrders(status, keyword, paymentMethod);
        return ResponseEntity.ok(response);
    }

    public ResponseEntity<ApiResponse<List<OrderResponse>>> getAllOrders(OrderStatus status) {
        return ResponseEntity.ok(orderService.getAllOrders(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(@PathVariable Long id) {
        ApiResponse<OrderResponse> response = orderService.getOrderById(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> createAdminOrder(
            @Valid @RequestBody AdminCreateOrderRequest request
    ) {
        ApiResponse<OrderResponse> response = orderService.adminCreateOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderInfo(
            @PathVariable Long id,
            @RequestBody AdminOrderUpdateRequest request
    ) {
        ApiResponse<OrderResponse> response = orderService.updateOrderInfo(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody(required = false) UpdateOrderStatusRequest request,
            @RequestParam(name = "status", required = false) String statusParam
    ) {
        OrderStatus targetStatus = null;
        if (request != null && request.getStatus() != null) {
            targetStatus = request.getStatus();
        } else if (statusParam != null && !statusParam.trim().isEmpty()) {
            try {
                targetStatus = OrderStatus.valueOf(statusParam.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Trạng thái đơn hàng không hợp lệ: '" + statusParam + "'. Các trạng thái hợp lệ: PENDING, PROCESSING, SHIPPING, COMPLETED, CANCELLED");
            }
        }

        if (targetStatus == null) {
            throw new BadRequestException("Trạng thái đơn hàng (status) không được để trống");
        }

        Long carrierId = request != null ? request.getCarrierId() : null;
        String trackingCode = request != null ? request.getTrackingCode() : null;
        String cancelReason = request != null ? request.getCancelReason() : null;

        ApiResponse<OrderResponse> response;
        if (StringUtils.hasText(cancelReason)) {
            response = orderService.updateOrderStatus(id, targetStatus, carrierId, trackingCode, cancelReason);
        } else if (carrierId != null || trackingCode != null) {
            response = orderService.updateOrderStatus(id, targetStatus, carrierId, trackingCode);
        } else {
            response = orderService.updateOrderStatus(id, targetStatus);
        }
        return ResponseEntity.ok(response);
    }
}
