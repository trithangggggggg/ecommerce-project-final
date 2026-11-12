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
import ra.project.server.model.entity.Brand;
import ra.project.server.repository.BrandRepository;
import ra.project.server.service.BrandService;
import ra.project.server.util.SlugUtil;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class BrandServiceImpl implements BrandService {

    private final BrandRepository brandRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Brand> getActiveBrands() {
        return brandRepository.findByStatusTrueOrderByDisplayOrderAscNameAsc();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<Brand> searchAdminBrands(String keyword, Boolean status, Pageable pageable) {
        String cleanKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        Page<Brand> page = brandRepository.searchAdminBrands(cleanKeyword, status, pageable);
        return PageResponse.from(page);
    }

    @Override
    @Transactional(readOnly = true)
    public Brand getBrandById(Long id) {
        return brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thương hiệu", "id", id));
    }

    @Override
    public Brand createBrand(Brand request) {
        if (request == null || !StringUtils.hasText(request.getName())) {
            throw new BadRequestException("Tên thương hiệu không được để trống");
        }
        String name = request.getName().trim();
        if (brandRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Thương hiệu '" + name + "' đã tồn tại");
        }
        String slug = StringUtils.hasText(request.getSlug())
                ? SlugUtil.toSlug(request.getSlug())
                : SlugUtil.toSlug(name);
        if (brandRepository.existsBySlugIgnoreCase(slug)) {
            slug = slug + "-" + System.currentTimeMillis() % 1000;
        }
        Brand brand = Brand.builder()
                .name(name)
                .slug(slug)
                .logoUrl(StringUtils.hasText(request.getLogoUrl()) ? request.getLogoUrl().trim() : null)
                .country(StringUtils.hasText(request.getCountry()) ? request.getCountry().trim() : null)
                .description(request.getDescription())
                .websiteUrl(StringUtils.hasText(request.getWebsiteUrl()) ? request.getWebsiteUrl().trim() : null)
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .status(request.getStatus() != null ? request.getStatus() : true)
                .build();
        return brandRepository.save(brand);
    }

    @Override
    public Brand updateBrand(Long id, Brand request) {
        Brand existing = getBrandById(id);
        if (request == null || !StringUtils.hasText(request.getName())) {
            throw new BadRequestException("Tên thương hiệu không được để trống");
        }
        String name = request.getName().trim();
        if (brandRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BadRequestException("Thương hiệu '" + name + "' đã tồn tại ở bản ghi khác");
        }
        String slug = StringUtils.hasText(request.getSlug())
                ? SlugUtil.toSlug(request.getSlug())
                : SlugUtil.toSlug(name);
        if (brandRepository.existsBySlugIgnoreCaseAndIdNot(slug, id)) {
            slug = slug + "-" + id;
        }
        existing.setName(name);
        existing.setSlug(slug);
        existing.setLogoUrl(StringUtils.hasText(request.getLogoUrl()) ? request.getLogoUrl().trim() : null);
        existing.setCountry(StringUtils.hasText(request.getCountry()) ? request.getCountry().trim() : null);
        existing.setDescription(request.getDescription());
        existing.setWebsiteUrl(StringUtils.hasText(request.getWebsiteUrl()) ? request.getWebsiteUrl().trim() : null);
        if (request.getDisplayOrder() != null) {
            existing.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getStatus() != null) {
            existing.setStatus(request.getStatus());
        }
        return brandRepository.save(existing);
    }

    @Override
    public Brand toggleBrandStatus(Long id, Boolean status) {
        Brand existing = getBrandById(id);
        existing.setStatus(status != null ? status : !Boolean.TRUE.equals(existing.getStatus()));
        return brandRepository.save(existing);
    }

    @Override
    public void deleteBrand(Long id) {
        Brand existing = getBrandById(id);
        brandRepository.delete(existing);
    }
}

