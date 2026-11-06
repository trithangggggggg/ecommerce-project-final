package ra.project.server.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ra.project.server.exception.BadRequestException;
import ra.project.server.mapper.ProductMapper;
import ra.project.server.model.dto.request.AiGenerateDescriptionRequest;
import ra.project.server.model.dto.response.AiGenerateDescriptionResponse;
import ra.project.server.repository.ProductRepository;
import ra.project.server.service.impl.AiServiceImpl;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AiServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductMapper productMapper;

    @Mock
    private KnowledgeBaseService knowledgeBaseService;

    @Mock
    private AiConfigService aiConfigService;

    @InjectMocks
    private AiServiceImpl aiService;

    @Test
    @DisplayName("TC_AI_01: Sinh mô tả SEO với đầy đủ name, brand, specs (dạng Map) và keywords")
    void whenGenerateDescription_withNameBrandSpecsMap_thenReturnsStructuredMarkdown() {
        AiGenerateDescriptionRequest request = AiGenerateDescriptionRequest.builder()
                .name("MacBook Pro M4 14 inch")
                .brand("Apple")
                .categoryName("Laptop cao cấp")
                .specs(Map.of(
                        "Chip", "Apple M4 Pro 12-core",
                        "RAM", "24GB Unified Memory",
                        "SSD", "512GB PCIe"
                ))
                .keywords(List.of("macbook pro m4", "laptop apple", "đồ họa chuyên nghiệp"))
                .build();

        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);

        assertNotNull(response);
        assertEquals("MacBook Pro M4 14 inch", response.getProductName());
        assertEquals("Apple", response.getBrand());
        assertEquals("Laptop cao cấp", response.getCategoryName());
        assertNotNull(response.getDescription());

        String desc = response.getDescription();
        // Kiểm tra đầy đủ 4 phần cấu trúc Markdown chuẩn
        assertTrue(desc.contains("MacBook Pro M4 14 inch"), "Mô tả phải chứa tên sản phẩm");
        assertTrue(desc.contains("Apple"), "Mô tả phải chứa thương hiệu Apple");
        assertTrue(desc.contains("Điểm nổi bật"), "Mô tả phải có mục Điểm nổi bật");
        assertTrue(desc.contains("Thông số kỹ thuật"), "Mô tả phải có mục Thông số kỹ thuật");
        assertTrue(desc.contains("Đối tượng phù hợp"), "Mô tả phải có mục Đối tượng phù hợp");

        // Kiểm tra thông số kỹ thuật được định dạng
        assertTrue(desc.contains("Chip") && desc.contains("Apple M4 Pro"), "Mô tả phải chứa thông số Chip");
        assertTrue(desc.contains("RAM") && desc.contains("24GB"), "Mô tả phải chứa thông số RAM");

        // Kiểm tra SEO Title và Keywords
        assertNotNull(response.getSeoTitle());
        assertTrue(response.getSeoTitle().contains("Apple"));
        assertTrue(response.getSeoTitle().contains("MacBook Pro M4 14 inch"));

        assertNotNull(response.getSeoKeywords());
        assertTrue(response.getSeoKeywords().contains("macbook pro m4"));
    }

    @Test
    @DisplayName("TC_AI_02: Sinh mô tả SEO với specs dạng danh sách List<Map>")
    void whenGenerateDescription_withSpecsList_thenFormatsCorrectly() {
        AiGenerateDescriptionRequest request = AiGenerateDescriptionRequest.builder()
                .name("iPhone 16 Pro")
                .brand("Apple")
                .categoryName("Điện thoại")
                .specs(List.of(
                        Map.of("group", "Màn hình", "key", "Kích thước", "value", "6.3 inch Super Retina XDR"),
                        Map.of("group", "Hiệu năng", "key", "Vi xử lý", "value", "A18 Pro")
                ))
                .build();

        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);

        assertNotNull(response);
        String desc = response.getDescription();
        assertTrue(desc.contains("6.3 inch Super Retina XDR"));
        assertTrue(desc.contains("A18 Pro"));
        assertTrue(desc.contains("Thông số kỹ thuật"));
    }

    @Test
    @DisplayName("TC_AI_03: Sinh mô tả khi truyền productName (tương thích ngược)")
    void whenGenerateDescription_withProductNameAlias_thenSuccess() {
        AiGenerateDescriptionRequest request = AiGenerateDescriptionRequest.builder()
                .productName("Chuột Logitech MX Master 3S")
                .brand("Logitech")
                .build();

        AiGenerateDescriptionResponse response = aiService.generateProductDescription(request);

        assertNotNull(response);
        assertEquals("Chuột Logitech MX Master 3S", response.getProductName());
        assertTrue(response.getDescription().contains("Chuột Logitech MX Master 3S"));
    }

    @Test
    @DisplayName("TC_AI_04: Ném BadRequestException khi tên sản phẩm rỗng")
    void whenGenerateDescription_withEmptyName_thenThrowsBadRequestException() {
        AiGenerateDescriptionRequest request = AiGenerateDescriptionRequest.builder()
                .name("   ")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> aiService.generateProductDescription(request));
        assertTrue(ex.getMessage().contains("không được để trống"));
    }

    @Test
    @DisplayName("TC_AI_05: Làm sạch code fences thừa ```markdown và ```")
    void testCleanMarkdownOutput_RemovesCodeFences() {
        String rawWithMarkdownFence = "```markdown\n## Tiêu đề bài viết\nNội dung chi tiết ở đây.\n```";
        String cleaned1 = aiService.cleanMarkdownOutput(rawWithMarkdownFence);
        assertFalse(cleaned1.startsWith("```"));
        assertFalse(cleaned1.endsWith("```"));
        assertTrue(cleaned1.startsWith("## Tiêu đề bài viết"));
        assertTrue(cleaned1.endsWith("Nội dung chi tiết ở đây."));

        String rawWithSimpleFence = "```\n### Giới thiệu\nTính năng nổi bật\n```";
        String cleaned2 = aiService.cleanMarkdownOutput(rawWithSimpleFence);
        assertFalse(cleaned2.contains("```"));
        assertTrue(cleaned2.contains("### Giới thiệu"));

        String rawWithoutFence = "## Đỉnh Cao Công Nghệ\nNội dung không có fence.";
        String cleaned3 = aiService.cleanMarkdownOutput(rawWithoutFence);
        assertEquals(rawWithoutFence, cleaned3);
    }
}

