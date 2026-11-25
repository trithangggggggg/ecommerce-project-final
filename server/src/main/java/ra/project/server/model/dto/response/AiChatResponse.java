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

    /**
     * Thông tin đơn hàng được hỗ trợ tạo tự động bởi AI (nếu có hành động đặt hàng)
     */
    private OrderResponse createdOrder;

    /**
     * Phiếu xác nhận thông tin đơn hàng dự thảo (chờ khách bấm Xác nhận hoặc Hủy)
     */
    private OrderPreviewDto orderPreview;

    /**
     * Danh sách các nút hành động nhanh trên giao diện chat (ví dụ: ["Xác nhận đặt hàng", "Hủy"])
     */
    private List<String> quickActions;

    private String provider;
}
