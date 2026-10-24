package ra.project.server.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageRequest {

    private Long id;

    private Long variantId;

    @NotBlank(message = "URL hình ảnh không được để trống")
    private String url;

    @Builder.Default
    private Integer position = 0;
}
