package ra.project.server.model.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "import_receipts", indexes = {
        @Index(name = "idx_receipt_code", columnList = "receipt_code"),
        @Index(name = "idx_receipt_import_date", columnList = "import_date"),
        @Index(name = "idx_receipt_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportReceipt extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "receipt_code", nullable = false, unique = true, length = 100)
    private String receiptCode;

    @Column(name = "import_date", nullable = false)
    private LocalDate importDate;

    @Column(name = "supplier_name", length = 255)
    private String supplierName;

    @Column(name = "importer_name", length = 255)
    private String importerName;

    @Column(name = "warehouse", length = 255)
    private String warehouse;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "total_quantity", nullable = false)
    @Builder.Default
    private Integer totalQuantity = 0;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    @Builder.Default
    private List<ImportReceiptItem> items = new ArrayList<>();

    public void addItem(ImportReceiptItem item) {
        items.add(item);
        item.setReceipt(this);
    }
}

