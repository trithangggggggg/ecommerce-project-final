package ra.project.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.model.entity.KnowledgeChunk;
import ra.project.server.model.entity.KnowledgeDocument;
import ra.project.server.repository.KnowledgeChunkRepository;
import ra.project.server.repository.KnowledgeDocumentRepository;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class KnowledgeDataInitializer implements CommandLineRunner {

    private final KnowledgeDocumentRepository knowledgeDocumentRepository;
    private final KnowledgeChunkRepository knowledgeChunkRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (knowledgeDocumentRepository.count() == 0) {
            log.info(">>> [KnowledgeDataInitializer] Khởi tạo dữ liệu mẫu cho AI Knowledge Base...");

            // 1. Chính sách bảo hành vàng
            String doc1 = "CHÍNH SÁCH BẢO HÀNH VÀNG NEXOR STORE:\n\n" +
                    "- Tất cả sản phẩm laptop, smartphone, phụ kiện phân phối tại NEXOR đều là hàng chính hãng 100%, bảo hành 12-24 tháng theo tiêu chuẩn của nhà sản xuất (Apple, Asus, Dell, Samsung, Sony).\n\n" +
                    "- Chính sách 1 đổi 1 trong 30 ngày đầu tiên nếu máy phát sinh lỗi phần cứng do nhà sản xuất (nguồn, mainboard, màn hình sọc, pin ảo, loa rè).\n\n" +
                    "- Hỗ trợ bảo hành trực tiếp tại các trung tâm bảo hành ủy quyền của hãng trên toàn quốc, hoặc gửi về chi nhánh NEXOR gần nhất để được nhân viên tiếp nhận và xử lý miễn phí 100% chi phí vận chuyển.\n\n" +
                    "- Khách hàng mua laptop tại NEXOR được tặng gói vệ sinh máy, tra keo tản nhiệt và cài đặt phần mềm bản quyền trọn đời sản phẩm.";
            saveInitDocument("chinh_sach_bao_hanh_vang.txt", "TXT", "POLICY", doc1);

            // 2. Quy định đổi trả & vận chuyển hỏa tốc
            String doc2 = "QUY ĐỊNH VẬN CHUYỂN & GIAO HÀNG HỎA TỐC:\n\n" +
                    "- Miễn phí vận chuyển toàn quốc (Freeship) cho mọi đơn hàng có giá trị từ 500.000đ trở lên.\n\n" +
                    "- Dịch vụ giao hàng hỏa tốc trong 2 giờ áp dụng cho khu vực nội thành Hà Nội và TP. Hồ Chí Minh.\n\n" +
                    "- Chính sách đồng kiểm khi nhận hàng (COD): Quý khách có quyền mở thùng kiểm tra ngoại quan, tem niêm phong và đúng mã model trước khi thanh toán cho shipper.\n\n" +
                    "- Toàn bộ đơn hàng công nghệ đều được dán tem niêm phong an toàn và đóng gói bằng thùng carton 5 lớp kèm túi khí chống va đập đạt chuẩn vận chuyển hàng không.";
            saveInitDocument("quy_dinh_doi_tra_va_van_chuyen.txt", "TXT", "POLICY", doc2);

            // 3. Hướng dẫn trả góp & thanh toán
            String doc3 = "HƯỚNG DẪN TRẢ GÓP 0% VÀ CÁC HÌNH THỨC THANH TOÁN:\n\n" +
                    "- Hỗ trợ trả góp 0% lãi suất thông qua thẻ tín dụng của hơn 25 ngân hàng đối tác liên kết (Techcombank, VPBank, Vietcombank, TPBank, MB, Shinhan, HSBC...).\n\n" +
                    "- Hỗ trợ xét duyệt hồ sơ trả góp online chỉ với CCCD gắn chip trong 10-15 phút mà không cần chứng minh thu nhập hay thẩm định người thân.\n\n" +
                    "- Đa dạng hình thức thanh toán: Chuyển khoản QR ngân hàng (NAPAS 247), Ví VNPay, Momo, quẹt thẻ POS hoặc thanh toán tiền mặt khi nhận hàng (COD).\n\n" +
                    "- Học sinh - Sinh viên được tặng thêm voucher giảm giá 500.000đ khi mua laptop hoặc máy tính bảng.";
            saveInitDocument("huong_dan_tra_gop_va_thanh_toan.txt", "TXT", "FAQ", doc3);

            // 4. Cẩm nang tư vấn chọn dòng máy
            String doc4 = "CẨM NANG CHỌN MÁY TÍNH & LAPTOP THEO NHU CẦU:\n\n" +
                    "- Nhu cầu Văn phòng, Học tập, Mỏng nhẹ: Ưu tiên Apple MacBook Air M2/M3, Dell XPS 13, ASUS Zenbook OLED với trọng lượng dưới 1.3kg, thời lượng pin từ 12-18 tiếng.\n\n" +
                    "- Nhu cầu Lập trình, Đồ họa kỹ thuật (Render 3D, Premiere, AutoCAD): Ưu tiên Apple MacBook Pro M3 Pro, ASUS ROG Zephyrus G16, Lenovo Legion Pro với RAM tối thiểu 16GB-32GB và màn hình chuẩn màu 100% sRGB/DCI-P3.\n\n" +
                    "- Nhu cầu Chơi game (Gaming eSports, AAA): Chọn dòng máy ASUS ROG Strix, Lenovo Legion 5/7, Acer Predator trang bị card đồ họa rời NVIDIA RTX 4060/4070 trở lên và tần số quét màn hình 165Hz - 240Hz.";
            saveInitDocument("cam_nang_tu_van_chon_dong_may.docx", "DOCX", "PRODUCT_GUIDE", doc4);

            log.info(">>> [KnowledgeDataInitializer] Đã khởi tạo 4 tài liệu tri thức mẫu và index các chunks thành công!");
        }
    }

    private void saveInitDocument(String fileName, String fileType, String category, String content) {
        KnowledgeDocument doc = KnowledgeDocument.builder()
                .fileName(fileName)
                .fileType(fileType)
                .fileSize((long) content.getBytes().length)
                .category(category)
                .status("INDEXED")
                .rawContent(content)
                .build();
        doc = knowledgeDocumentRepository.save(doc);

        List<KnowledgeChunk> chunks = new ArrayList<>();
        String[] paragraphs = content.split("\n\n");
        int idx = 0;
        for (String p : paragraphs) {
            if (!p.trim().isEmpty()) {
                chunks.add(KnowledgeChunk.builder()
                        .document(doc)
                        .chunkIndex(idx++)
                        .content(p.trim())
                        .tokenCount((p.trim().length() + 3) / 4)
                        .build());
            }
        }
        knowledgeChunkRepository.saveAll(chunks);
        doc.setChunkCount(chunks.size());
        knowledgeDocumentRepository.save(doc);
    }
}

