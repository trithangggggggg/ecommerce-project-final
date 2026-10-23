package ra.project.server.model.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    private Long id;

    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(max = 200, message = "Tên sản phẩm tối đa 200 ký tự")
    private String name;

    private String description;

    private BigDecimal price;

    private Integer stock;

    private String imageUrl;

    @NotNull(message = "Danh mục sản phẩm không được để trống")
    private Long categoryId;

    @Builder.Default
    private Boolean status = true;

    @Valid
    @Builder.Default
    private List<OptionRequest> options = new ArrayList<>();

    @Valid
    @Builder.Default
    private List<VariantRequest> variants = new ArrayList<>();

    @Valid
    @Builder.Default
    private List<SpecRequest> specs = new ArrayList<>();

    @Valid
    @Builder.Default
    private List<ImageRequest> images = new ArrayList<>();
}
