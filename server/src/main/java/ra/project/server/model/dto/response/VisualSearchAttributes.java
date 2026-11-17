package ra.project.server.model.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VisualSearchAttributes {

    private String category;
    private String brand;
    private String productLine;
    private String identifiedTitle;
    private String aiDescription;
    private String color;
    private String confidence;
    private Boolean isTechProduct;

    @Builder.Default
    private List<String> distinctiveFeatures = new ArrayList<>();

    @Builder.Default
    private List<String> keywords = new ArrayList<>();
}
