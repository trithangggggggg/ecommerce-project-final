package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeStatsResponse {

    private long totalFiles;
    private long totalSize;
    private String formattedTotalSize;
    private long totalChunks;
    private Map<String, Long> fileTypeDistribution;
    private Map<String, Long> statusDistribution;
    private Map<String, Long> categoryDistribution;
}

