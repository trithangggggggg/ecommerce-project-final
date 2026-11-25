package ra.project.server.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.entity.Brand;
import ra.project.server.repository.BrandRepository;
import ra.project.server.service.impl.BrandServiceImpl;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: BrandServiceImpl")
class BrandServiceImplTest {

    @Mock
    private BrandRepository brandRepository;

    @InjectMocks
    private BrandServiceImpl brandService;

    @Test
    @DisplayName("createBrand tự sinh slug và chặn tên thương hiệu trùng")
    void createBrand_generatesSlugAndChecksDuplicate() {
        when(brandRepository.existsByNameIgnoreCase("Apple")).thenReturn(false);
        when(brandRepository.existsBySlugIgnoreCase("apple")).thenReturn(false);
        when(brandRepository.save(any(Brand.class))).thenAnswer(inv -> {
            Brand b = inv.getArgument(0);
            b.setId(1L);
            return b;
        });

        Brand saved = brandService.createBrand(Brand.builder().name("Apple").country("USA").build());
        assertEquals("apple", saved.getSlug());
        assertTrue(saved.getStatus());

        when(brandRepository.existsByNameIgnoreCase("Apple")).thenReturn(true);
        assertThrows(BadRequestException.class, () -> brandService.createBrand(Brand.builder().name("Apple").build()));
    }

    @Test
    @DisplayName("toggleBrandStatus & updateBrand hoạt động chuẩn")
    void updateAndToggleBrand_success() {
        Brand existing = Brand.builder().id(2L).name("ASUS").slug("asus").status(true).displayOrder(1).build();
        when(brandRepository.findById(2L)).thenReturn(Optional.of(existing));
        when(brandRepository.existsByNameIgnoreCaseAndIdNot("ASUS ROG", 2L)).thenReturn(false);
        when(brandRepository.existsBySlugIgnoreCaseAndIdNot("asus-rog", 2L)).thenReturn(false);
        when(brandRepository.save(any(Brand.class))).thenAnswer(inv -> inv.getArgument(0));

        Brand updated = brandService.updateBrand(2L, Brand.builder().name("ASUS ROG").build());
        assertEquals("asus-rog", updated.getSlug());

        Brand toggled = brandService.toggleBrandStatus(2L, null);
        assertFalse(toggled.getStatus());
    }

    @Test
    @DisplayName("getBrandById báo lỗi khi không tìm thấy")
    void getBrandById_notFound() {
        when(brandRepository.findById(404L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> brandService.getBrandById(404L));
    }
}

