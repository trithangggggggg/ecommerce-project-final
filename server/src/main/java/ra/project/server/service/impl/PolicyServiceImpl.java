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
import ra.project.server.model.entity.Policy;
import ra.project.server.repository.PolicyRepository;
import ra.project.server.service.PolicyService;
import ra.project.server.util.SlugUtil;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PolicyServiceImpl implements PolicyService {

    private final PolicyRepository policyRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Policy> getPublicPolicies() {
        return policyRepository.findByIsActiveTrueOrderByDisplayOrderAscIdAsc();
    }

    @Override
    @Transactional(readOnly = true)
    public Policy getPublicPolicyBySlug(String slug) {
        return policyRepository.findBySlugIgnoreCaseAndIsActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Chính sách", "slug", slug));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<Policy> searchAdminPolicies(String keyword, String category, Boolean isActive, Pageable pageable) {
        String cleanKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String cleanCat = (StringUtils.hasText(category) && !"ALL".equalsIgnoreCase(category)) ? category.trim().toUpperCase() : null;
        Page<Policy> page = policyRepository.searchAdminPolicies(cleanKeyword, cleanCat, isActive, pageable);
        return PageResponse.from(page);
    }

    @Override
    @Transactional(readOnly = true)
    public Policy getPolicyById(Long id) {
        return policyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chính sách", "id", id));
    }

    @Override
    public Policy createPolicy(Policy request) {
        if (request == null || !StringUtils.hasText(request.getTitle())) {
            throw new BadRequestException("Tiêu đề chính sách không được để trống");
        }
        String title = request.getTitle().trim();
        String slug = StringUtils.hasText(request.getSlug())
                ? SlugUtil.toSlug(request.getSlug())
                : SlugUtil.toSlug(title);
        if (policyRepository.existsBySlugIgnoreCase(slug)) {
            slug = slug + "-" + System.currentTimeMillis() % 1000;
        }
        Policy policy = Policy.builder()
                .title(title)
                .slug(slug)
                .category(StringUtils.hasText(request.getCategory()) ? request.getCategory().trim().toUpperCase() : "GENERAL")
                .summary(StringUtils.hasText(request.getSummary()) ? request.getSummary().trim() : null)
                .content(request.getContent())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        return policyRepository.save(policy);
    }

    @Override
    public Policy updatePolicy(Long id, Policy request) {
        Policy existing = getPolicyById(id);
        if (request == null || !StringUtils.hasText(request.getTitle())) {
            throw new BadRequestException("Tiêu đề chính sách không được để trống");
        }
        String title = request.getTitle().trim();
        String slug = StringUtils.hasText(request.getSlug())
                ? SlugUtil.toSlug(request.getSlug())
                : SlugUtil.toSlug(title);
        if (policyRepository.existsBySlugIgnoreCaseAndIdNot(slug, id)) {
            slug = slug + "-" + id;
        }
        existing.setTitle(title);
        existing.setSlug(slug);
        if (StringUtils.hasText(request.getCategory())) {
            existing.setCategory(request.getCategory().trim().toUpperCase());
        }
        existing.setSummary(StringUtils.hasText(request.getSummary()) ? request.getSummary().trim() : null);
        existing.setContent(request.getContent());
        if (request.getDisplayOrder() != null) {
            existing.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getIsActive() != null) {
            existing.setIsActive(request.getIsActive());
        }
        return policyRepository.save(existing);
    }

    @Override
    public Policy togglePolicyStatus(Long id, Boolean isActive) {
        Policy existing = getPolicyById(id);
        existing.setIsActive(isActive != null ? isActive : !Boolean.TRUE.equals(existing.getIsActive()));
        return policyRepository.save(existing);
    }

    @Override
    public void deletePolicy(Long id) {
        Policy existing = getPolicyById(id);
        policyRepository.delete(existing);
    }
}

