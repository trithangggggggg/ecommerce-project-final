package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.entity.Brand;

import java.util.List;

public interface BrandService {

    List<Brand> getActiveBrands();

    PageResponse<Brand> searchAdminBrands(String keyword, Boolean status, Pageable pageable);

    Brand getBrandById(Long id);

    Brand createBrand(Brand request);

    Brand updateBrand(Long id, Brand request);

    Brand toggleBrandStatus(Long id, Boolean status);

    void deleteBrand(Long id);
}

