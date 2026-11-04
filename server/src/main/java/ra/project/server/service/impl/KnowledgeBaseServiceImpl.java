package ra.project.server.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.dto.request.ManualKnowledgeRequest;
import ra.project.server.model.dto.response.KnowledgeChunkResponse;
import ra.project.server.model.dto.response.KnowledgeDocumentResponse;
import ra.project.server.model.dto.response.KnowledgeStatsResponse;
import ra.project.server.model.entity.KnowledgeChunk;
import ra.project.server.model.entity.KnowledgeDocument;
import ra.project.server.repository.KnowledgeChunkRepository;
import ra.project.server.repository.KnowledgeDocumentRepository;
import ra.project.server.service.KnowledgeBaseService;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeBaseServiceImpl implements KnowledgeBaseService {

    private final KnowledgeDocumentRepository documentRepository;
    private final KnowledgeChunkRepository chunkRepository;

    private static final int CHUNK_SIZE = 500;
    private static final int CHUNK_OVERLAP = 50;

    @Override
    @Transactional(readOnly = true)
    public List<KnowledgeDocumentResponse> getAllDocuments(String category, String status, String search) {
        List<KnowledgeDocument> documents = documentRepository.findAllByOrderByCreatedAtDesc();

        return documents.stream()
                .filter(doc -> !StringUtils.hasText(category) || category.equalsIgnoreCase("ALL") || category.equalsIgnoreCase(doc.getCategory()))
                .filter(doc -> !StringUtils.hasText(status) || status.equalsIgnoreCase("ALL") || status.equalsIgnoreCase(doc.getStatus()))
                .filter(doc -> {
                    if (!StringUtils.hasText(search)) return true;
                    String s = search.toLowerCase();
                    return doc.getFileName().toLowerCase().contains(s) ||
                            (doc.getCategory() != null && doc.getCategory().toLowerCase().contains(s));
                })
                .map(this::toDocumentResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public KnowledgeDocumentResponse getDocumentById(Long id) {
        KnowledgeDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu tri thức ID: " + id));
        return toDocumentResponse(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public KnowledgeStatsResponse getStats() {
        List<KnowledgeDocument> docs = documentRepository.findAll();

        long totalFiles = docs.size();
        long totalSize = docs.stream().mapToLong(d -> d.getFileSize() != null ? d.getFileSize() : 0L).sum();
        long totalChunks = docs.stream().mapToLong(d -> d.getChunkCount() != null ? d.getChunkCount() : 0).sum();

        Map<String, Long> fileTypeDist = docs.stream()
                .collect(Collectors.groupingBy(d -> d.getFileType() != null ? d.getFileType().toUpperCase() : "OTHER", Collectors.counting()));

        Map<String, Long> statusDist = docs.stream()
                .collect(Collectors.groupingBy(d -> d.getStatus() != null ? d.getStatus().toUpperCase() : "INDEXED", Collectors.counting()));

        Map<String, Long> categoryDist = docs.stream()
                .collect(Collectors.groupingBy(d -> d.getCategory() != null ? d.getCategory().toUpperCase() : "GENERAL", Collectors.counting()));

        return KnowledgeStatsResponse.builder()
                .totalFiles(totalFiles)
                .totalSize(totalSize)
                .formattedTotalSize(formatFileSize(totalSize))
                .totalChunks(totalChunks)
                .fileTypeDistribution(fileTypeDist)
                .statusDistribution(statusDist)
                .categoryDistribution(categoryDist)
                .build();
    }

    @Override
    @Transactional
    public KnowledgeDocumentResponse uploadDocument(MultipartFile file, String category) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn tập tin tài liệu cần tải lên");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "tai_lieu_" + System.currentTimeMillis();
        }

        String fileExtension = getFileExtension(originalFilename).toUpperCase();
        if (!isSupportedExtension(fileExtension)) {
            throw new BadRequestException("Định dạng file không được hỗ trợ. Hệ thống hỗ trợ PDF, DOCX, TXT, CSV, MD.");
        }

        String extractedText;
        try {
            extractedText = extractText(file.getBytes(), fileExtension);
        } catch (Exception ex) {
            log.error("Lỗi khi trích xuất nội dung file [{}]: {}", originalFilename, ex.getMessage(), ex);
            KnowledgeDocument failedDoc = KnowledgeDocument.builder()
                    .fileName(originalFilename)
                    .fileType(fileExtension)
                    .fileSize(file.getSize())
                    .category(StringUtils.hasText(category) ? category.toUpperCase() : "GENERAL")
                    .status("FAILED")
                    .errorMessage("Lỗi đọc nội dung file: " + ex.getMessage())
                    .chunkCount(0)
                    .build();
            failedDoc = documentRepository.save(failedDoc);
            return toDocumentResponse(failedDoc);
        }

        if (!StringUtils.hasText(extractedText)) {
            throw new BadRequestException("Tập tin tải lên không chứa văn bản hoặc không trích xuất được nội dung");
        }

        // Tạo Document
        KnowledgeDocument document = KnowledgeDocument.builder()
                .fileName(originalFilename)
                .fileType(fileExtension)
                .fileSize(file.getSize())
                .category(StringUtils.hasText(category) ? category.toUpperCase() : "GENERAL")
                .status("INDEXED")
                .rawContent(extractedText)
                .build();

        document = documentRepository.save(document);

        // Phân đoạn thành các Chunks và lưu DB
        List<KnowledgeChunk> chunks = splitIntoChunks(extractedText, document);
        chunkRepository.saveAll(chunks);

        document.setChunkCount(chunks.size());
        document = documentRepository.save(document);

        log.info("Nạp tài liệu thành công: [{}] -> {} chunks tạo ra", originalFilename, chunks.size());
        return toDocumentResponse(document);
    }

    @Override
    @Transactional
    public KnowledgeDocumentResponse createManualEntry(ManualKnowledgeRequest request) {
        String title = request.getTitle().trim();
        String content = request.getContent().trim();
        String category = StringUtils.hasText(request.getCategory()) ? request.getCategory().toUpperCase() : "GENERAL";

        long estimatedSize = content.getBytes(StandardCharsets.UTF_8).length;

        KnowledgeDocument document = KnowledgeDocument.builder()
                .fileName(title)
                .fileType("MANUAL")
                .fileSize(estimatedSize)
                .category(category)
                .status("INDEXED")
                .rawContent(content)
                .build();

        document = documentRepository.save(document);

        List<KnowledgeChunk> chunks = splitIntoChunks(content, document);
        chunkRepository.saveAll(chunks);

        document.setChunkCount(chunks.size());
        document = documentRepository.save(document);

        log.info("Tạo tri thức thủ công: [{}] -> {} chunks", title, chunks.size());
        return toDocumentResponse(document);
    }

    @Override
    @Transactional
    public void deleteDocument(Long id) {
        KnowledgeDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu tri thức ID: " + id));

        chunkRepository.deleteAllByDocumentId(id);
        documentRepository.delete(doc);
        log.info("Đã xóa tài liệu tri thức ID: {} ({}) cùng toàn bộ chunks liên quan", id, doc.getFileName());
    }

    @Override
    @Transactional
    public KnowledgeDocumentResponse reindexDocument(Long id) {
        KnowledgeDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu tri thức ID: " + id));

        if (!StringUtils.hasText(doc.getRawContent())) {
            throw new BadRequestException("Tài liệu không có nội dung gốc để tái lập chỉ mục");
        }

        chunkRepository.deleteAllByDocumentId(id);

        List<KnowledgeChunk> chunks = splitIntoChunks(doc.getRawContent(), doc);
        chunkRepository.saveAll(chunks);

        doc.setStatus("INDEXED");
        doc.setChunkCount(chunks.size());
        doc.setErrorMessage(null);
        doc = documentRepository.save(doc);

        log.info("Tái lập chỉ mục thành công tài liệu ID: {} -> {} chunks", id, chunks.size());
        return toDocumentResponse(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public List<KnowledgeChunkResponse> getChunksByDocumentId(Long id) {
        if (!documentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy tài liệu tri thức ID: " + id);
        }
        return chunkRepository.findByDocumentIdOrderByChunkIndexAsc(id).stream()
                .map(c -> KnowledgeChunkResponse.builder()
                        .id(c.getId())
                        .documentId(c.getDocument().getId())
                        .chunkIndex(c.getChunkIndex())
                        .content(c.getContent())
                        .tokenCount(c.getTokenCount())
                        .createdAt(c.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> findRelevantChunks(String query, int maxChunks) {
        if (!StringUtils.hasText(query)) {
            return Collections.emptyList();
        }

        String normQuery = normalizeText(query);
        Set<String> stopWords = Set.of("tu", "van", "cho", "minh", "toi", "can", "mua", "xem", "gia", "co", "khong", "re", "nao", "tot", "nhat", "a", "em", "anh", "chi", "shop", "dong", "loai");
        List<String> keywords = Arrays.stream(normQuery.split("\\s+"))
                .filter(w -> w.length() >= 2 && !stopWords.contains(w))
                .collect(Collectors.toList());

        if (keywords.isEmpty()) {
            return Collections.emptyList();
        }

        List<KnowledgeChunk> allChunks = chunkRepository.findAll();
        if (allChunks.isEmpty()) {
            return Collections.emptyList();
        }

        // Chấm điểm mức độ liên quan (BM25-like relevance scoring)
        Map<KnowledgeChunk, Integer> scored = new HashMap<>();
        for (KnowledgeChunk chunk : allChunks) {
            String normContent = normalizeText(chunk.getContent());
            int score = 0;
            for (String kw : keywords) {
                if (normContent.contains(kw)) {
                    score += 10;
                }
            }
            if (score > 0) {
                scored.put(chunk, score);
            }
        }

        return scored.entrySet().stream()
                .sorted(Map.Entry.<KnowledgeChunk, Integer>comparingByValue().reversed())
                .limit(Math.max(1, maxChunks))
                .map(e -> String.format("[%s]: %s", e.getKey().getDocument().getFileName(), e.getKey().getContent()))
                .collect(Collectors.toList());
    }

    // ==========================================
    // HELPER METHODS: Chunking & Text Extraction
    // ==========================================

    private List<KnowledgeChunk> splitIntoChunks(String text, KnowledgeDocument doc) {
        List<KnowledgeChunk> chunks = new ArrayList<>();
        if (!StringUtils.hasText(text)) return chunks;

        String clean = text.trim();
        int length = clean.length();
        int start = 0;
        int chunkIdx = 0;

        while (start < length) {
            int end = Math.min(start + CHUNK_SIZE, length);

            // Tìm điểm ngắt câu hoặc xuống dòng tự nhiên nếu chưa đến cuối văn bản
            if (end < length) {
                int nextBreak = findNaturalBreak(clean, start, end);
                if (nextBreak > start + 100) {
                    end = nextBreak;
                }
            }

            String chunkText = clean.substring(start, end).trim();
            if (!chunkText.isEmpty()) {
                chunks.add(KnowledgeChunk.builder()
                        .document(doc)
                        .chunkIndex(chunkIdx++)
                        .content(chunkText)
                        .tokenCount(estimateTokens(chunkText))
                        .build());
            }

            if (end >= length) break;
            start = Math.max(start + 1, end - CHUNK_OVERLAP);
        }

        return chunks;
    }

    private int findNaturalBreak(String text, int start, int preferredEnd) {
        // Tìm xuống dòng \n\n hoặc \n gần preferredEnd
        int newline = text.lastIndexOf('\n', preferredEnd);
        if (newline > start + 200) {
            return newline + 1;
        }
        // Tìm dấu chấm câu . ! ?
        int period = text.lastIndexOf('.', preferredEnd);
        if (period > start + 200) {
            return period + 1;
        }
        return preferredEnd;
    }

    private int estimateTokens(String text) {
        // Ước lượng 1 token ≈ 4 ký tự tiếng Việt
        return (text.length() + 3) / 4;
    }

    private String extractText(byte[] bytes, String extension) throws IOException {
        switch (extension) {
            case "PDF":
                return extractPdfText(bytes);
            case "DOCX":
                return extractDocxText(bytes);
            case "TXT":
            case "CSV":
            case "MD":
            default:
                return new String(bytes, StandardCharsets.UTF_8);
        }
    }

    private String extractPdfText(byte[] bytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document).trim();
        }
    }

    private String extractDocxText(byte[] bytes) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    String xml = new String(zis.readAllBytes(), StandardCharsets.UTF_8);
                    // Trích xuất các nội dung trong thẻ <w:t>...</w:t>
                    Pattern pattern = Pattern.compile("<w:t[^>]*>(.*?)</w:t>");
                    Matcher matcher = pattern.matcher(xml);
                    while (matcher.find()) {
                        sb.append(matcher.group(1)).append(" ");
                    }
                    break;
                }
            }
        }
        return sb.toString().trim();
    }

    private boolean isSupportedExtension(String ext) {
        return Set.of("PDF", "DOCX", "TXT", "CSV", "MD").contains(ext);
    }

    private String getFileExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot > 0 && dot < filename.length() - 1) {
            return filename.substring(dot + 1);
        }
        return "TXT";
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format(Locale.US, "%.2f KB", bytes / 1024.0);
        return String.format(Locale.US, "%.2f MB", bytes / (1024.0 * 1024.0));
    }

    private String normalizeText(String input) {
        if (!StringUtils.hasText(input)) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        return Pattern.compile("\\p{InCombiningDiacriticalMarks}+")
                .matcher(normalized)
                .replaceAll("")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase()
                .trim();
    }

    private KnowledgeDocumentResponse toDocumentResponse(KnowledgeDocument doc) {
        return KnowledgeDocumentResponse.builder()
                .id(doc.getId())
                .fileName(doc.getFileName())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .category(doc.getCategory())
                .status(doc.getStatus())
                .chunkCount(doc.getChunkCount())
                .errorMessage(doc.getErrorMessage())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .build();
    }
}

