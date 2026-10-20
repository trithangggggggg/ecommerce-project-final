package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerateDescriptionResponse {

    private String productName;
    private String categoryName;
    private String description;
    private String seoTitle;
    private String seoKeywords;
    private String provider;
}
