package ra.project.server.model.dto.request;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ra.project.server.exception.BadRequestException;
import ra.project.server.model.enums.OrderStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOrderStatusRequest {

    @NotNull(message = "Trạng thái đơn hàng không được để trống")
    private OrderStatus status;

    private Long carrierId;
    private String trackingCode;
    private String cancelReason;

    public UpdateOrderStatusRequest(OrderStatus status) {
        this.status = status;
    }

    public UpdateOrderStatusRequest(OrderStatus status, Long carrierId, String trackingCode) {
        this.status = status;
        this.carrierId = carrierId;
        this.trackingCode = trackingCode;
    }

    @JsonCreator
    public static UpdateOrderStatusRequest create(
            @JsonProperty("status") Object statusObj,
            @JsonProperty("carrierId") Long carrierId,
            @JsonProperty("trackingCode") String trackingCode,
            @JsonProperty("cancelReason") String cancelReason
    ) {
        OrderStatus targetStatus = null;
        if (statusObj != null) {
            if (statusObj instanceof OrderStatus os) {
                targetStatus = os;
            } else {
                String statusStr = statusObj.toString().trim();
                if (!statusStr.isEmpty()) {
                    try {
                        targetStatus = OrderStatus.valueOf(statusStr.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        throw new BadRequestException("Trạng thái đơn hàng không hợp lệ: '" + statusStr + "'. Các trạng thái hợp lệ: PENDING, PROCESSING, SHIPPING, COMPLETED, CANCELLED");
                    }
                }
            }
        }
        return new UpdateOrderStatusRequest(targetStatus, carrierId, trackingCode, cancelReason);
    }
}
