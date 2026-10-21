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

    @JsonCreator
    public static UpdateOrderStatusRequest create(@JsonProperty("status") Object statusObj) {
        if (statusObj == null) {
            return new UpdateOrderStatusRequest(null);
        }
        if (statusObj instanceof OrderStatus os) {
            return new UpdateOrderStatusRequest(os);
        }
        String statusStr = statusObj.toString().trim();
        if (statusStr.isEmpty()) {
            return new UpdateOrderStatusRequest(null);
        }
        try {
            return new UpdateOrderStatusRequest(OrderStatus.valueOf(statusStr.toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái đơn hàng không hợp lệ: '" + statusStr + "'. Các trạng thái hợp lệ: PENDING, PROCESSING, SHIPPING, COMPLETED, CANCELLED");
        }
    }
}
