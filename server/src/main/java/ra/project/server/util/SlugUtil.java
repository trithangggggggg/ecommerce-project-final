package ra.project.server.util;

import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public class SlugUtil {

    private static final Pattern NON_LATIN = Pattern.compile("[^a-z0-9\\s-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]+");
    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern MULTIPLE_HYPHENS = Pattern.compile("-+");
    private static final Pattern TRIM_HYPHENS = Pattern.compile("(^-)|(-$)");

    private SlugUtil() {
        // Utility class
    }

    /**
     * Chuyển đổi chuỗi tiếng Việt hoặc bất kỳ sang dạng SEO slug chuẩn không dấu:
     * Ví dụ: "Đánh Giá Laptop Dell XPS 15 (2026)!" -> "danh-gia-laptop-dell-xps-15-2026"
     */
    public static String toSlug(String input) {
        if (!StringUtils.hasText(input)) {
            return "bai-viet";
        }

        String str = input.trim();
        // Xử lý ký tự đặc thù tiếng Việt Đ/đ
        str = str.replace("đ", "d").replace("Đ", "d");

        // Phân tách dấu và xóa dấu thanh tiếng Việt
        String normalized = Normalizer.normalize(str, Normalizer.Form.NFD);
        String withoutDiacritics = DIACRITICS.matcher(normalized).replaceAll("");

        // Chuyển về chữ thường
        String lower = withoutDiacritics.toLowerCase(Locale.ENGLISH);

        // Thay ký tự không phải chữ cái latin hoặc số bằng khoảng trắng
        String cleanChars = NON_LATIN.matcher(lower).replaceAll(" ");

        // Thay thế chuỗi khoảng trắng thành dấu gạch nối
        String withHyphens = WHITESPACE.matcher(cleanChars.trim()).replaceAll("-");

        // Rút gọn các dấu gạch nối liên tiếp
        String singleHyphens = MULTIPLE_HYPHENS.matcher(withHyphens).replaceAll("-");

        // Loại bỏ dấu gạch nối ở đầu và cuối chuỗi
        String result = TRIM_HYPHENS.matcher(singleHyphens).replaceAll("");

        if (!StringUtils.hasText(result)) {
            return "bai-viet";
        }

        return result;
    }
}

