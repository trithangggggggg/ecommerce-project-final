package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleResponse {

    private Long id;
    private String title;
    private String slug;
    private String summary;
    private String content;
    private String thumbnail;
    private String category;
    private Long views;
    private Boolean status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

