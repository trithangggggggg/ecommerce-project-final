package ra.project.server.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleRequest {

    @NotBlank(message = "Tiêu đề bài viết không được để trống")
    @Size(max = 255, message = "Tiêu đề bài viết tối đa 255 ký tự")
    private String title;

    private String slug;

    @Size(max = 1000, message = "Tóm tắt bài viết tối đa 1000 ký tự")
    private String summary;

    @NotBlank(message = "Nội dung bài viết không được để trống")
    private String content;

    private String thumbnail;

    private String category;

    @Builder.Default
    private Boolean status = true;
}

