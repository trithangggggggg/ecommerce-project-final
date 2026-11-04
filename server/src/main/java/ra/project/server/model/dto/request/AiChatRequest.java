package ra.project.server.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {

    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    @Size(max = 500, message = "Nội dung câu hỏi không được vượt quá 500 ký tự")
    private String message;

    private List<ChatMessageDto> history;
}
