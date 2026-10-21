package ra.project.server.service;

import ra.project.server.model.dto.request.AiChatRequest;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.response.AiChatResponse;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;

public interface AiService {

    AiGenerateDescriptionResponse generateProductDescription(AiGenerateDescriptionRequest request);

    AiChatResponse chatWithCustomer(AiChatRequest request);
}
