package ra.project.server.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptionRequest {

    private Long id;

    @NotBlank(message = "Tên tùy chọn không được để trống")
    private String name;

    @NotEmpty(message = "Tùy chọn phải có ít nhất một giá trị")
    @Builder.Default
    private List<String> values = new ArrayList<>();
}
