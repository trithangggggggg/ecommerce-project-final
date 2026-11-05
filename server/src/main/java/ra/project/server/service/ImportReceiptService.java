package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.dto.request.ImportReceiptRequest;
import ra.project.server.model.dto.response.ImportReceiptResponse;

public interface ImportReceiptService {

    PageResponse<ImportReceiptResponse> getAllReceipts(String keyword, Pageable pageable);

    ImportReceiptResponse getReceiptById(Long id);

    ImportReceiptResponse getReceiptByCode(String code);

    ImportReceiptResponse createReceipt(ImportReceiptRequest request);
}

