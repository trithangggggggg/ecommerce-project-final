package ra.project.server.service;

import org.springframework.web.multipart.MultipartFile;
import ra.project.server.model.dto.response.VisualSearchResponse;

public interface AiVisualSearchService {

    /**
     * Tìm kiếm sản phẩm tương đồng dựa trên nhận diện hình ảnh từ Gemini Vision.
     *
     * @param image file ảnh tải lên (JPG, PNG, WEBP, tối đa 5MB)
     * @return Kết quả tìm kiếm kèm thuộc tính nhận diện và độ khớp matchPercent
     */
    VisualSearchResponse searchByImage(MultipartFile image);
}

