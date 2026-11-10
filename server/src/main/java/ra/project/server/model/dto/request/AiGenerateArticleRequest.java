package ra.project.server.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerateArticleRequest {

    @NotBlank(message = "Tiêu đề bài viết không được để trống")
    private String title;

    private String category;

    private String summary;

    private List<String> keywords;
}

