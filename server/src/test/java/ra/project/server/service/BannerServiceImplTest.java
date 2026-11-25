package ra.project.server.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.entity.Banner;
import ra.project.server.repository.BannerRepository;
import ra.project.server.service.impl.BannerServiceImpl;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: BannerServiceImpl")
class BannerServiceImplTest {

    @Mock
    private BannerRepository bannerRepository;

    @InjectMocks
    private BannerServiceImpl bannerService;

    private Banner activeValidBanner;
    private Banner expiredBanner;

    @BeforeEach
    void setUp() {
        activeValidBanner = Banner.builder()
                .id(1L)
                .title("Siêu phẩm Laptop AI 2026")
                .subtitle("Giảm đến 15% cho sinh viên")
                .badge("HOT")
                .imageUrl("/uploads/banner-1.jpg")
                .linkUrl("/products?category=laptop")
                .position("HERO_SLIDER")
                .displayOrder(1)
                .isActive(true)
                .startDate(LocalDate.now().minusDays(2))
                .endDate(LocalDate.now().plusDays(5))
                .clickCount(4L)
                .build();

        expiredBanner = Banner.builder()
                .id(2L)
                .title("Banner đã hết hạn")
                .imageUrl("/uploads/old.jpg")
                .position("HERO_SLIDER")
                .isActive(true)
                .startDate(LocalDate.now().minusDays(10))
                .endDate(LocalDate.now().minusDays(1))
                .build();
    }

    @Test
    @DisplayName("getPublicBanners lọc đúng banner còn trong khoảng ngày hiệu lực")
    void getPublicBanners_filtersDateRange() {
        when(bannerRepository.findByPositionIgnoreCaseAndIsActiveTrueOrderByDisplayOrderAscIdAsc("hero_slider"))
                .thenReturn(List.of(activeValidBanner, expiredBanner));

        List<Banner> result = bannerService.getPublicBanners("hero_slider");

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).getId());
    }

    @Test
    @DisplayName("searchAdminBanners chuẩn hóa position ALL thành null")
    void searchAdminBanners_normalizesAllPosition() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Banner> page = new PageImpl<>(List.of(activeValidBanner), pageable, 1);
        when(bannerRepository.searchAdminBanners(eq("Laptop"), isNull(), eq(true), eq(pageable))).thenReturn(page);

        PageResponse<Banner> res = bannerService.searchAdminBanners(" Laptop ", "ALL", true, pageable);

        assertEquals(1, res.getContent().size());
        verify(bannerRepository).searchAdminBanners("Laptop", null, true, pageable);
    }

    @Test
    @DisplayName("createBanner báo lỗi nếu thiếu tiêu đề hoặc ngày kết thúc trước ngày bắt đầu")
    void createBanner_invalidInput_throwsBadRequest() {
        Banner missingTitle = Banner.builder().imageUrl("/a.jpg").build();
        assertThrows(BadRequestException.class, () -> bannerService.createBanner(missingTitle));

        Banner invalidDates = Banner.builder()
                .title("Test")
                .imageUrl("/a.jpg")
                .startDate(LocalDate.now().plusDays(5))
                .endDate(LocalDate.now())
                .build();
        assertThrows(BadRequestException.class, () -> bannerService.createBanner(invalidDates));
    }

    @Test
    @DisplayName("createBanner & incrementClickCount lưu DB hợp lệ")
    void createAndClickBanner_success() {
        when(bannerRepository.save(any(Banner.class))).thenAnswer(inv -> {
            Banner b = inv.getArgument(0);
            if (b.getId() == null) b.setId(99L);
            return b;
        });

        Banner created = bannerService.createBanner(Banner.builder()
                .title("Khuyến mãi Màn hình")
                .imageUrl("/banner.png")
                .position("hero_promo")
                .build());

        assertEquals("HERO_PROMO", created.getPosition());
        assertEquals("/products", created.getLinkUrl());
        assertEquals(0L, created.getClickCount());

        when(bannerRepository.findById(1L)).thenReturn(Optional.of(activeValidBanner));
        bannerService.incrementClickCount(1L);
        assertEquals(5L, activeValidBanner.getClickCount());
    }

    @Test
    @DisplayName("getBannerById ném ResourceNotFoundException khi không tồn tại")
    void getBannerById_notFound() {
        when(bannerRepository.findById(404L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> bannerService.getBannerById(404L));
    }
}
