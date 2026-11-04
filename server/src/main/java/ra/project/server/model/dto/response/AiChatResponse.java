package ra.project.server.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {

    private String reply;

    /**
     * Danh sách sản phẩm gợi ý chuẩn theo yêu cầu nghiệp vụ [BE_12] (suggestedProducts)
     */
    private List<ProductResponse> suggestedProducts;

    /**
     * Danh sách sản phẩm gợi ý (giữ tương thích ngược 100% với Frontend hiện tại)
     */
    private List<ProductResponse> recommendedProducts;

    private String provider;
}
