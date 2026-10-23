package ra.project.server.mapper;

import org.springframework.stereotype.Component;
import ra.project.server.model.dto.request.ProductRequest;
import ra.project.server.model.dto.response.*;
import ra.project.server.model.entity.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class ProductMapper {

    public Product toEntity(ProductRequest request, Category category) {
        if (request == null) {
            return null;
        }
        return Product.builder()
                .name(request.getName().trim())
                .brand(request.getBrand() != null && !request.getBrand().isBlank() ? request.getBrand().trim() : null)
                .description(request.getDescription())
                .price(request.getPrice() != null ? request.getPrice() : BigDecimal.ZERO)
                .stock(request.getStock() != null ? request.getStock() : 0)
                .imageUrl(request.getImageUrl())
                .status(request.getStatus() != null ? request.getStatus() : true)
                .category(category)
                .build();
    }

    public ProductResponse toResponse(Product entity) {
        if (entity == null) {
            return null;
        }

        BigDecimal minPrice = entity.getMinPrice();
        BigDecimal maxPrice = entity.getMaxPrice();
        Integer totalStock = entity.getTotalStock();

        BigDecimal originalPrice = null;
        if (entity.getVariants() != null && !entity.getVariants().isEmpty()) {
            originalPrice = entity.getVariants().stream()
                    .filter(v -> Boolean.TRUE.equals(v.getStatus()) && v.getOriginalPrice() != null)
                    .map(ProductVariant::getOriginalPrice)
                    .min(BigDecimal::compareTo)
                    .orElse(null);
        }

        Integer discountPercent = calculateDiscountPercent(originalPrice, minPrice);

        return ProductResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .brand(entity.getBrand())
                .description(entity.getDescription())
                .price(minPrice != null ? minPrice : entity.getPrice())
                .minPrice(minPrice != null ? minPrice : entity.getPrice())
                .maxPrice(maxPrice != null ? maxPrice : entity.getPrice())
                .originalPrice(originalPrice)
                .discountPercent(discountPercent)
                .stock(totalStock != null ? totalStock : entity.getStock())
                .imageUrl(entity.getImageUrl())
                .status(entity.getStatus())
                .categoryId(entity.getCategory() != null ? entity.getCategory().getId() : null)
                .categoryName(entity.getCategory() != null ? entity.getCategory().getName() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public ProductResponse toDetailResponse(Product entity) {
        ProductResponse response = toResponse(entity);
        if (response == null) {
            return null;
        }

        if (entity.getOptions() != null) {
            response.setOptions(entity.getOptions().stream()
                    .map(this::toOptionResponse)
                    .collect(Collectors.toList()));
        }

        if (entity.getVariants() != null) {
            response.setVariants(entity.getVariants().stream()
                    .map(this::toVariantResponse)
                    .collect(Collectors.toList()));
        }

        if (entity.getSpecs() != null) {
            response.setSpecs(entity.getSpecs().stream()
                    .map(this::toSpecResponse)
                    .collect(Collectors.toList()));
        }

        if (entity.getImages() != null) {
            response.setImages(entity.getImages().stream()
                    .map(this::toImageResponse)
                    .collect(Collectors.toList()));
        }

        return response;
    }

    public ProductOptionResponse toOptionResponse(ProductOption option) {
        if (option == null) {
            return null;
        }
        List<ProductOptionValueResponse> valueResponses = Collections.emptyList();
        if (option.getValues() != null) {
            valueResponses = option.getValues().stream()
                    .map(val -> ProductOptionValueResponse.builder()
                            .id(val.getId())
                            .value(val.getValue())
                            .position(val.getPosition())
                            .build())
                    .collect(Collectors.toList());
        }

        return ProductOptionResponse.builder()
                .id(option.getId())
                .name(option.getName())
                .position(option.getPosition())
                .values(valueResponses)
                .build();
    }

    public ProductVariantResponse toVariantResponse(ProductVariant variant) {
        if (variant == null) {
            return null;
        }

        Integer discountPercent = calculateDiscountPercent(variant.getOriginalPrice(), variant.getPrice());

        Map<String, String> optionMap = new LinkedHashMap<>();
        String title = "Tiêu chuẩn";

        if (variant.getOptionValues() != null && !variant.getOptionValues().isEmpty()) {
            title = variant.getOptionValues().stream()
                    .map(ProductOptionValue::getValue)
                    .collect(Collectors.joining(" / "));

            for (ProductOptionValue pov : variant.getOptionValues()) {
                String optName = pov.getOption() != null ? pov.getOption().getName() : "Tùy chọn";
                optionMap.put(optName, pov.getValue());
            }
        }

        return ProductVariantResponse.builder()
                .id(variant.getId())
                .productId(variant.getProduct() != null ? variant.getProduct().getId() : null)
                .sku(variant.getSku())
                .price(variant.getPrice())
                .originalPrice(variant.getOriginalPrice())
                .discountPercent(discountPercent)
                .stock(variant.getStock())
                .imageUrl(variant.getImageUrl())
                .status(variant.getStatus())
                .title(title)
                .optionValues(optionMap)
                .build();
    }

    public ProductSpecResponse toSpecResponse(ProductSpec spec) {
        if (spec == null) {
            return null;
        }
        return ProductSpecResponse.builder()
                .id(spec.getId())
                .groupName(spec.getGroupName())
                .specKey(spec.getSpecKey())
                .specValue(spec.getSpecValue())
                .position(spec.getPosition())
                .build();
    }

    public ProductImageResponse toImageResponse(ProductImage image) {
        if (image == null) {
            return null;
        }
        return ProductImageResponse.builder()
                .id(image.getId())
                .variantId(image.getVariantId())
                .url(image.getUrl())
                .position(image.getPosition())
                .build();
    }

    public void updateEntity(Product entity, ProductRequest request, Category category) {
        if (entity == null || request == null) {
            return;
        }
        entity.setName(request.getName().trim());
        if (request.getBrand() != null) {
            entity.setBrand(request.getBrand().isBlank() ? null : request.getBrand().trim());
        }
        entity.setDescription(request.getDescription());
        entity.setPrice(request.getPrice());
        entity.setStock(request.getStock());
        entity.setImageUrl(request.getImageUrl());
        if (request.getStatus() != null) {
            entity.setStatus(request.getStatus());
        }
        if (category != null) {
            entity.setCategory(category);
        }
    }

    public static Integer calculateDiscountPercent(BigDecimal originalPrice, BigDecimal price) {
        if (originalPrice != null && price != null && originalPrice.compareTo(price) > 0 && originalPrice.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal diff = originalPrice.subtract(price);
            BigDecimal percent = diff.multiply(BigDecimal.valueOf(100)).divide(originalPrice, 0, RoundingMode.HALF_UP);
            return percent.intValue();
        }
        return null;
    }
}
