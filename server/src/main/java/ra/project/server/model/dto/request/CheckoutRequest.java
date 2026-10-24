package ra.project.server.model.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ra.project.server.model.enums.PaymentMethod;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutRequest {

    @NotBlank(message = "Tên người nhận không được để trống")
    private String receiverName;

    @NotBlank(message = "Số điện thoại nhận hàng không được để trống")
    private String phoneNumber;

    @NotBlank(message = "Địa chỉ nhận hàng không được để trống")
    private String shippingAddress;

    private String note;

    private String couponCode;

    @Builder.Default
    private PaymentMethod paymentMethod = PaymentMethod.COD;

    @NotEmpty(message = "Danh sách sản phẩm đặt hàng không được để trống")
    @Valid
    private List<OrderItemRequest> items;
}
