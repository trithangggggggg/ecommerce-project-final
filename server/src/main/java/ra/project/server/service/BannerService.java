package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.entity.Banner;

import java.util.List;

public interface BannerService {

    List<Banner> getPublicBanners(String position);

    Banner getBannerById(Long id);

    void incrementClickCount(Long id);

    PageResponse<Banner> searchAdminBanners(String keyword, String position, Boolean isActive, Pageable pageable);

    Banner createBanner(Banner request);

    Banner updateBanner(Long id, Banner request);

    Banner toggleBannerStatus(Long id, Boolean isActive);

    void deleteBanner(Long id);
}

