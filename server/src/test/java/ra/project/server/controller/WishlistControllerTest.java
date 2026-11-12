package ra.project.server.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ra.project.server.exception.GlobalExceptionHandler;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.service.WishlistService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class WishlistControllerTest {

    private MockMvc mockMvc;

    @Mock
    private WishlistService wishlistService;

    @InjectMocks
    private WishlistController wishlistController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(wishlistController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/wishlist trả về danh sách sản phẩm yêu thích")
    void getMyWishlist_returns200() throws Exception {
        ProductResponse p = ProductResponse.builder()
                .id(15L)
                .name("iPad Pro M4")
                .price(BigDecimal.valueOf(28990000))
                .build();
        when(wishlistService.getMyWishlist()).thenReturn(List.of(p));

        mockMvc.perform(get("/api/wishlist"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(15))
                .andExpect(jsonPath("$.data[0].name").value("iPad Pro M4"));
    }

    @Test
    @DisplayName("POST /api/wishlist/{id}/toggle chuyển đổi trạng thái yêu thích")
    void toggleWishlist_returns200() throws Exception {
        when(wishlistService.toggleWishlist(15L)).thenReturn(Map.of(
                "productId", 15L,
                "liked", true,
                "count", 1,
                "productIds", List.of(15L)
        ));

        mockMvc.perform(post("/api/wishlist/15/toggle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.liked").value(true))
                .andExpect(jsonPath("$.data.count").value(1));
    }

    @Test
    @DisplayName("DELETE /api/wishlist/{id} xóa khỏi yêu thích")
    void removeFromWishlist_returns200() throws Exception {
        mockMvc.perform(delete("/api/wishlist/15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}

