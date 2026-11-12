package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.request.FlashSaleRequest;
import ra.project.server.model.dto.response.FlashSaleResponse;

import java.util.List;

public interface FlashSaleService {

    FlashSaleResponse getCurrentFlashSale();

    List<FlashSaleResponse> getPublicFlashSales();

    PageResponse<FlashSaleResponse> searchAdminFlashSales(String keyword, Boolean isActive, Pageable pageable);

    FlashSaleResponse getFlashSaleById(Long id);

    FlashSaleResponse createFlashSale(FlashSaleRequest request);

    FlashSaleResponse updateFlashSale(Long id, FlashSaleRequest request);

    FlashSaleResponse toggleFlashSaleStatus(Long id, Boolean isActive);

    void deleteFlashSale(Long id);
}

