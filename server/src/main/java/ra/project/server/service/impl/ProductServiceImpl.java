package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.common.response.PageResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.request.*;
import ra.project.server.model.dto.response.ProductResponse;
import ra.project.server.model.entity.*;
import ra.project.server.repository.*;
import ra.project.server.service.ProductService;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductOptionRepository productOptionRepository;
    private final ProductVariantRepository productVariantRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductMapper productMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getAllProducts(String keyword, Long categoryId, Boolean status, Pageable pageable) {
        return getAllProducts(keyword, categoryId, null, status, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getAllProducts(String keyword, Long categoryId, String brand, Boolean status, Pageable pageable) {
        Specification<Product> spec = ProductSpecification.filter(keyword, categoryId, brand, null, null, status);
        Page<Product> productPage = productRepository.findAll(spec, pageable);
        return PageResponse.from(productPage.map(productMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));
        return productMapper.toDetailResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getProductsByCategoryId(Long categoryId, Pageable pageable) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + categoryId);
        }

        Page<Product> productPage = productRepository.findByCategoryId(categoryId, pageable);
        return PageResponse.from(productPage.map(productMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> searchProducts(
            String keyword,
            Long categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean status,
            Pageable pageable
    ) {
        return searchProducts(keyword, categoryId, null, minPrice, maxPrice, status, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> searchProducts(
            String keyword,
            Long categoryId,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean status,
            Pageable pageable
    ) {
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new BadRequestException("Giá tối thiểu (minPrice) không được lớn hơn giá tối đa (maxPrice)!");
        }

        Specification<Product> spec = ProductSpecification.filter(keyword, categoryId, brand, minPrice, maxPrice, status);
        Page<Product> productPage = productRepository.findAll(spec, pageable);
        return PageResponse.from(productPage.map(productMapper::toResponse));
    }

    @Override
    public ProductResponse createProduct(ProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + request.getCategoryId()));

        if (productRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw new BadRequestException("Tên sản phẩm '" + request.getName().trim() + "' đã tồn tại!");
        }

        validateVariantsAndOptions(request, null);

        Product product = productMapper.toEntity(request, category);
        product = productRepository.save(product);

        populateOptionsAndVariants(product, request);

        product.setPrice(product.getMinPrice());
        product.setStock(product.getTotalStock());
        Product savedProduct = productRepository.save(product);

        return productMapper.toDetailResponse(savedProduct);
    }

    @Override
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + request.getCategoryId()));

        if (productRepository.existsByNameIgnoreCaseAndIdNot(request.getName().trim(), id)) {
            throw new BadRequestException("Tên sản phẩm '" + request.getName().trim() + "' đã tồn tại ở sản phẩm khác!");
        }

        validateVariantsAndOptions(request, id);

        productMapper.updateEntity(product, request, category);
        populateOptionsAndVariants(product, request);

        product.setPrice(product.getMinPrice());
        product.setStock(product.getTotalStock());
        Product updatedProduct = productRepository.save(product);

        return productMapper.toDetailResponse(updatedProduct);
    }

    @Override
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));

        productRepository.delete(product);
    }

    private void validateVariantsAndOptions(ProductRequest request, Long currentProductId) {
        if (request.getVariants() == null || request.getVariants().isEmpty()) {
            if (request.getPrice() == null || request.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Giá sản phẩm phải lớn hơn 0 hoặc phải có ít nhất một biến thể!");
            }
            int stock = request.getStock() != null && request.getStock() >= 0 ? request.getStock() : 0;
            String defaultSku = "SKU-P" + (currentProductId != null ? currentProductId : (System.currentTimeMillis() % 1000000)) + "-STD";
            if (productVariantRepository.existsBySkuIgnoreCase(defaultSku)) {
                defaultSku = defaultSku + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
            }
            VariantRequest defaultVariant = VariantRequest.builder()
                    .sku(defaultSku)
                    .price(request.getPrice())
                    .stock(stock)
                    .imageUrl(request.getImageUrl())
                    .status(true)
                    .build();
            request.setVariants(new ArrayList<>(List.of(defaultVariant)));
        } else {
            Set<String> skus = new HashSet<>();
            Set<String> combos = new HashSet<>();

            for (VariantRequest v : request.getVariants()) {
                if (v.getSku() == null || v.getSku().isBlank()) {
                    throw new BadRequestException("Mã SKU của biến thể không được để trống!");
                }
                String sku = v.getSku().trim();
                if (!skus.add(sku.toUpperCase())) {
                    throw new BadRequestException("Mã SKU '" + sku + "' bị trùng lặp trong danh sách biến thể!");
                }

                if (v.getPrice() == null || v.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new BadRequestException("Giá biến thể (" + sku + ") phải lớn hơn 0!");
                }

                if (v.getStock() != null && v.getStock() < 0) {
                    throw new BadRequestException("Số lượng tồn kho biến thể (" + sku + ") không được âm!");
                }

                if (v.getOriginalPrice() != null && v.getOriginalPrice().compareTo(v.getPrice()) < 0) {
                    throw new BadRequestException("Giá gốc phải lớn hơn hoặc bằng giá bán tại SKU: " + sku);
                }

                Optional<ProductVariant> existing = productVariantRepository.findBySkuIgnoreCase(sku);
                if (existing.isPresent()) {
                    Long ownerId = existing.get().getProduct() != null ? existing.get().getProduct().getId() : null;
                    if (currentProductId == null || (ownerId != null && !ownerId.equals(currentProductId))) {
                        throw new BadRequestException("Mã SKU '" + sku + "' đã tồn tại ở sản phẩm khác!");
                    }
                }

                if (v.getOptionValues() != null && !v.getOptionValues().isEmpty()) {
                    String comboKey = v.getOptionValues().entrySet().stream()
                            .filter(e -> e.getKey() != null && e.getValue() != null && !e.getKey().isBlank() && !e.getValue().isBlank())
                            .map(e -> e.getKey().trim().toLowerCase() + "=" + e.getValue().trim().toLowerCase())
                            .sorted()
                            .collect(Collectors.joining("|"));
                    if (!comboKey.isEmpty() && !combos.add(comboKey)) {
                        throw new BadRequestException("Tổ hợp tùy chọn (" + v.getOptionValues() + ") bị trùng lặp giữa các biến thể!");
                    }
                }
            }
        }
    }

    private void populateOptionsAndVariants(Product product, ProductRequest request) {
        List<OptionRequest> optionRequests = request.getOptions();
        if ((optionRequests == null || optionRequests.isEmpty()) && request.getVariants() != null) {
            Map<String, Set<String>> extracted = new LinkedHashMap<>();
            for (VariantRequest vr : request.getVariants()) {
                if (vr.getOptionValues() != null) {
                    for (Map.Entry<String, String> e : vr.getOptionValues().entrySet()) {
                        if (e.getKey() != null && !e.getKey().isBlank() && e.getValue() != null && !e.getValue().isBlank()) {
                            extracted.computeIfAbsent(e.getKey().trim(), k -> new LinkedHashSet<>()).add(e.getValue().trim());
                        }
                    }
                }
            }
            if (!extracted.isEmpty()) {
                optionRequests = new ArrayList<>();
                for (Map.Entry<String, Set<String>> e : extracted.entrySet()) {
                    optionRequests.add(OptionRequest.builder()
                            .name(e.getKey())
                            .values(new ArrayList<>(e.getValue()))
                            .build());
                }
            }
        }

        Map<String, ProductOption> existingOptionMap = new HashMap<>();
        if (product.getOptions() != null) {
            for (ProductOption opt : product.getOptions()) {
                existingOptionMap.put(opt.getName().trim().toLowerCase(), opt);
            }
        }

        List<ProductOption> finalOptions = new ArrayList<>();
        Map<String, Map<String, ProductOptionValue>> lookup = new HashMap<>();

        if (optionRequests != null) {
            int optPos = 0;
            for (OptionRequest oReq : optionRequests) {
                if (oReq.getName() == null || oReq.getName().isBlank()) continue;
                String optName = oReq.getName().trim();
                String optKey = optName.toLowerCase();

                ProductOption option = existingOptionMap.get(optKey);
                if (option == null) {
                    option = ProductOption.builder()
                            .product(product)
                            .name(optName)
                            .position(optPos++)
                            .values(new ArrayList<>())
                            .build();
                } else {
                    option.setName(optName);
                    option.setPosition(optPos++);
                }

                Map<String, ProductOptionValue> existingValMap = new HashMap<>();
                if (option.getValues() != null) {
                    for (ProductOptionValue pov : option.getValues()) {
                        existingValMap.put(pov.getValue().trim().toLowerCase(), pov);
                    }
                }

                List<ProductOptionValue> finalVals = new ArrayList<>();
                int valPos = 0;
                if (oReq.getValues() != null) {
                    for (String valStr : oReq.getValues()) {
                        if (valStr == null || valStr.isBlank()) continue;
                        String valClean = valStr.trim();
                        String valKey = valClean.toLowerCase();

                        ProductOptionValue valEntity = existingValMap.get(valKey);
                        if (valEntity == null) {
                            valEntity = ProductOptionValue.builder()
                                    .option(option)
                                    .value(valClean)
                                    .position(valPos++)
                                    .build();
                        } else {
                            valEntity.setPosition(valPos++);
                        }
                        finalVals.add(valEntity);
                        lookup.computeIfAbsent(optKey, k -> new HashMap<>()).put(valKey, valEntity);
                    }
                }
                if (option.getValues() == null) {
                    option.setValues(new ArrayList<>());
                } else {
                    option.getValues().clear();
                }
                option.getValues().addAll(finalVals);
                finalOptions.add(option);
            }
        }

        if (product.getOptions() == null) {
            product.setOptions(new ArrayList<>());
        } else {
            product.getOptions().clear();
        }
        product.getOptions().addAll(finalOptions);

        productOptionRepository.saveAll(product.getOptions());
        productOptionRepository.flush();

        Map<String, ProductVariant> existingBySku = new HashMap<>();
        Map<Long, ProductVariant> existingById = new HashMap<>();
        if (product.getVariants() != null) {
            for (ProductVariant pv : product.getVariants()) {
                existingBySku.put(pv.getSku().trim().toUpperCase(), pv);
                if (pv.getId() != null) {
                    existingById.put(pv.getId(), pv);
                }
            }
        }

        List<ProductVariant> updatedVariants = new ArrayList<>();
        Set<Long> processedVariantIds = new HashSet<>();

        for (VariantRequest vReq : request.getVariants()) {
            String sku = vReq.getSku().trim();
            ProductVariant variant = null;
            if (vReq.getId() != null) {
                variant = existingById.get(vReq.getId());
            }
            if (variant == null) {
                variant = existingBySku.get(sku.toUpperCase());
            }

            if (variant == null) {
                variant = ProductVariant.builder()
                        .product(product)
                        .sku(sku)
                        .build();
            } else {
                variant.setSku(sku);
            }

            variant.setPrice(vReq.getPrice());
            variant.setOriginalPrice(vReq.getOriginalPrice());
            variant.setStock(vReq.getStock() != null ? vReq.getStock() : 0);
            variant.setImageUrl(vReq.getImageUrl() != null && !vReq.getImageUrl().isBlank() ? vReq.getImageUrl().trim() : product.getImageUrl());
            variant.setStatus(vReq.getStatus() != null ? vReq.getStatus() : true);

            List<ProductOptionValue> matchedOptionVals = new ArrayList<>();
            if (vReq.getOptionValues() != null) {
                for (Map.Entry<String, String> entry : vReq.getOptionValues().entrySet()) {
                    if (entry.getKey() == null || entry.getValue() == null) continue;
                    String oName = entry.getKey().trim().toLowerCase();
                    String oVal = entry.getValue().trim().toLowerCase();
                    Map<String, ProductOptionValue> valMap = lookup.get(oName);
                    if (valMap != null && valMap.containsKey(oVal)) {
                        matchedOptionVals.add(valMap.get(oVal));
                    }
                }
            }
            if (variant.getOptionValues() == null) {
                variant.setOptionValues(new ArrayList<>());
            } else {
                variant.getOptionValues().clear();
            }
            variant.getOptionValues().addAll(matchedOptionVals);

            updatedVariants.add(variant);
            if (variant.getId() != null) {
                processedVariantIds.add(variant.getId());
            }
        }

        if (product.getVariants() != null) {
            for (ProductVariant oldVar : product.getVariants()) {
                if (oldVar.getId() != null && !processedVariantIds.contains(oldVar.getId())) {
                    boolean hasOrders = orderItemRepository.existsByVariantId(oldVar.getId());
                    if (hasOrders) {
                        oldVar.setStatus(false);
                        updatedVariants.add(oldVar);
                    }
                }
            }
        }

        if (product.getVariants() == null) {
            product.setVariants(new ArrayList<>());
        } else {
            product.getVariants().clear();
        }
        product.getVariants().addAll(updatedVariants);

        List<ProductSpec> finalSpecs = new ArrayList<>();
        if (request.getSpecs() != null) {
            int specPos = 0;
            for (SpecRequest sReq : request.getSpecs()) {
                if (sReq.getKey() == null || sReq.getKey().isBlank()) continue;
                ProductSpec spec = ProductSpec.builder()
                        .product(product)
                        .groupName(sReq.getGroup() != null && !sReq.getGroup().isBlank() ? sReq.getGroup().trim() : null)
                        .specKey(sReq.getKey().trim())
                        .specValue(sReq.getValue() != null ? sReq.getValue().trim() : "")
                        .position(specPos++)
                        .build();
                finalSpecs.add(spec);
            }
        }
        if (product.getSpecs() == null) {
            product.setSpecs(new ArrayList<>());
        } else {
            product.getSpecs().clear();
        }
        product.getSpecs().addAll(finalSpecs);

        if (request.getImages() != null) {
            List<ProductImage> finalImages = new ArrayList<>();
            int imgPos = 0;
            for (ImageRequest iReq : request.getImages()) {
                if (iReq.getUrl() == null || iReq.getUrl().isBlank()) continue;
                ProductImage img = ProductImage.builder()
                        .product(product)
                        .variantId(iReq.getVariantId())
                        .url(iReq.getUrl().trim())
                        .position(iReq.getPosition() != null ? iReq.getPosition() : imgPos++)
                        .build();
                finalImages.add(img);
            }
            if (product.getImages() == null) {
                product.setImages(new ArrayList<>());
            } else {
                product.getImages().clear();
            }
            product.getImages().addAll(finalImages);
        }
    }
}
