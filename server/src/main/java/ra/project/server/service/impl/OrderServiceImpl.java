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
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.OrderItem;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.User;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.model.enums.PaymentMethod;
import ra.project.server.model.enums.Role;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.service.OrderService;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
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
            if (itemReq.getProductId() == null) {
                throw new BadRequestException("Mã sản phẩm không được để trống");
            }
            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new BadRequestException("Số lượng đặt hàng cho mỗi sản phẩm phải lớn hơn 0");
            }

            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", itemReq.getProductId()));

            if (Boolean.FALSE.equals(product.getStatus())) {
                throw new BadRequestException("Sản phẩm '" + product.getName() + "' hiện đang ngừng kinh doanh");
            }

            int currentStock = product.getStock() != null ? product.getStock() : 0;
            if (currentStock < itemReq.getQuantity()) {
                throw new BadRequestException(String.format(
                        "Sản phẩm '%s' không đủ số lượng tồn kho (tồn kho: %d, yêu cầu: %d)",
                        product.getName(), currentStock, itemReq.getQuantity()));
            }

            // Trừ số lượng tồn kho tương ứng trong bảng products
            product.setStock(currentStock - itemReq.getQuantity());
            productRepository.save(product);

            BigDecimal itemPrice = product.getPrice();
            BigDecimal itemTotalPrice = itemPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalAmount = totalAmount.add(itemTotalPrice);

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .price(itemPrice)
                    .totalPrice(itemTotalPrice)
                    .build();

            orderItems.add(orderItem);
        }

        PaymentMethod paymentMethod = request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.COD;

        Order order = Order.builder()
                .user(user)
                .receiverName(request.getReceiverName().trim())
                .phoneNumber(request.getPhoneNumber().trim())
                .shippingAddress(request.getShippingAddress().trim())
                .totalAmount(totalAmount)
                .status(OrderStatus.PENDING)
                .paymentMethod(paymentMethod)
                .note(request.getNote() != null ? request.getNote().trim() : null)
                .build();

        for (OrderItem item : orderItems) {
            order.addOrderItem(item);
        }

        Order savedOrder = orderRepository.save(order);
        log.info("Người dùng '{}' đã đặt hàng thành công với mã đơn hàng: #{}", user.getUsername(), savedOrder.getId());

        return ApiResponse.created("Đặt hàng thành công", orderMapper.toResponse(savedOrder));
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
            case PENDING -> newStatus == OrderStatus.PROCESSING || newStatus == OrderStatus.CANCELLED;
            case PROCESSING -> newStatus == OrderStatus.SHIPPING || newStatus == OrderStatus.CANCELLED;
            case SHIPPING -> newStatus == OrderStatus.COMPLETED || newStatus == OrderStatus.CANCELLED;
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
                    "Không thể chuyển trạng thái từ %s sang %s. Quy trình hợp lệ: PENDING -> PROCESSING -> SHIPPING -> COMPLETED (hoặc CANCELLED)",
                    currentStatus, newStatus));
        }

        // Khi hủy đơn hàng, hoàn trả lại số lượng tồn kho (stock) cho sản phẩm
        if (newStatus == OrderStatus.CANCELLED) {
            if (order.getOrderItems() != null) {
                for (OrderItem item : order.getOrderItems()) {
                    Product product = item.getProduct();
                    if (product != null) {
                        int currentStock = product.getStock() != null ? product.getStock() : 0;
                        product.setStock(currentStock + item.getQuantity());
                        productRepository.save(product);
                    }
                }
            }
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

        // Hoàn trả tồn kho cho sản phẩm
        if (order.getOrderItems() != null) {
            for (OrderItem item : order.getOrderItems()) {
                Product product = item.getProduct();
                if (product != null) {
                    int currentStock = product.getStock() != null ? product.getStock() : 0;
                    product.setStock(currentStock + item.getQuantity());
                    productRepository.save(product);
                }
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        Order cancelledOrder = orderRepository.save(order);
        log.info("Khách hàng '{}' đã hủy thành công đơn hàng #{}", user.getUsername(), orderId);

        return ApiResponse.success("Đã hủy đơn hàng #" + orderId + " thành công", orderMapper.toResponse(cancelledOrder));
    }
}
