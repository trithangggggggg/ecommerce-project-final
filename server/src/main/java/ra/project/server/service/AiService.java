package ra.project.server.service;

import org.springframework.web.multipart.MultipartFile;
import ra.project.server.model.dto.request.AiChatRequest;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.response.AiChatResponse;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.model.dto.response.VisualSearchResponse;

public interface AiService {

    AiGenerateDescriptionResponse generateProductDescription(AiGenerateDescriptionRequest request);

    ra.project.server.model.dto.response.AiGenerateArticleResponse generateArticleContent(ra.project.server.model.dto.request.AiGenerateArticleRequest request);

    AiChatResponse chatWithCustomer(AiChatRequest request);

    VisualSearchResponse visualSearch(MultipartFile image);
}
