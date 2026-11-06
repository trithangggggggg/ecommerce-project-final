package ra.project.server.model.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.util.StringUtils;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerateDescriptionRequest {

    private String name;

    private String productName;

    private String brand;

    private String categoryName;

    private Object specs;

    private List<String> keywords;

    @JsonIgnore
    @AssertTrue(message = "Tên sản phẩm không được để trống")
    public boolean isValidName() {
        return StringUtils.hasText(name) || StringUtils.hasText(productName);
    }

    @JsonIgnore
    public String getEffectiveName() {
        if (StringUtils.hasText(name)) {
            return name.trim();
        }
        if (StringUtils.hasText(productName)) {
            return productName.trim();
        }
        return "";
    }

    public String getProductName() {
        return getEffectiveName();
    }

    public String getName() {
        return getEffectiveName();
    }
}
