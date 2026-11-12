package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.exception.UnauthorizedException;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.User;
import ra.project.server.model.entity.WishlistItem;
import ra.project.server.repository.ProductRepository;
import ra.project.server.repository.UserRepository;
import ra.project.server.repository.WishlistRepository;
import ra.project.server.service.WishlistService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class WishlistServiceImpl implements WishlistService {

    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new UnauthorizedException("Vui lòng đăng nhập để sử dụng danh sách yêu thích");
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new UnauthorizedException("Tài khoản không tồn tại hoặc đã bị đăng xuất"));
    }

    private Product findActiveProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", productId));
        if (Boolean.TRUE.equals(product.getIsDeleted())) {
            throw new ResourceNotFoundException("Sản phẩm không tồn tại hoặc đã ngừng kinh doanh!");
        }
        return product;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getMyWishlist() {
        User user = getCurrentUser();
        return wishlistRepository.findActiveByUserId(user.getId())
                .stream()
                .map(WishlistItem::getProduct)
                .map(productMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Long> getMyWishlistProductIds() {
        User user = getCurrentUser();
        return wishlistRepository.findProductIdsByUserId(user.getId());
    }

    @Override
    public Map<String, Object> toggleWishlist(Long productId) {
        User user = getCurrentUser();
        Optional<WishlistItem> existing = wishlistRepository.findByUserIdAndProductId(user.getId(), productId);

        boolean liked;
        if (existing.isPresent()) {
            wishlistRepository.delete(existing.get());
            liked = false;
        } else {
            Product product = findActiveProduct(productId);
            wishlistRepository.save(WishlistItem.builder()
                    .user(user)
                    .product(product)
                    .build());
            liked = true;
        }

        List<Long> productIds = wishlistRepository.findProductIdsByUserId(user.getId());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("productId", productId);
        result.put("liked", liked);
        result.put("count", productIds.size());
        result.put("productIds", productIds);
        return result;
    }

    @Override
    public ProductResponse addToWishlist(Long productId) {
        User user = getCurrentUser();
        Product product = findActiveProduct(productId);

        if (!wishlistRepository.existsByUserIdAndProductId(user.getId(), productId)) {
            wishlistRepository.save(WishlistItem.builder()
                    .user(user)
                    .product(product)
                    .build());
        }
        return productMapper.toResponse(product);
    }

    @Override
    public void removeFromWishlist(Long productId) {
        User user = getCurrentUser();
        wishlistRepository.deleteByUserIdAndProductId(user.getId(), productId);
    }
}

