package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.entity.ShippingCarrier;
import ra.project.server.repository.ShippingCarrierRepository;

import java.util.List;

@RestController
@RequestMapping("/api/admin/shipping-carriers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminShippingCarrierController {

    private final ShippingCarrierRepository shippingCarrierRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShippingCarrier>>> getAllCarriers() {
        List<ShippingCarrier> list = shippingCarrierRepository.findAll();
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
        existing.setActiveOrders(request.getActiveOrders());
        existing.setRating(request.getRating());
        existing.setStatus(request.getStatus());

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
