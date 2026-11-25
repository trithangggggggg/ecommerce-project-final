package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.entity.Order;
import ra.project.server.model.entity.ShippingCarrier;
import ra.project.server.model.enums.OrderStatus;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ShippingCarrierRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/shipping-carriers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminShippingCarrierController {

    private final ShippingCarrierRepository shippingCarrierRepository;
    private final OrderRepository orderRepository;

    private void seedDefaultCarriersIfEmpty() {
        if (shippingCarrierRepository.count() == 0) {
            List<ShippingCarrier> defaults = List.of(
                    ShippingCarrier.builder()
                            .code("GHN")
                            .name("Giao Hàng Nhanh")
                            .serviceType("Chuyển phát nhanh 24h & Hỏa tốc")
                            .hotline("1900 636677")
                            .shippingFee(java.math.BigDecimal.valueOf(35000))
                            .rating(4.9)
                            .status("ACTIVE")
                            .activeOrders(0)
                            .build(),
                    ShippingCarrier.builder()
                            .code("GHTK")
                            .name("Giao Hàng Tiết Kiệm")
                            .serviceType("Giao hàng tiêu chuẩn toàn quốc")
                            .hotline("1900 6092")
                            .shippingFee(java.math.BigDecimal.valueOf(22000))
                            .rating(4.8)
                            .status("ACTIVE")
                            .activeOrders(0)
                            .build(),
                    ShippingCarrier.builder()
                            .code("VTP")
                            .name("Viettel Post")
                            .serviceType("Bưu chính chuyển phát liên tỉnh")
                            .hotline("1900 8095")
                            .shippingFee(java.math.BigDecimal.valueOf(25000))
                            .rating(4.7)
                            .status("ACTIVE")
                            .activeOrders(0)
                            .build(),
                    ShippingCarrier.builder()
                            .code("JNT")
                            .name("J&T Express")
                            .serviceType("Vận chuyển nhanh TMĐT")
                            .hotline("1900 1088")
                            .shippingFee(java.math.BigDecimal.valueOf(28000))
                            .rating(4.6)
                            .status("ACTIVE")
                            .activeOrders(0)
                            .build(),
                    ShippingCarrier.builder()
                            .code("NEXOR")
                            .name("NEXOR Express (Nội bộ)")
                            .serviceType("Giao hàng siêu tốc 2H nội thành")
                            .hotline("1800 6936")
                            .shippingFee(java.math.BigDecimal.valueOf(50000))
                            .rating(5.0)
                            .status("ACTIVE")
                            .activeOrders(0)
                            .build()
            );
            shippingCarrierRepository.saveAll(defaults);
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShippingCarrier>>> getAllCarriers() {
        seedDefaultCarriersIfEmpty();
        List<ShippingCarrier> list = shippingCarrierRepository.findAll();

        // Tự động gán giá trị mặc định cho các bản ghi thiếu trường số/trạng thái
        for (ShippingCarrier carrier : list) {
            if (carrier.applyMissingDefaults()) {
                shippingCarrierRepository.save(carrier);
            }
        }

        // Đồng bộ số lượng đơn đang luân chuyển (status = SHIPPING) cho từng đối tác
        try {
            List<Order> shippingOrders = orderRepository.findByStatusOrderByCreatedAtDesc(OrderStatus.SHIPPING);
            Map<Long, Long> counts = shippingOrders.stream()
                    .filter(o -> o.getShippingCarrier() != null)
                    .collect(Collectors.groupingBy(o -> o.getShippingCarrier().getId(), Collectors.counting()));

            for (ShippingCarrier carrier : list) {
                long c = counts.getOrDefault(carrier.getId(), 0L);
                carrier.setActiveOrders((int) c);
            }
        } catch (Exception ignored) {
            // Giữ nguyên activeOrders nếu có lỗi truy vấn
        }

        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn vị vận chuyển thành công", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShippingCarrier>> getCarrierById(@PathVariable Long id) {
        ShippingCarrier carrier = shippingCarrierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn vị vận chuyển", "id", id));
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết đơn vị vận chuyển thành công", carrier));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ShippingCarrier>> createCarrier(@RequestBody ShippingCarrier request) {
        if (shippingCarrierRepository.existsByCodeIgnoreCase(request.getCode())) {
            throw new IllegalArgumentException("Mã đơn vị vận chuyển '" + request.getCode() + "' đã tồn tại!");
        }
        request.applyMissingDefaults();
        ShippingCarrier saved = shippingCarrierRepository.save(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm đơn vị vận chuyển thành công", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ShippingCarrier>> updateCarrier(
            @PathVariable Long id,
            @RequestBody ShippingCarrier request
    ) {
        ShippingCarrier existing = shippingCarrierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn vị vận chuyển", "id", id));

        existing.setCode(request.getCode());
        existing.setName(request.getName());
        existing.setServiceType(request.getServiceType());
        existing.setHotline(request.getHotline());
        existing.setActiveOrders(request.getActiveOrders() != null ? request.getActiveOrders() : 0);
        existing.setRating(request.getRating() != null ? request.getRating() : 5.0);
        if (request.getEstimatedDelivery() != null) {
            existing.setEstimatedDelivery(request.getEstimatedDelivery().trim());
        }
        existing.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        if (request.getShippingFee() != null) {
            existing.setShippingFee(request.getShippingFee());
        }
        existing.applyMissingDefaults();

        ShippingCarrier updated = shippingCarrierRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đơn vị vận chuyển thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCarrier(@PathVariable Long id) {
        if (!shippingCarrierRepository.existsById(id)) {
            throw new ResourceNotFoundException("Đơn vị vận chuyển", "id", id);
        }
        shippingCarrierRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa đơn vị vận chuyển thành công", null));
    }
}
