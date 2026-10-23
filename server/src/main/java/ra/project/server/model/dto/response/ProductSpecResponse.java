package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductSpecResponse {
    private Long id;
    private String groupName;
    private String specKey;
    private String specValue;
    private Integer position;
}
