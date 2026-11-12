package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.request.CategoryRequest;
import ra.project.server.model.dto.response.CategoryResponse;

import java.util.List;

public interface CategoryService {

    List<CategoryResponse> getAllCategories();

    List<CategoryResponse> getActiveCategories();

    PageResponse<CategoryResponse> searchAdminCategories(String keyword, Boolean status, Pageable pageable);

    CategoryResponse getCategoryById(Long id);

    CategoryResponse createCategory(CategoryRequest request);

    CategoryResponse updateCategory(Long id, CategoryRequest request);

    CategoryResponse toggleCategoryStatus(Long id, Boolean status);

    void deleteCategory(Long id);
}
