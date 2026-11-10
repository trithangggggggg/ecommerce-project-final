package ra.project.server.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SlugUtilTest {

    @Test
    @DisplayName("Nên tạo slug chuẩn SEO không dấu từ tiêu đề tiếng Việt")
    void testToSlug_VietnameseTitle() {
        String title = "Đánh giá MacBook Air M3: Đỉnh cao laptop mỏng nhẹ cho lập trình viên!";
        String slug = SlugUtil.toSlug(title);

        assertEquals("danh-gia-macbook-air-m3-dinh-cao-laptop-mong-nhe-cho-lap-trinh-vien", slug);
    }

    @Test
    @DisplayName("Nên loại bỏ các ký tự đặc biệt và dấu cách liên tiếp")
    void testToSlug_SpecialCharacters() {
        String title = "  Samsung Galaxy S24 Ultra & AI Features --- (2026 Edition)  ";
        String slug = SlugUtil.toSlug(title);

        assertEquals("samsung-galaxy-s24-ultra-ai-features-2026-edition", slug);
    }

    @Test
    @DisplayName("Nên xử lý tiêu đề trống hoặc null an toàn")
    void testToSlug_EmptyOrNull() {
        assertEquals("bai-viet", SlugUtil.toSlug(""));
        assertEquals("bai-viet", SlugUtil.toSlug(null));
        assertEquals("bai-viet", SlugUtil.toSlug("   "));
        assertEquals("bai-viet", SlugUtil.toSlug("!@#$%^&*()"));
    }
}

