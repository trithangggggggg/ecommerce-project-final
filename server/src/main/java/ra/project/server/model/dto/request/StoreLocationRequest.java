package ra.project.server.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreLocationRequest {

    @NotBlank(message = "Tên showroom không được để trống")
    @Size(max = 200, message = "Tên showroom tối đa 200 ký tự")
    private String name;

    @NotBlank(message = "Địa chỉ showroom không được để trống")
    @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
    private String address;

    @NotBlank(message = "Tỉnh/Thành phố không được để trống")
    @Size(max = 100, message = "Tỉnh/Thành phố tối đa 100 ký tự")
    private String province;

    @Size(max = 100, message = "Quận/Huyện tối đa 100 ký tự")
    private String district;

    @Size(max = 50, message = "Số điện thoại tối đa 50 ký tự")
    private String phoneNumber;

    private Double latitude;

    private Double longitude;

    @Size(max = 100, message = "Giờ mở cửa tối đa 100 ký tự")
    private String openHours;

    @Builder.Default
    private String status = "ACTIVE";
}

