package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.dto.request.ImportReceiptItemRequest;
import ra.project.server.model.dto.request.ImportReceiptRequest;
import ra.project.server.model.dto.response.ImportReceiptItemResponse;
import ra.project.server.model.dto.response.ImportReceiptResponse;
import ra.project.server.model.entity.ImportReceipt;
import ra.project.server.model.entity.ImportReceiptItem;
import ra.project.server.model.entity.Product;
import ra.project.server.model.entity.ProductVariant;
import ra.project.server.repository.ImportReceiptRepository;
import ra.project.server.repository.ProductRepository;
import ra.project.server.repository.ProductVariantRepository;
import ra.project.server.service.ImportReceiptService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImportReceiptServiceImpl implements ImportReceiptService {

    private final ImportReceiptRepository importReceiptRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ImportReceiptResponse> getAllReceipts(String keyword, Pageable pageable) {
        String query = StringUtils.hasText(keyword) ? keyword.trim() : null;
        Page<ImportReceipt> page = importReceiptRepository.searchReceipts(query, pageable);
        List<ImportReceiptResponse> dtos = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return PageResponse.<ImportReceiptResponse>builder()
                .content(dtos)
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .first(page.isFirst())
                .empty(page.isEmpty())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ImportReceiptResponse getReceiptById(Long id) {
        ImportReceipt receipt = importReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phiếu nhập kho", "id", id));
        return mapToResponse(receipt);
    }

    @Override
    @Transactional(readOnly = true)
    public ImportReceiptResponse getReceiptByCode(String code) {
        ImportReceipt receipt = importReceiptRepository.findByReceiptCodeIgnoreCase(code)
                .orElseThrow(() -> new ResourceNotFoundException("Phiếu nhập kho", "code", code));
        return mapToResponse(receipt);
    }

    @Override
    @Transactional
    public ImportReceiptResponse createReceipt(ImportReceiptRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Phiếu nhập phải có ít nhất một sản phẩm!");
        }

        String receiptCode = request.getReceiptCode();
        if (!StringUtils.hasText(receiptCode)) {
            String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            receiptCode = "PN" + datePrefix + "-" + (System.currentTimeMillis() % 1000);
        } else {
            receiptCode = receiptCode.trim();
        }

        if (importReceiptRepository.existsByReceiptCodeIgnoreCase(receiptCode)) {
            throw new BadRequestException("Mã phiếu nhập '" + receiptCode + "' đã tồn tại trong hệ thống!");
        }

        int totalQty = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<ImportReceiptItem> entityItems = new ArrayList<>();

        ImportReceipt receipt = ImportReceipt.builder()
                .receiptCode(receiptCode)
                .importDate(request.getImportDate() != null ? request.getImportDate() : LocalDate.now())
                .supplierName(request.getSupplierName() != null ? request.getSupplierName().trim() : "")
                .importerName(request.getImporterName() != null ? request.getImporterName().trim() : "")
                .warehouse(request.getWarehouse() != null ? request.getWarehouse().trim() : "")
                .note(request.getNote() != null ? request.getNote().trim() : "")
                .build();

        for (ImportReceiptItemRequest itemReq : request.getItems()) {
            int qty = itemReq.getQuantity() != null && itemReq.getQuantity() > 0 ? itemReq.getQuantity() : 1;
            BigDecimal unitPrice = itemReq.getUnitPrice() != null && itemReq.getUnitPrice().compareTo(BigDecimal.ZERO) >= 0
                    ? itemReq.getUnitPrice()
                    : BigDecimal.ZERO;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty));

            totalQty += qty;
            totalAmount = totalAmount.add(lineTotal);

            // Cập nhật tồn kho và giá sản phẩm / biến thể
            String productName = itemReq.getProductName();
            String variantTitle = itemReq.getVariantTitle();
            String sku = itemReq.getSku();

            if (itemReq.getVariantId() != null && itemReq.getVariantId() > 0) {
                ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId())
                        .orElse(null);

                if (variant != null) {
                    if (!StringUtils.hasText(productName) && variant.getProduct() != null) {
                        productName = variant.getProduct().getName();
                    }
                    if (!StringUtils.hasText(sku)) {
                        sku = variant.getSku();
                    }
                    if (!StringUtils.hasText(variantTitle)) {
                        if (variant.getOptionValues() != null && !variant.getOptionValues().isEmpty()) {
                            variantTitle = variant.getOptionValues().stream()
                                    .map(ra.project.server.model.entity.ProductOptionValue::getValue)
                                    .collect(Collectors.joining(" / "));
                        } else {
                            variantTitle = variant.getSku();
                        }
                    }

                    // Tăng tồn kho biến thể
                    int currentStock = variant.getStock() != null ? variant.getStock() : 0;
                    variant.setStock(currentStock + qty);

                    // Cập nhật giá vốn / giá nhập nếu đơn giá nhập > 0
                    if (unitPrice.compareTo(BigDecimal.ZERO) > 0) {
                        variant.setOriginalPrice(unitPrice);
                    }

                    // Cập nhật giá bán mới nếu có nhập giá bán
                    BigDecimal sellingPrice = itemReq.getSellingPrice();
                    if (sellingPrice != null && sellingPrice.compareTo(BigDecimal.ZERO) > 0) {
                        variant.setPrice(sellingPrice);
                    } else if (variant.getPrice() == null || variant.getPrice().compareTo(BigDecimal.ZERO) == 0) {
                        variant.setPrice(unitPrice);
                    }

                    productVariantRepository.save(variant);

                    if (variant.getProduct() != null) {
                        productRepository.syncProductTotalStock(variant.getProduct().getId());
                    }
                }
            } else if (itemReq.getProductId() != null && itemReq.getProductId() > 0) {
                Product product = productRepository.findById(itemReq.getProductId()).orElse(null);
                if (product != null) {
                    if (!StringUtils.hasText(productName)) {
                        productName = product.getName();
                    }
                    int currentStock = product.getStock() != null ? product.getStock() : 0;
                    product.setStock(currentStock + qty);

                    BigDecimal sellingPrice = itemReq.getSellingPrice();
                    if (sellingPrice != null && sellingPrice.compareTo(BigDecimal.ZERO) > 0) {
                        product.setPrice(sellingPrice);
                    } else if (product.getPrice() == null || product.getPrice().compareTo(BigDecimal.ZERO) == 0) {
                        product.setPrice(unitPrice);
                    }
                    productRepository.save(product);
                }
            }

            ImportReceiptItem itemEntity = ImportReceiptItem.builder()
                    .receipt(receipt)
                    .productId(itemReq.getProductId())
                    .productName(productName != null ? productName : "Sản phẩm #" + itemReq.getProductId())
                    .variantId(itemReq.getVariantId())
                    .variantTitle(variantTitle)
                    .sku(sku)
                    .quantity(qty)
                    .unitPrice(unitPrice)
                    .sellingPrice(itemReq.getSellingPrice())
                    .totalPrice(lineTotal)
                    .build();

            entityItems.add(itemEntity);
        }

        receipt.setTotalQuantity(totalQty);
        receipt.setTotalAmount(totalAmount);
        receipt.setItems(entityItems);

        ImportReceipt saved = importReceiptRepository.save(receipt);
        log.info("Tạo phiếu nhập kho thành công: code={}, items={}, totalQty={}, totalAmount={}",
                saved.getReceiptCode(), entityItems.size(), totalQty, totalAmount);

        return mapToResponse(saved);
    }

    private ImportReceiptResponse mapToResponse(ImportReceipt r) {
        List<ImportReceiptItemResponse> itemResponses = r.getItems() != null
                ? r.getItems().stream().map(it -> ImportReceiptItemResponse.builder()
                        .id(it.getId())
                        .productId(it.getProductId())
                        .productName(it.getProductName())
                        .variantId(it.getVariantId())
                        .variantTitle(it.getVariantTitle())
                        .sku(it.getSku())
                        .quantity(it.getQuantity())
                        .unitPrice(it.getUnitPrice())
                        .sellingPrice(it.getSellingPrice())
                        .totalPrice(it.getTotalPrice())
                        .build())
                .collect(Collectors.toList())
                : List.of();

        return ImportReceiptResponse.builder()
                .id(r.getId())
                .receiptCode(r.getReceiptCode())
                .importDate(r.getImportDate())
                .supplierName(r.getSupplierName())
                .importerName(r.getImporterName())
                .warehouse(r.getWarehouse())
                .note(r.getNote())
                .totalQuantity(r.getTotalQuantity())
                .totalAmount(r.getTotalAmount())
                .items(itemResponses)
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
