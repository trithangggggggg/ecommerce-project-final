package ra.project.server.model.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportReceiptRequest {

    private String receiptCode;

    @NotNull(message = "Ngày nhập không được để trống")
    private LocalDate importDate;

    private String supplierName;

    private String importerName;

    private String warehouse;

    private String note;

    @Builder.Default
    private Boolean updateVariantPrice = false;

    @NotEmpty(message = "Danh sách sản phẩm nhập không được để trống")
    @Valid
    private List<ImportReceiptItemRequest> items;
}

