package ra.project.server.model.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import ra.project.server.model.enums.Role;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserResponse {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String address;
    private String avatarUrl;
    private Role role;
    private Boolean status;
    private Integer ordersCount;
    private BigDecimal totalSpent;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
