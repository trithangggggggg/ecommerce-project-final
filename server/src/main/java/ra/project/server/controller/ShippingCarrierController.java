package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.entity.ShippingCarrier;
import ra.project.server.repository.ShippingCarrierRepository;

import java.util.List;

@RestController
@RequestMapping("/api/shipping-carriers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ShippingCarrierController {

    private final ShippingCarrierRepository shippingCarrierRepository;

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

    /**
     * Lấy danh sách các đơn vị vận chuyển đang hoạt động để khách hàng chọn khi Checkout
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ShippingCarrier>>> getActiveCarriers() {
        seedDefaultCarriersIfEmpty();
        List<ShippingCarrier> activeCarriers = shippingCarrierRepository.findByStatusIgnoreCase("ACTIVE");

        // Tự động gán giá trị mặc định cho các đối tác cũ chưa đủ thông tin
        for (ShippingCarrier carrier : activeCarriers) {
            if (carrier.applyMissingDefaults()) {
                shippingCarrierRepository.save(carrier);
            }
        }

        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn vị vận chuyển thành công", activeCarriers));
    }
}
