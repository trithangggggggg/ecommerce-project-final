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
public class SpecRequest {

    private Long id;

    private String group;

    @NotBlank(message = "Tên thông số kỹ thuật không được để trống")
    private String key;

    @NotBlank(message = "Giá trị thông số kỹ thuật không được để trống")
    private String value;
}
