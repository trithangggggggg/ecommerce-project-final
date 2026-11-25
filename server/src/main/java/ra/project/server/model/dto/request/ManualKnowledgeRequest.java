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
public class ManualKnowledgeRequest {

    @NotBlank(message = "Tiêu đề tài liệu không được để trống")
    @Size(max = 200, message = "Tiêu đề không được vượt quá 200 ký tự")
    private String title;

    @NotBlank(message = "Nội dung tài liệu không được để trống")
    private String content;

    @Builder.Default
    private String category = "GENERAL"; // GENERAL, POLICY, FAQ, PRODUCT_GUIDE
}

