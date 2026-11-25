package ra.project.server.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.KnowledgeDocument;

import java.util.List;

@Repository
public interface KnowledgeDocumentRepository extends JpaRepository<KnowledgeDocument, Long> {

    List<KnowledgeDocument> findAllByOrderByCreatedAtDesc();

    List<KnowledgeDocument> findByCategoryOrderByCreatedAtDesc(String category);

    List<KnowledgeDocument> findByStatusOrderByCreatedAtDesc(String status);

    @Query("SELECT COUNT(d) FROM KnowledgeDocument d WHERE d.status = :status")
    long countByStatus(String status);

    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM KnowledgeDocument d")
    long sumTotalFileSize();

    @Query("SELECT COALESCE(SUM(d.chunkCount), 0) FROM KnowledgeDocument d")
    long sumTotalChunks();
}

