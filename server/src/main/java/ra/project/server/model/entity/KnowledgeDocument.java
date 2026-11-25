package ra.project.server.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "knowledge_documents", indexes = {
        @Index(name = "idx_kd_status", columnList = "status"),
        @Index(name = "idx_kd_file_type", columnList = "file_type"),
        @Index(name = "idx_kd_category", columnList = "category")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnowledgeDocument extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_type", nullable = false, length = 50)
    private String fileType; // PDF, DOCX, TXT, CSV, MANUAL

    @Column(name = "file_size")
    @Builder.Default
    private Long fileSize = 0L;

    @Column(name = "category", length = 100)
    @Builder.Default
    private String category = "GENERAL"; // GENERAL, POLICY, FAQ, PRODUCT_GUIDE

    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "INDEXED"; // PENDING, PROCESSING, INDEXED, FAILED

    @Column(name = "chunk_count")
    @Builder.Default
    private Integer chunkCount = 0;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "raw_content", columnDefinition = "LONGTEXT")
    private String rawContent;

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<KnowledgeChunk> chunks = new ArrayList<>();
}

