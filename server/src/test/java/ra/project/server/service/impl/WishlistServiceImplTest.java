package ra.project.server.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WishlistServiceImplTest {

    @Mock
    private WishlistRepository wishlistRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductMapper productMapper;

    @InjectMocks
    private WishlistServiceImpl wishlistService;

    private User customer;
    private Product product;
    private ProductResponse productResponse;

    @BeforeEach
    void setUp() {
        customer = User.builder().id(10L).username("khach1").email("k1@nexor.vn").build();
        product = Product.builder().id(99L).name("MacBook Pro M4").price(BigDecimal.valueOf(45000000)).isDeleted(false).build();
        productResponse = ProductResponse.builder().id(99L).name("MacBook Pro M4").price(BigDecimal.valueOf(45000000)).build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("khach1", "pass", List.of())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("toggleWishlist thêm sản phẩm vào DB khi chưa thích")
    void toggleWishlist_addsWhenNotPresent() {
        when(userRepository.findByUsername("khach1")).thenReturn(Optional.of(customer));
        when(wishlistRepository.findByUserIdAndProductId(10L, 99L)).thenReturn(Optional.empty());
        when(productRepository.findById(99L)).thenReturn(Optional.of(product));
        when(wishlistRepository.findProductIdsByUserId(10L)).thenReturn(List.of(99L));

        Map<String, Object> result = wishlistService.toggleWishlist(99L);

        assertEquals(true, result.get("liked"));
        assertEquals(1, result.get("count"));
        verify(wishlistRepository, times(1)).save(any(WishlistItem.class));
    }

    @Test
    @DisplayName("toggleWishlist xóa sản phẩm khỏi DB khi đã thích")
    void toggleWishlist_removesWhenPresent() {
        WishlistItem existing = WishlistItem.builder().id(5L).user(customer).product(product).build();
        when(userRepository.findByUsername("khach1")).thenReturn(Optional.of(customer));
        when(wishlistRepository.findByUserIdAndProductId(10L, 99L)).thenReturn(Optional.of(existing));
        when(wishlistRepository.findProductIdsByUserId(10L)).thenReturn(List.of());

        Map<String, Object> result = wishlistService.toggleWishlist(99L);

        assertEquals(false, result.get("liked"));
        assertEquals(0, result.get("count"));
        verify(wishlistRepository, times(1)).delete(existing);
    }

    @Test
    @DisplayName("getMyWishlist trả về danh sách sản phẩm đã map")
    void getMyWishlist_returnsMappedProducts() {
        WishlistItem item = WishlistItem.builder().id(1L).user(customer).product(product).build();
        when(userRepository.findByUsername("khach1")).thenReturn(Optional.of(customer));
        when(wishlistRepository.findActiveByUserId(10L)).thenReturn(List.of(item));
        when(productMapper.toResponse(product)).thenReturn(productResponse);

        List<ProductResponse> list = wishlistService.getMyWishlist();

        assertEquals(1, list.size());
        assertEquals("MacBook Pro M4", list.get(0).getName());
    }

    @Test
    @DisplayName("toggleWishlist chặn sản phẩm đã bị xóa mềm")
    void toggleWishlist_throwsWhenProductDeleted() {
        Product deletedProduct = Product.builder().id(88L).name("Old").isDeleted(true).build();
        when(userRepository.findByUsername("khach1")).thenReturn(Optional.of(customer));
        when(wishlistRepository.findByUserIdAndProductId(10L, 88L)).thenReturn(Optional.empty());
        when(productRepository.findById(88L)).thenReturn(Optional.of(deletedProduct));

        assertThrows(ResourceNotFoundException.class, () -> wishlistService.toggleWishlist(88L));
    }

    @Test
    @DisplayName("Chặn thao tác wishlist khi chưa đăng nhập")
    void getMyWishlist_throwsUnauthorizedWhenAnonymous() {
        SecurityContextHolder.clearContext();
        assertThrows(UnauthorizedException.class, () -> wishlistService.getMyWishlist());
    }
}

