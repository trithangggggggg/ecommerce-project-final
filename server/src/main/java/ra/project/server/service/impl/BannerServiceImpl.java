package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.entity.Banner;
import ra.project.server.repository.BannerRepository;
import ra.project.server.service.BannerService;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BannerServiceImpl implements BannerService {

    private final BannerRepository bannerRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Banner> getPublicBanners(String position) {
        LocalDate today = LocalDate.now();
        List<Banner> list = StringUtils.hasText(position)
                ? bannerRepository.findByPositionIgnoreCaseAndIsActiveTrueOrderByDisplayOrderAscIdAsc(position.trim())
                : bannerRepository.findByIsActiveTrueOrderByDisplayOrderAscIdAsc();

        return list.stream()
                .filter(b -> b.getStartDate() == null || !today.isBefore(b.getStartDate()))
                .filter(b -> b.getEndDate() == null || !today.isAfter(b.getEndDate()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Banner getBannerById(Long id) {
        return bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner", "id", id));
    }

    @Override
    public void incrementClickCount(Long id) {
        Banner banner = getBannerById(id);
        banner.setClickCount((banner.getClickCount() != null ? banner.getClickCount() : 0L) + 1L);
        bannerRepository.save(banner);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<Banner> searchAdminBanners(String keyword, String position, Boolean isActive, Pageable pageable) {
        String cleanKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String cleanPos = (StringUtils.hasText(position) && !"ALL".equalsIgnoreCase(position)) ? position.trim().toUpperCase() : null;
        Page<Banner> page = bannerRepository.searchAdminBanners(cleanKeyword, cleanPos, isActive, pageable);
        return PageResponse.from(page);
    }

    @Override
    public Banner createBanner(Banner request) {
        validateBanner(request);
        Banner banner = Banner.builder()
                .title(request.getTitle().trim())
                .subtitle(StringUtils.hasText(request.getSubtitle()) ? request.getSubtitle().trim() : null)
                .badge(StringUtils.hasText(request.getBadge()) ? request.getBadge().trim() : null)
                .imageUrl(request.getImageUrl().trim())
                .linkUrl(StringUtils.hasText(request.getLinkUrl()) ? request.getLinkUrl().trim() : "/products")
                .position(StringUtils.hasText(request.getPosition()) ? request.getPosition().trim().toUpperCase() : "HERO_SLIDER")
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .clickCount(0L)
                .build();
        return bannerRepository.save(banner);
    }

    @Override
    public Banner updateBanner(Long id, Banner request) {
        Banner existing = getBannerById(id);
        validateBanner(request);
        existing.setTitle(request.getTitle().trim());
        existing.setSubtitle(StringUtils.hasText(request.getSubtitle()) ? request.getSubtitle().trim() : null);
        existing.setBadge(StringUtils.hasText(request.getBadge()) ? request.getBadge().trim() : null);
        existing.setImageUrl(request.getImageUrl().trim());
        existing.setLinkUrl(StringUtils.hasText(request.getLinkUrl()) ? request.getLinkUrl().trim() : "/products");
        if (StringUtils.hasText(request.getPosition())) {
            existing.setPosition(request.getPosition().trim().toUpperCase());
        }
        if (request.getDisplayOrder() != null) {
            existing.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getIsActive() != null) {
            existing.setIsActive(request.getIsActive());
        }
        existing.setStartDate(request.getStartDate());
        existing.setEndDate(request.getEndDate());
        return bannerRepository.save(existing);
    }

    @Override
    public Banner toggleBannerStatus(Long id, Boolean isActive) {
        Banner existing = getBannerById(id);
        existing.setIsActive(isActive != null ? isActive : !Boolean.TRUE.equals(existing.getIsActive()));
        return bannerRepository.save(existing);
    }

    @Override
    public void deleteBanner(Long id) {
        Banner existing = getBannerById(id);
        bannerRepository.delete(existing);
    }

    private void validateBanner(Banner request) {
        if (request == null || !StringUtils.hasText(request.getTitle())) {
            throw new BadRequestException("Tiêu đề banner không được để trống");
        }
        if (!StringUtils.hasText(request.getImageUrl())) {
            throw new BadRequestException("Đường dẫn ảnh banner không được để trống");
        }
        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Ngày kết thúc không được trước ngày bắt đầu");
        }
    }
}

