package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.mapper.CategoryMapper;
import ra.project.server.model.dto.request.CategoryRequest;
import ra.project.server.model.dto.response.CategoryResponse;
import ra.project.server.model.entity.Category;
import ra.project.server.repository.CategoryRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.CategoryService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CategoryMapper categoryMapper;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAscIdAsc()
                .stream()
                .map(categoryMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findByStatusTrueOrderByDisplayOrderAscIdAsc()
                .stream()
                .map(categoryMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CategoryResponse> searchAdminCategories(String keyword, Boolean status, Pageable pageable) {
        List<CategoryResponse> filtered = categoryRepository.findAllByOrderByDisplayOrderAscIdAsc()
                .stream()
                .filter(c -> {
                    if (!StringUtils.hasText(keyword)) return true;
                    String q = keyword.trim().toLowerCase();
                    return c.getName().toLowerCase().contains(q)
                            || (c.getSlug() != null && c.getSlug().toLowerCase().contains(q))
                            || (c.getDescription() != null && c.getDescription().toLowerCase().contains(q));
                })
                .filter(c -> status == null || status.equals(c.getStatus()))
                .map(categoryMapper::toResponse)
                .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<CategoryResponse> slice = start >= filtered.size() ? List.of() : filtered.subList(start, end);
        return PageResponse.from(new PageImpl<>(slice, pageable, filtered.size()));
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
        return categoryMapper.toResponse(category);
    }

    @Override
    public CategoryResponse createCategory(CategoryRequest request) {
        if (categoryRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw new BadRequestException("Tên danh mục '" + request.getName().trim() + "' đã tồn tại!");
        }

        Category category = categoryMapper.toEntity(request);
        Category savedCategory = categoryRepository.save(category);
        return categoryMapper.toResponse(savedCategory);
    }

    @Override
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));

        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(request.getName().trim(), id)) {
            throw new BadRequestException("Tên danh mục '" + request.getName().trim() + "' đã tồn tại ở danh mục khác!");
        }

        categoryMapper.updateEntity(category, request);
        Category updatedCategory = categoryRepository.save(category);
        return categoryMapper.toResponse(updatedCategory);
    }

    @Override
    public CategoryResponse toggleCategoryStatus(Long id, Boolean status) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
        category.setStatus(status != null ? status : !Boolean.TRUE.equals(category.getStatus()));
        Category saved = categoryRepository.save(category);
        return categoryMapper.toResponse(saved);
    }

    @Override
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));

        long productCount = productRepository.countByCategoryId(id);
        if (productCount > 0) {
            throw new BadRequestException("Không thể xóa danh mục vì vẫn còn " + productCount + " sản phẩm đang thuộc danh mục này!");
        }

        categoryRepository.delete(category);
    }
}
