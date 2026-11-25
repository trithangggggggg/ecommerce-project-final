package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerateArticleResponse {

    private String title;

    private String summary;

    private String content;

    private String provider;
}

