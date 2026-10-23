package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.repository.OrderRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.repository.UserRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminDashboardController {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        long totalProducts = productRepository.count();
        long totalOrders = orderRepository.count();
        long totalCustomers = userRepository.countByRole(ra.project.server.model.enums.Role.CUSTOMER);

        java.math.BigDecimal revenueRaw = orderRepository.calculateTotalRevenue();
        if (revenueRaw == null) {
            revenueRaw = java.math.BigDecimal.ZERO;
        }
        long revenueLong = revenueRaw.longValue();
        String formattedRevenue = String.format("%,d ₫", revenueLong).replace(',', '.');

        stats.put("totalProducts", totalProducts);
        stats.put("totalOrders", totalOrders);
        stats.put("totalCustomers", totalCustomers);
        stats.put("totalRevenueRaw", revenueLong);
        stats.put("totalRevenueFormatted", formattedRevenue);

        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu Dashboard thành công", stats));
    }
}
