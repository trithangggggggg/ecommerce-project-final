package ra.project.server.service;

import ra.project.server.model.dto.response.ProductResponse;

import java.util.List;
import java.util.Map;

public interface WishlistService {

    List<ProductResponse> getMyWishlist();

    List<Long> getMyWishlistProductIds();

    Map<String, Object> toggleWishlist(Long productId);

    ProductResponse addToWishlist(Long productId);

    void removeFromWishlist(Long productId);
}

