package ra.project.server.model.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VariantRequest {

    private Long id;

    @NotBlank(message = "SKU biến thể không được để trống")
    private String sku;

    @Builder.Default
    private Map<String, String> optionValues = new LinkedHashMap<>();

    @NotNull(message = "Giá biến thể không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá biến thể phải lớn hơn 0")
    private BigDecimal price;

    private BigDecimal originalPrice;

    @NotNull(message = "Số lượng tồn kho biến thể không được để trống")
    @Min(value = 0, message = "Số lượng tồn kho không được âm")
    @Builder.Default
    private Integer stock = 0;

    private String imageUrl;

    @Builder.Default
    private Boolean status = true;
}
