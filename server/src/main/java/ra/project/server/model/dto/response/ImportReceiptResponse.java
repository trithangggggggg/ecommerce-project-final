package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportReceiptResponse {

    private Long id;
    private String receiptCode;
    private LocalDate importDate;
    private String supplierName;
    private String importerName;
    private String warehouse;
    private String note;
    private Integer totalQuantity;
    private BigDecimal totalAmount;
    private List<ImportReceiptItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

