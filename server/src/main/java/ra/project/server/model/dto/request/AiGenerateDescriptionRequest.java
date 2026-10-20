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
public class AiGenerateDescriptionRequest {

    @NotBlank(message = "Tên sản phẩm không được để trống")
    private String productName;

    private String categoryName;

    private List<String> keywords;
}
