package ra.project.server.model.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportReceiptItemRequest {

    @NotNull(message = "ID sản phẩm không được để trống")
    private Long productId;

    private String productName;

    private Long variantId;

    private String variantTitle;

    private String sku;

    @NotNull(message = "Số lượng nhập không được để trống")
    @Min(value = 1, message = "Số lượng nhập tối thiểu là 1")
    private Integer quantity;

    @Min(value = 0, message = "Đơn giá nhập không được âm")
    private BigDecimal unitPrice;

    @Min(value = 0, message = "Giá bán mới không được âm")
    private BigDecimal sellingPrice;
}
