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
import ra.project.server.model.dto.request.FlashSaleRequest;
import ra.project.server.model.dto.response.FlashSaleResponse;
import ra.project.server.model.entity.FlashSale;
import ra.project.server.model.entity.FlashSaleItem;
import ra.project.server.model.entity.Product;
import ra.project.server.repository.FlashSaleRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.FlashSaleService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FlashSaleServiceImpl implements FlashSaleService {

    private final FlashSaleRepository flashSaleRepository;
    private final ProductRepository productRepository;

    @Override
    @Transactional(readOnly = true)
    public FlashSaleResponse getCurrentFlashSale() {
        List<FlashSale> live = flashSaleRepository.findActiveFlashSales(LocalDateTime.now());
        if (live.isEmpty()) {
            return null;
        }
        return toResponse(live.get(0), true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FlashSaleResponse> getPublicFlashSales() {
        return flashSaleRepository.findActiveFlashSales(LocalDateTime.now())
                .stream()
                .map(fs -> toResponse(fs, true))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<FlashSaleResponse> searchAdminFlashSales(String keyword, Boolean isActive, Pageable pageable) {
        String cleanKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        Page<FlashSale> page = flashSaleRepository.searchAdminFlashSales(cleanKeyword, isActive, pageable);
        return PageResponse.from(page.map(fs -> toResponse(fs, false)));
    }

    @Override
    @Transactional(readOnly = true)
    public FlashSaleResponse getFlashSaleById(Long id) {
        FlashSale fs = flashSaleRepository.findWithItemsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chương trình Flash Sale", "id", id));
        return toResponse(fs, true);
    }

    @Override
    public FlashSaleResponse createFlashSale(FlashSaleRequest request) {
        validateRequest(request);
        FlashSale flashSale = FlashSale.builder()
                .title(request.getTitle().trim())
                .description(StringUtils.hasText(request.getDescription()) ? request.getDescription().trim() : null)
                .badgeText(StringUtils.hasText(request.getBadgeText()) ? request.getBadgeText().trim() : "FLASH SALE")
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .items(new ArrayList<>())
                .build();

        applyItems(flashSale, request.getItems());
        FlashSale saved = flashSaleRepository.save(flashSale);
        return toResponse(saved, true);
    }

    @Override
    public FlashSaleResponse updateFlashSale(Long id, FlashSaleRequest request) {
        FlashSale existing = flashSaleRepository.findWithItemsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chương trình Flash Sale", "id", id));
        validateRequest(request);

        existing.setTitle(request.getTitle().trim());
        existing.setDescription(StringUtils.hasText(request.getDescription()) ? request.getDescription().trim() : null);
        existing.setBadgeText(StringUtils.hasText(request.getBadgeText()) ? request.getBadgeText().trim() : "FLASH SALE");
        existing.setStartTime(request.getStartTime());
        existing.setEndTime(request.getEndTime());
        if (request.getIsActive() != null) {
            existing.setIsActive(request.getIsActive());
        }

        applyItems(existing, request.getItems());
        FlashSale updated = flashSaleRepository.save(existing);
        return toResponse(updated, true);
    }

    @Override
    public FlashSaleResponse toggleFlashSaleStatus(Long id, Boolean isActive) {
        FlashSale existing = flashSaleRepository.findWithItemsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chương trình Flash Sale", "id", id));
        existing.setIsActive(isActive != null ? isActive : !Boolean.TRUE.equals(existing.getIsActive()));
        FlashSale saved = flashSaleRepository.save(existing);
        return toResponse(saved, true);
    }

    @Override
    public void deleteFlashSale(Long id) {
        if (!flashSaleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Chương trình Flash Sale", "id", id);
        }
        flashSaleRepository.deleteById(id);
    }

    private void validateRequest(FlashSaleRequest request) {
        if (request == null || !StringUtils.hasText(request.getTitle())) {
            throw new BadRequestException("Tên chương trình Flash Sale không được để trống");
        }
        if (request.getStartTime() == null || request.getEndTime() == null) {
            throw new BadRequestException("Vui lòng chọn thời gian bắt đầu và kết thúc Flash Sale");
        }
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
    }

    private void applyItems(FlashSale flashSale, List<FlashSaleRequest.FlashSaleItemRequest> itemReqs) {
        flashSale.getItems().clear();
        if (itemReqs == null || itemReqs.isEmpty()) {
            return;
        }
        int order = 1;
        for (FlashSaleRequest.FlashSaleItemRequest itemReq : itemReqs) {
            if (itemReq.getProductId() == null) continue;
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", itemReq.getProductId()));
            BigDecimal origPrice = itemReq.getOriginalPrice() != null && itemReq.getOriginalPrice().compareTo(BigDecimal.ZERO) > 0
                    ? itemReq.getOriginalPrice()
                    : (product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO);
            BigDecimal salePrice = itemReq.getSalePrice() != null && itemReq.getSalePrice().compareTo(BigDecimal.ZERO) > 0
                    ? itemReq.getSalePrice()
                    : origPrice;
            FlashSaleItem item = FlashSaleItem.builder()
                    .flashSale(flashSale)
                    .product(product)
                    .salePrice(salePrice)
                    .originalPrice(origPrice)
                    .stockLimit(itemReq.getStockLimit() != null && itemReq.getStockLimit() > 0 ? itemReq.getStockLimit() : 20)
                    .soldCount(itemReq.getSoldCount() != null && itemReq.getSoldCount() >= 0 ? itemReq.getSoldCount() : 0)
                    .displayOrder(itemReq.getDisplayOrder() != null ? itemReq.getDisplayOrder() : order++)
                    .build();
            flashSale.getItems().add(item);
        }
    }

    private FlashSaleResponse toResponse(FlashSale fs, boolean includeItems) {
        LocalDateTime now = LocalDateTime.now();
        long remainingSeconds = 0L;
        String runtimeStatus;

        if (!Boolean.TRUE.equals(fs.getIsActive())) {
            runtimeStatus = "INACTIVE";
        } else if (now.isBefore(fs.getStartTime())) {
            runtimeStatus = "UPCOMING";
            remainingSeconds = Math.max(0L, Duration.between(now, fs.getStartTime()).getSeconds());
        } else if (now.isAfter(fs.getEndTime())) {
            runtimeStatus = "ENDED";
        } else {
            runtimeStatus = "LIVE";
            remainingSeconds = Math.max(0L, Duration.between(now, fs.getEndTime()).getSeconds());
        }

        List<FlashSaleResponse.FlashSaleItemResponse> itemResponses = includeItems && fs.getItems() != null
                ? fs.getItems().stream().map(this::toItemResponse).collect(Collectors.toList())
                : null;

        return FlashSaleResponse.builder()
                .id(fs.getId())
                .title(fs.getTitle())
                .description(fs.getDescription())
                .badgeText(fs.getBadgeText())
                .startTime(fs.getStartTime())
                .endTime(fs.getEndTime())
                .isActive(fs.getIsActive())
                .remainingSeconds(remainingSeconds)
                .runtimeStatus(runtimeStatus)
                .itemCount(fs.getItems() != null ? fs.getItems().size() : 0)
                .items(itemResponses)
                .createdAt(fs.getCreatedAt())
                .updatedAt(fs.getUpdatedAt())
                .build();
    }

    private FlashSaleResponse.FlashSaleItemResponse toItemResponse(FlashSaleItem item) {
        Product p = item.getProduct();
        BigDecimal orig = item.getOriginalPrice() != null ? item.getOriginalPrice() : (p != null ? p.getPrice() : BigDecimal.ZERO);
        BigDecimal sale = item.getSalePrice() != null ? item.getSalePrice() : orig;
        int discountPct = 0;
        if (orig != null && orig.compareTo(BigDecimal.ZERO) > 0 && sale.compareTo(orig) < 0) {
            discountPct = orig.subtract(sale)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(orig, 0, RoundingMode.HALF_UP)
                    .intValue();
        }
        int limit = item.getStockLimit() != null ? item.getStockLimit() : 0;
        int sold = item.getSoldCount() != null ? item.getSoldCount() : 0;
        return FlashSaleResponse.FlashSaleItemResponse.builder()
                .id(item.getId())
                .productId(p != null ? p.getId() : null)
                .productName(p != null ? p.getName() : null)
                .productBrand(p != null ? p.getBrand() : null)
                .productImageUrl(p != null ? p.getImageUrl() : null)
                .salePrice(sale)
                .originalPrice(orig)
                .discountPercent(discountPct)
                .stockLimit(limit)
                .soldCount(sold)
                .remainingStock(Math.max(0, limit - sold))
                .displayOrder(item.getDisplayOrder())
                .build();
    }
}

