package ra.project.server.model.dto.response;

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
public class ProductOptionResponse {
    private Long id;
    private String name;
    private Integer position;
    @Builder.Default
    private List<ProductOptionValueResponse> values = new ArrayList<>();
}
