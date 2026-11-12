package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.service.WishlistService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getMyWishlist() {
        List<ProductResponse> items = wishlistService.getMyWishlist();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm yêu thích thành công", items));
    }

    @GetMapping("/ids")
    public ResponseEntity<ApiResponse<List<Long>>> getMyWishlistIds() {
        List<Long> ids = wishlistService.getMyWishlistProductIds();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách ID yêu thích thành công", ids));
    }

    @PostMapping("/{productId}")
    public ResponseEntity<ApiResponse<ProductResponse>> addToWishlist(@PathVariable Long productId) {
        ProductResponse product = wishlistService.addToWishlist(productId);
        return ResponseEntity.ok(ApiResponse.success("Đã thêm vào danh sách yêu thích", product));
    }

    @PostMapping("/{productId}/toggle")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleWishlist(@PathVariable Long productId) {
        Map<String, Object> result = wishlistService.toggleWishlist(productId);
        boolean liked = Boolean.TRUE.equals(result.get("liked"));
        String msg = liked ? "Đã thêm vào danh sách yêu thích" : "Đã bỏ khỏi danh sách yêu thích";
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<ApiResponse<Void>> removeFromWishlist(@PathVariable Long productId) {
        wishlistService.removeFromWishlist(productId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa sản phẩm khỏi danh sách yêu thích", null));
    }
}

