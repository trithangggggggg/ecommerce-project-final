package ra.project.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import ra.project.server.util.SlugUtil;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class DatabaseMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        log.info(">>> [Migration] Bắt đầu kiểm tra và thực thi migration cấu trúc biến thể (Variants) & Thương hiệu (Brand)...");
        try {
            migrateProductBrandIfNotExists();
            createVariantTablesIfNotExists();
            addOrderItemColumnsIfNotExists();
            migrateOrderCancelAndProductDeletionColumns();
            migrateDefaultVariantsForExistingProducts();
            backfillOrderItems();
            createEmailOtpTableIfNotExists();
            createArticlesTableIfNotExists();
            migrateCategoryColumns();
            migrateVariantLocationColumns();
            migrateStoreAndCarrierColumns();
            createAndSeedBannerTable();
            createAndSeedSystemSettingTable();
            syncHomepagePresentationMigrations();
            createAndSeedWheelRewardTable();
            createAndSeedBrandTable();
            createAndSeedFlashSaleTables();
            createAndSeedPolicyTable();
            createWishlistTableIfNotExists();
            log.info(">>> [Migration] Hoàn tất migration toàn bộ cấu trúc dữ liệu & CMS thành công!");
        } catch (Exception e) {
            log.error(">>> [Migration] Gặp lỗi trong quá trình thực thi migration:", e);
            throw new RuntimeException("Migration failed", e);
        }
    }

    private void migrateProductBrandIfNotExists() throws SQLException {
        Set<String> productColumns = getTableColumns("products");
        if (!productColumns.contains("brand")) {
            log.info(">>> [Migration] Thêm cột 'brand' vào bảng 'products'...");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN brand VARCHAR(100) NULL");
            try {
                jdbcTemplate.execute("CREATE INDEX idx_products_brand ON products(brand)");
            } catch (Exception ignored) {
                // index might already exist
            }
        }

        // Backfill brand for products if null
        log.info(">>> [Migration] Kiểm tra và backfill thương hiệu (brand) cho các sản phẩm hiện có...");
        jdbcTemplate.update("UPDATE products SET brand = 'Apple' WHERE (brand IS NULL OR brand = '') AND (LOWER(name) LIKE '%iphone%' OR LOWER(name) LIKE '%ipad%' OR LOWER(name) LIKE '%macbook%' OR LOWER(name) LIKE '%apple%' OR LOWER(name) LIKE '%airpods%')");
        jdbcTemplate.update("UPDATE products SET brand = 'Samsung' WHERE (brand IS NULL OR brand = '') AND (LOWER(name) LIKE '%samsung%' OR LOWER(name) LIKE '%galaxy%')");
        jdbcTemplate.update("UPDATE products SET brand = 'Xiaomi' WHERE (brand IS NULL OR brand = '') AND (LOWER(name) LIKE '%xiaomi%' OR LOWER(name) LIKE '%redmi%')");
        jdbcTemplate.update("UPDATE products SET brand = 'Sony' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%sony%'");
        jdbcTemplate.update("UPDATE products SET brand = 'ASUS' WHERE (brand IS NULL OR brand = '') AND (LOWER(name) LIKE '%asus%' OR LOWER(name) LIKE '%rog%')");
        jdbcTemplate.update("UPDATE products SET brand = 'Lenovo' WHERE (brand IS NULL OR brand = '') AND (LOWER(name) LIKE '%lenovo%' OR LOWER(name) LIKE '%ideapad%' OR LOWER(name) LIKE '%legion%')");
        jdbcTemplate.update("UPDATE products SET brand = 'Dell' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%dell%'");
        jdbcTemplate.update("UPDATE products SET brand = 'HP' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%hp %'");
        jdbcTemplate.update("UPDATE products SET brand = 'Acer' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%acer%'");
        jdbcTemplate.update("UPDATE products SET brand = 'Logitech' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%logitech%'");
        jdbcTemplate.update("UPDATE products SET brand = 'Anker' WHERE (brand IS NULL OR brand = '') AND (LOWER(name) LIKE '%anker%' OR LOWER(name) LIKE '%soundcore%')");
        jdbcTemplate.update("UPDATE products SET brand = 'JBL' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%jbl%'");
        jdbcTemplate.update("UPDATE products SET brand = 'SanDisk' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%sandisk%'");
        jdbcTemplate.update("UPDATE products SET brand = 'Huawei' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%huawei%'");
        jdbcTemplate.update("UPDATE products SET brand = 'Garmin' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%garmin%'");
        jdbcTemplate.update("UPDATE products SET brand = 'Google' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%pixel%'");
        jdbcTemplate.update("UPDATE products SET brand = 'Marshall' WHERE (brand IS NULL OR brand = '') AND LOWER(name) LIKE '%marshall%'");
        jdbcTemplate.update("UPDATE products SET brand = 'Chính hãng' WHERE brand IS NULL OR brand = ''");
    }

    private void createVariantTablesIfNotExists() {
        log.info(">>> [Migration] Kiểm tra và tạo các bảng mới nếu chưa tồn tại...");

        // 1. product_options
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS `product_options` (
                `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
                `product_id` BIGINT NOT NULL,
                `name` VARCHAR(100) NOT NULL,
                `position` INT NOT NULL DEFAULT 0,
                CONSTRAINT `fk_product_options_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
            )
        """);

        // 2. product_option_values
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS `product_option_values` (
                `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
                `option_id` BIGINT NOT NULL,
                `value` VARCHAR(100) NOT NULL,
                `position` INT NOT NULL DEFAULT 0,
                CONSTRAINT `fk_option_values_option` FOREIGN KEY (`option_id`) REFERENCES `product_options` (`id`) ON DELETE CASCADE
            )
        """);

        // 3. product_variants
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS `product_variants` (
                `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
                `product_id` BIGINT NOT NULL,
                `sku` VARCHAR(100) NOT NULL UNIQUE,
                `price` DECIMAL(12, 2) NOT NULL,
                `original_price` DECIMAL(12, 2) NULL,
                `stock` INT NOT NULL DEFAULT 0,
                `image_url` VARCHAR(500),
                `status` BOOLEAN NOT NULL DEFAULT TRUE,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT `fk_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
            )
        """);

        // 4. variant_option_values
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS `variant_option_values` (
                `variant_id` BIGINT NOT NULL,
                `option_value_id` BIGINT NOT NULL,
                PRIMARY KEY (`variant_id`, `option_value_id`),
                CONSTRAINT `fk_vov_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_vov_option_value` FOREIGN KEY (`option_value_id`) REFERENCES `product_option_values` (`id`) ON DELETE CASCADE
            )
        """);

        // 5. product_specs
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS `product_specs` (
                `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
                `product_id` BIGINT NOT NULL,
                `group_name` VARCHAR(100),
                `spec_key` VARCHAR(150) NOT NULL,
                `spec_value` TEXT NOT NULL,
                `position` INT NOT NULL DEFAULT 0,
                CONSTRAINT `fk_specs_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
            )
        """);

        // 6. product_images
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS `product_images` (
                `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
                `product_id` BIGINT NOT NULL,
                `variant_id` BIGINT NULL,
                `url` VARCHAR(500) NOT NULL,
                `position` INT NOT NULL DEFAULT 0,
                CONSTRAINT `fk_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
            )
        """);
    }

    private void addOrderItemColumnsIfNotExists() throws SQLException {
        Set<String> existingColumns = getTableColumns("order_items");

        if (!existingColumns.contains("variant_id")) {
            log.info(">>> [Migration] Thêm cột 'variant_id' vào bảng 'order_items'...");
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN variant_id BIGINT NULL");
        }
        if (!existingColumns.contains("product_name")) {
            log.info(">>> [Migration] Thêm cột 'product_name' vào bảng 'order_items'...");
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN product_name VARCHAR(255) NULL");
        }
        if (!existingColumns.contains("variant_name")) {
            log.info(">>> [Migration] Thêm cột 'variant_name' vào bảng 'order_items'...");
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN variant_name VARCHAR(255) NULL");
        }
        if (!existingColumns.contains("sku")) {
            log.info(">>> [Migration] Thêm cột 'sku' vào bảng 'order_items'...");
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN sku VARCHAR(100) NULL");
        }
    }

    private void migrateOrderCancelAndProductDeletionColumns() throws SQLException {
        Set<String> orderColumns = getTableColumns("orders");
        if (!orderColumns.contains("cancel_reason")) {
            log.info(">>> [Migration] Thêm cột 'cancel_reason' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN cancel_reason VARCHAR(500) NULL");
        }
        if (!orderColumns.contains("compensation_coupon")) {
            log.info(">>> [Migration] Thêm cột 'compensation_coupon' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN compensation_coupon VARCHAR(100) NULL");
        }
        if (!orderColumns.contains("coupon_code")) {
            log.info(">>> [Migration] Thêm cột 'coupon_code' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) NULL");
        }
        if (!orderColumns.contains("discount_amount")) {
            log.info(">>> [Migration] Thêm cột 'discount_amount' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
        }

        Set<String> productColumns = getTableColumns("products");
        if (!productColumns.contains("is_deleted")) {
            log.info(">>> [Migration] Thêm cột 'is_deleted' vào bảng 'products'...");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE");
        }

        Set<String> orderItemColumns = getTableColumns("order_items");
        if (!orderItemColumns.contains("product_image_url")) {
            log.info(">>> [Migration] Thêm cột 'product_image_url' vào bảng 'order_items'...");
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN product_image_url VARCHAR(500) NULL");
            try {
                jdbcTemplate.update("""
                    UPDATE order_items oi
                    JOIN products p ON oi.product_id = p.id
                    SET oi.product_image_url = p.image_url
                    WHERE oi.product_image_url IS NULL AND p.image_url IS NOT NULL
                """);
            } catch (Exception e) {
                log.warn(">>> [Migration] Không thể backfill product_image_url: {}", e.getMessage());
            }
        }

        Set<String> promoColumns = getTableColumns("promotions");
        if (!promoColumns.contains("user_id")) {
            log.info(">>> [Migration] Thêm cột 'user_id' vào bảng 'promotions'...");
            jdbcTemplate.execute("ALTER TABLE promotions ADD COLUMN user_id BIGINT NULL");
            try {
                jdbcTemplate.update("""
                    UPDATE promotions p
                    JOIN orders o ON o.compensation_coupon = p.code
                    SET p.user_id = o.user_id
                    WHERE p.user_id IS NULL AND o.compensation_coupon IS NOT NULL
                """);
            } catch (Exception e) {
                log.warn(">>> [Migration] Không thể backfill user_id cho promotions: {}", e.getMessage());
            }
        }
        if (!promoColumns.contains("type")) {
            log.info(">>> [Migration] Thêm cột 'type' vào bảng 'promotions'...");
            jdbcTemplate.execute("ALTER TABLE promotions ADD COLUMN type VARCHAR(30) NOT NULL DEFAULT 'ORDER'");
            try {
                jdbcTemplate.update("""
                    UPDATE promotions
                    SET type = 'SHIPPING'
                    WHERE (UPPER(code) LIKE 'FREESHIP%' OR UPPER(code) LIKE 'SHIP%')
                """);
            } catch (Exception e) {
                log.warn(">>> [Migration] Không thể backfill type cho promotions: {}", e.getMessage());
            }
        }

        if (!orderColumns.contains("shipping_coupon_code")) {
            log.info(">>> [Migration] Thêm cột 'shipping_coupon_code' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN shipping_coupon_code VARCHAR(50) NULL");
        }
        if (!orderColumns.contains("shipping_discount")) {
            log.info(">>> [Migration] Thêm cột 'shipping_discount' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN shipping_discount DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
        }
        if (!orderColumns.contains("shipping_fee")) {
            log.info(">>> [Migration] Thêm cột 'shipping_fee' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN shipping_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
        }
        if (!orderColumns.contains("payment_status")) {
            log.info(">>> [Migration] Thêm cột 'payment_status' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID'");
        }
        if (!orderColumns.contains("sepay_invoice_number")) {
            log.info(">>> [Migration] Thêm cột 'sepay_invoice_number' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN sepay_invoice_number VARCHAR(100) NULL");
            try {
                jdbcTemplate.execute("CREATE UNIQUE INDEX uk_orders_sepay_invoice_number ON orders(sepay_invoice_number)");
            } catch (Exception ignored) {
                // index might already exist
            }
        }
        if (!orderColumns.contains("sepay_order_id")) {
            log.info(">>> [Migration] Thêm cột 'sepay_order_id' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN sepay_order_id VARCHAR(100) NULL");
        }
        if (!orderColumns.contains("payment_reference")) {
            log.info(">>> [Migration] Thêm cột 'payment_reference' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(100) NULL");
        }
        if (!orderColumns.contains("paid_at")) {
            log.info(">>> [Migration] Thêm cột 'paid_at' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN paid_at DATETIME NULL");
        }
        if (!orderColumns.contains("version")) {
            log.info(">>> [Migration] Thêm cột 'version' vào bảng 'orders'...");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN version BIGINT NOT NULL DEFAULT 0");
        }

        // Backfill an toàn cho các bản ghi cũ nếu Hibernate đã tạo cột cho phép NULL
        try {
            jdbcTemplate.update("UPDATE orders SET payment_status = 'UNPAID' WHERE payment_status IS NULL");
            jdbcTemplate.update("UPDATE orders SET version = 0 WHERE version IS NULL");
        } catch (Exception e) {
            log.warn(">>> [Migration] Không thể backfill payment_status/version cho orders: {}", e.getMessage());
        }
    }

    private Set<String> getTableColumns(String tableName) throws SQLException {
        Set<String> columns = new HashSet<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            try (ResultSet rs = metaData.getColumns(null, null, tableName, null)) {
                while (rs.next()) {
                    columns.add(rs.getString("COLUMN_NAME").toLowerCase());
                }
            }
            if (columns.isEmpty()) {
                // Thử viết hoa cho trường hợp một số DB engine
                try (ResultSet rs = metaData.getColumns(null, null, tableName.toUpperCase(), null)) {
                    while (rs.next()) {
                        columns.add(rs.getString("COLUMN_NAME").toLowerCase());
                    }
                }
            }
        }
        return columns;
    }

    private void migrateDefaultVariantsForExistingProducts() {
        String query = """
            SELECT p.id, p.name, p.price, p.stock, p.image_url, p.status
            FROM products p
            WHERE NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id)
        """;

        List<Map<String, Object>> missingVariants = jdbcTemplate.queryForList(query);
        if (missingVariants.isEmpty()) {
            log.info(">>> [Migration] Tất cả sản phẩm hiện tại đã có biến thể, không cần tạo biến thể mặc định.");
            return;
        }

        log.info(">>> [Migration] Phát hiện {} sản phẩm chưa có biến thể. Đang tiến hành tạo biến thể mặc định...", missingVariants.size());

        for (Map<String, Object> prod : missingVariants) {
            Long prodId = ((Number) prod.get("id")).longValue();
            String name = (String) prod.get("name");
            Object price = prod.get("price");
            Object stock = prod.get("stock");
            String imageUrl = (String) prod.get("image_url");
            Boolean status = (Boolean) prod.get("status");

            String sku = "SKU-P" + prodId + "-STD";

            jdbcTemplate.update("""
                INSERT INTO product_variants (product_id, sku, price, original_price, stock, image_url, status, created_at, updated_at)
                VALUES (?, ?, ?, NULL, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, prodId, sku, price, stock != null ? stock : 0, imageUrl, status != null ? status : true);

            log.info(">>> [Migration] Đã tạo biến thể mặc định SKU '{}' cho sản phẩm ID {} - '{}'", sku, prodId, name);
        }
    }

    private void backfillOrderItems() {
        String query = """
            SELECT oi.id, oi.product_id
            FROM order_items oi
            WHERE oi.variant_id IS NULL AND oi.product_id IS NOT NULL
        """;

        List<Map<String, Object>> unlinkedItems = jdbcTemplate.queryForList(query);
        if (unlinkedItems.isEmpty()) {
            log.info(">>> [Migration] Tất cả order_items đã có thông tin biến thể snapshot.");
            return;
        }

        log.info(">>> [Migration] Đang backfill snapshot và variant_id cho {} chi tiết đơn hàng cũ...", unlinkedItems.size());

        for (Map<String, Object> item : unlinkedItems) {
            Long itemId = ((Number) item.get("id")).longValue();
            Object prodIdObj = item.get("product_id");
            if (prodIdObj == null) continue;
            Long productId = ((Number) prodIdObj).longValue();

            // Lấy variant đầu tiên của sản phẩm
            List<Map<String, Object>> variants = jdbcTemplate.queryForList("""
                SELECT pv.id, pv.sku, p.name as product_name
                FROM product_variants pv
                JOIN products p ON p.id = pv.product_id
                WHERE pv.product_id = ?
                LIMIT 1
            """, productId);

            if (!variants.isEmpty()) {
                Map<String, Object> v = variants.get(0);
                Long variantId = ((Number) v.get("id")).longValue();
                String sku = (String) v.get("sku");
                String productName = (String) v.get("product_name");

                jdbcTemplate.update("""
                    UPDATE order_items
                    SET variant_id = ?, product_name = ?, variant_name = ?, sku = ?
                    WHERE id = ?
                """, variantId, productName, "Tiêu chuẩn", sku, itemId);
            }
        }
    }

    private void createEmailOtpTableIfNotExists() {
        log.info(">>> [Migration] Kiểm tra và tạo bảng 'email_otps' nếu chưa tồn tại...");
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS email_otps (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(150) NOT NULL,
                otp VARCHAR(10) NOT NULL,
                expiry_time DATETIME NOT NULL,
                used BOOLEAN NOT NULL DEFAULT FALSE,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_email_otps_email (email),
                INDEX idx_email_otps_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """);
    }

    private void createArticlesTableIfNotExists() {
        log.info(">>> [Migration] Kiểm tra và tạo bảng 'articles' nếu chưa tồn tại...");
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                summary VARCHAR(1000) NULL,
                content LONGTEXT NULL,
                thumbnail VARCHAR(500) NULL,
                category VARCHAR(100) NULL,
                views BIGINT NOT NULL DEFAULT 0,
                status BOOLEAN NOT NULL DEFAULT TRUE,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                INDEX idx_article_slug (slug),
                INDEX idx_article_category (category),
                INDEX idx_article_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """);
    }

    private void migrateCategoryColumns() throws SQLException {
        Set<String> cols = getTableColumns("categories");
        if (cols.isEmpty()) return;
        if (!cols.contains("slug")) {
            jdbcTemplate.execute("ALTER TABLE categories ADD COLUMN slug VARCHAR(120) NULL");
        }
        if (!cols.contains("display_order")) {
            jdbcTemplate.execute("ALTER TABLE categories ADD COLUMN display_order INT NOT NULL DEFAULT 0");
        }
        if (!cols.contains("show_on_home")) {
            jdbcTemplate.execute("ALTER TABLE categories ADD COLUMN show_on_home BOOLEAN NOT NULL DEFAULT TRUE");
        }
        List<Map<String, Object>> missingSlugs = jdbcTemplate.queryForList(
                "SELECT id, name FROM categories WHERE slug IS NULL OR slug = ''"
        );
        int idx = 1;
        for (Map<String, Object> row : missingSlugs) {
            Long id = ((Number) row.get("id")).longValue();
            String name = (String) row.get("name");
            String baseSlug = SlugUtil.toSlug(name);
            jdbcTemplate.update(
                    "UPDATE categories SET slug = ?, display_order = CASE WHEN display_order = 0 THEN ? ELSE display_order END WHERE id = ?",
                    baseSlug, idx++, id
            );
        }
    }

    private void migrateVariantLocationColumns() throws SQLException {
        Set<String> cols = getTableColumns("product_variants");
        if (cols.isEmpty()) return;
        if (!cols.contains("warehouse")) {
            jdbcTemplate.execute("ALTER TABLE product_variants ADD COLUMN warehouse VARCHAR(100) NULL DEFAULT 'Kho Trung Tâm HCM'");
        }
        if (!cols.contains("shelf_location")) {
            jdbcTemplate.execute("ALTER TABLE product_variants ADD COLUMN shelf_location VARCHAR(100) NULL");
        }
        jdbcTemplate.update("UPDATE product_variants SET warehouse = 'Kho Trung Tâm HCM' WHERE warehouse IS NULL OR warehouse = ''");
    }

    private void migrateStoreAndCarrierColumns() throws SQLException {
        Set<String> storeCols = getTableColumns("store_locations");
        if (!storeCols.isEmpty() && !storeCols.contains("image_url")) {
            jdbcTemplate.execute("ALTER TABLE store_locations ADD COLUMN image_url VARCHAR(500) NULL");
        }
        Set<String> carrierCols = getTableColumns("shipping_carriers");
        if (!carrierCols.isEmpty() && !carrierCols.contains("estimated_delivery")) {
            jdbcTemplate.execute("ALTER TABLE shipping_carriers ADD COLUMN estimated_delivery VARCHAR(100) NULL DEFAULT '2 - 3 ngày làm việc'");
            jdbcTemplate.update("UPDATE shipping_carriers SET estimated_delivery = '1 - 2 ngày (24h nội thành)' WHERE UPPER(code) = 'GHN' AND (estimated_delivery IS NULL OR estimated_delivery = '')");
            jdbcTemplate.update("UPDATE shipping_carriers SET estimated_delivery = '2 - 4 ngày toàn quốc' WHERE UPPER(code) = 'GHTK' AND (estimated_delivery IS NULL OR estimated_delivery = '')");
            jdbcTemplate.update("UPDATE shipping_carriers SET estimated_delivery = '2 - 3 ngày liên tỉnh' WHERE UPPER(code) = 'VTP' AND (estimated_delivery IS NULL OR estimated_delivery = '')");
            jdbcTemplate.update("UPDATE shipping_carriers SET estimated_delivery = '2 - 3 ngày TMĐT' WHERE UPPER(code) = 'JNT' AND (estimated_delivery IS NULL OR estimated_delivery = '')");
            jdbcTemplate.update("UPDATE shipping_carriers SET estimated_delivery = 'Trong ngày (Hỏa tốc 2H)' WHERE UPPER(code) = 'NEXOR' AND (estimated_delivery IS NULL OR estimated_delivery = '')");
            jdbcTemplate.update("UPDATE shipping_carriers SET estimated_delivery = '2 - 3 ngày làm việc' WHERE estimated_delivery IS NULL OR estimated_delivery = ''");
        }
    }

    private void createAndSeedBannerTable() {
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS banners (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                subtitle VARCHAR(500) NULL,
                badge VARCHAR(80) NULL,
                image_url VARCHAR(500) NOT NULL,
                link_url VARCHAR(500) NULL,
                position VARCHAR(50) NOT NULL DEFAULT 'HERO_SLIDER',
                display_order INT NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                start_date DATE NULL,
                end_date DATE NULL,
                click_count BIGINT NOT NULL DEFAULT 0,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                INDEX idx_banner_position (position),
                INDEX idx_banner_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """);

        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM banners", Integer.class);
        if (count != null && count == 0) {
            jdbcTemplate.update("""
                INSERT INTO banners (title, subtitle, badge, image_url, link_url, position, display_order, is_active, click_count, created_at, updated_at) VALUES
                ('ASUS TUF F15 - Chiến game mạnh mẽ', 'Hiệu năng ấn tượng, thiết kế bền bỉ dành cho game thủ', 'LAPTOP GAMING', 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/asus_tuf_f15_fxuvax.jpg', '/products', 'HERO_SLIDER', 1, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Tai nghe gaming HyperX Cloud III', 'Âm thanh sống động, trải nghiệm gaming đỉnh cao', 'GAMING GEAR', 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_tai_nghe_hyper_cloud_3_bwvebf.jpg', '/products', 'HERO_SLIDER', 2, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Bảng vẽ điện tử XP-Pen Artist 24 Pro', 'Khơi nguồn sáng tạo, nâng tầm trải nghiệm thiết kế', 'SÁNG TẠO & ĐỒ HỌA', 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_bang_ve_dien_tru_r1iezy.jpg', '/products', 'HERO_SLIDER', 3, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Chuột gaming Razer DeathAdder Essential', 'Thiết kế công thái học, kiểm soát chính xác trong từng trận đấu', 'GAMING GEAR', 'https://res.cloudinary.com/diprwc5iy/image/upload/v1792763665/chu%E1%BB%99t_gaming_razer_deathadder_essential_m5s1he.jpg', '/products', 'HERO_SLIDER', 4, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('IPHONE 16 PRO MAX TITAN SA MẠC', 'Sức mạnh chip A18 Pro bứt phá mọi giới hạn - Trả góp 0% lãi suất, thu cũ đổi mới trợ giá đến 3 triệu', 'NEW ARRIVAL', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1200&q=80', '/products?keyword=iPhone', 'HERO_SLIDER', 5, FALSE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('MACBOOK AIR M3 - HIỆU NĂNG MẠNH MẼ', 'Chip M3 siêu mạnh mẽ, thời lượng pin lên đến 18 giờ, thiết kế mỏng nhẹ chỉ 1.24 kg', 'SẢN PHẨM BÁN CHẠY', '/images/macbook-hero-banner.jpg', '/products?keyword=MacBook', 'HERO_SLIDER', 6, FALSE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('SAMSUNG GALAXY S24 ULTRA AI', 'Quyền năng Galaxy AI tiếng Việt toàn diện - Màn hình chống phản chiếu đỉnh cao, tặng kèm sạc nhanh 45W', 'GALAXY AI', 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=1200&q=80', '/products?keyword=Samsung', 'HERO_SLIDER', 7, FALSE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Ưu đãi hôm nay - Giảm đến 50%', 'Cho các sản phẩm laptop, điện thoại chính hãng tại NEXOR', 'ƯU ĐÃI HÔM NAY', '/images/promo-discount-50.jpg', '/products?sort=discount', 'HERO_PROMO', 1, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Miễn phí vận chuyển toàn quốc', 'Áp dụng ưu đãi giao hàng nhanh trên toàn quốc', 'MIỄN PHÍ SHIP', '/images/promo-free-shipping.jpg', '/products', 'HERO_PROMO', 2, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Bảo hành chính hãng 12 - 24 tháng', 'Cam kết chính hãng, hỗ trợ bảo hành minh bạch tùy sản phẩm', 'BẢO HÀNH CHÍNH HÃNG', '/images/promo-warranty.jpg', '/policies/chinh-sach-bao-hanh', 'HERO_PROMO', 3, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Công nghệ dẫn lối tương lai', 'Laptop - Điện thoại - Phụ kiện chính hãng NEXOR', 'NEXOR TECH', '/images/tech-future-banner.jpg', '/products', 'VERTICAL_PROMO', 1, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """);
        }
    }

    /**
     * One-time idempotent migrations ensuring existing databases keep homepage category divider
     * and cohesive Nexor promo/vertical banner layout without overwriting Admin customizations.
     */
    private void syncHomepagePresentationMigrations() {
        Integer catMigrated = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM system_settings WHERE setting_key = 'migration.category_show_on_home_v1'",
                Integer.class
        );
        if (catMigrated == null || catMigrated == 0) {
            Integer activeHomeCategories = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM categories WHERE show_on_home = TRUE",
                    Integer.class
            );
            Integer totalCategories = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM categories",
                    Integer.class
            );
            if (totalCategories != null && totalCategories > 0 && (activeHomeCategories == null || activeHomeCategories == 0)) {
                jdbcTemplate.update("UPDATE categories SET show_on_home = TRUE");
            }
            jdbcTemplate.update("UPDATE categories SET description = 'Đa dạng thương hiệu' WHERE (description IS NULL OR TRIM(description) = '') AND (slug LIKE '%dien-thoai%' OR LOWER(name) LIKE '%điện thoại%')");
            jdbcTemplate.update("UPDATE categories SET description = 'Hiệu năng vượt trội' WHERE (description IS NULL OR TRIM(description) = '') AND (slug LIKE '%laptop%' OR LOWER(name) LIKE '%laptop%')");
            jdbcTemplate.update("UPDATE categories SET description = 'Linh hoạt, tiện lợi' WHERE (description IS NULL OR TRIM(description) = '') AND (slug LIKE '%may-tinh-bang%' OR LOWER(name) LIKE '%máy tính bảng%')");
            jdbcTemplate.update("UPDATE categories SET description = 'Âm thanh sống động' WHERE (description IS NULL OR TRIM(description) = '') AND (slug LIKE '%tai-nghe%' OR slug LIKE '%am-thanh%' OR LOWER(name) LIKE '%tai nghe%' OR LOWER(name) LIKE '%âm thanh%')");
            jdbcTemplate.update("UPDATE categories SET description = 'Theo dõi sức khỏe' WHERE (description IS NULL OR TRIM(description) = '') AND (slug LIKE '%dong-ho%' OR LOWER(name) LIKE '%đồng hồ%')");
            jdbcTemplate.update("UPDATE categories SET description = 'Chính hãng, bền bỉ' WHERE (description IS NULL OR TRIM(description) = '') AND (slug LIKE '%phu-kien%' OR LOWER(name) LIKE '%phụ kiện%')");

            upsertSettingIfMissing(
                    "migration.category_show_on_home_v1",
                    "true",
                    "GENERAL",
                    "Migration marker show_on_home",
                    "Cờ đánh dấu đã đồng bộ show_on_home cho danh mục hiện có",
                    "BOOLEAN",
                    false
            );
        }

        Integer bannerMigrated = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM system_settings WHERE setting_key = 'migration.nexor_promo_banners_v1'",
                Integer.class
        );
        if (bannerMigrated == null || bannerMigrated == 0) {
            jdbcTemplate.update("""
                UPDATE banners
                SET title = 'Ưu đãi hôm nay - Giảm đến 50%',
                    subtitle = 'Cho các sản phẩm laptop, điện thoại chính hãng tại NEXOR',
                    badge = 'ƯU ĐÃI HÔM NAY',
                    image_url = '/images/promo-discount-50.jpg',
                    link_url = '/products?sort=discount',
                    display_order = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE position = 'HERO_PROMO'
                  AND image_url LIKE '%photo-1505740420928%'
            """);

            jdbcTemplate.update("""
                UPDATE banners
                SET title = 'Miễn phí vận chuyển toàn quốc',
                    subtitle = 'Áp dụng ưu đãi giao hàng nhanh trên toàn quốc',
                    badge = 'MIỄN PHÍ SHIP',
                    image_url = '/images/promo-free-shipping.jpg',
                    link_url = '/products',
                    display_order = 2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE position = 'HERO_PROMO'
                  AND image_url LIKE '%photo-1593642632823%'
            """);

            Integer heroPromoCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM banners WHERE position = 'HERO_PROMO' AND is_active = TRUE",
                    Integer.class
            );
            Integer hasWarrantyBanner = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM banners WHERE position = 'HERO_PROMO' AND image_url = '/images/promo-warranty.jpg'",
                    Integer.class
            );
            if ((heroPromoCount != null && heroPromoCount < 3) && (hasWarrantyBanner == null || hasWarrantyBanner == 0)) {
                jdbcTemplate.update("""
                    INSERT INTO banners (title, subtitle, badge, image_url, link_url, position, display_order, is_active, click_count, created_at, updated_at)
                    VALUES ('Bảo hành chính hãng 12 - 24 tháng', 'Cam kết chính hãng, hỗ trợ bảo hành minh bạch tùy sản phẩm', 'BẢO HÀNH CHÍNH HÃNG', '/images/promo-warranty.jpg', '/policies/chinh-sach-bao-hanh', 'HERO_PROMO', 3, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """);
            }

            jdbcTemplate.update("""
                UPDATE banners
                SET title = 'Công nghệ dẫn lối tương lai',
                    subtitle = 'Laptop - Điện thoại - Phụ kiện chính hãng NEXOR',
                    badge = 'NEXOR TECH',
                    image_url = '/images/tech-future-banner.jpg',
                    updated_at = CURRENT_TIMESTAMP
                WHERE position = 'VERTICAL_PROMO'
                  AND image_url LIKE '%photo-1519389950473%'
            """);

            upsertSettingIfMissing(
                    "migration.nexor_promo_banners_v1",
                    "true",
                    "GENERAL",
                    "Migration marker nexor_promo_banners_v1",
                    "Cờ đánh dấu đã nâng cấp bộ banner promo mặc định của NEXOR",
                    "BOOLEAN",
                    false
            );
        }

        Integer legacyHeroMigrated = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM system_settings WHERE setting_key = 'migration.nexor_legacy_hero_slider_v1'",
                Integer.class
        );
        if (legacyHeroMigrated == null || legacyHeroMigrated == 0) {
            // Preserve the earlier seed slides cleanly in Admin (inactive) so the classic ASUS TUF F15
            // and gaming gear hero slider banners become active without losing Admin control.
            jdbcTemplate.update("""
                UPDATE banners
                SET is_active = FALSE,
                    display_order = display_order + 4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE position = 'HERO_SLIDER'
                  AND image_url IN (
                    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1200&q=80',
                    '/images/macbook-hero-banner.jpg',
                    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=1200&q=80'
                  )
            """);

            insertHeroBannerIfMissing(
                    "ASUS TUF F15 - Chiến game mạnh mẽ",
                    "Hiệu năng ấn tượng, thiết kế bền bỉ dành cho game thủ",
                    "LAPTOP GAMING",
                    "https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/asus_tuf_f15_fxuvax.jpg",
                    "/products",
                    1
            );
            insertHeroBannerIfMissing(
                    "Tai nghe gaming HyperX Cloud III",
                    "Âm thanh sống động, trải nghiệm gaming đỉnh cao",
                    "GAMING GEAR",
                    "https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_tai_nghe_hyper_cloud_3_bwvebf.jpg",
                    "/products",
                    2
            );
            insertHeroBannerIfMissing(
                    "Bảng vẽ điện tử XP-Pen Artist 24 Pro",
                    "Khơi nguồn sáng tạo, nâng tầm trải nghiệm thiết kế",
                    "SÁNG TẠO & ĐỒ HỌA",
                    "https://res.cloudinary.com/diprwc5iy/image/upload/v1792763137/banner_bang_ve_dien_tru_r1iezy.jpg",
                    "/products",
                    3
            );
            insertHeroBannerIfMissing(
                    "Chuột gaming Razer DeathAdder Essential",
                    "Thiết kế công thái học, kiểm soát chính xác trong từng trận đấu",
                    "GAMING GEAR",
                    "https://res.cloudinary.com/diprwc5iy/image/upload/v1792763665/chu%E1%BB%99t_gaming_razer_deathadder_essential_m5s1he.jpg",
                    "/products",
                    4
            );

            upsertSettingIfMissing(
                    "migration.nexor_legacy_hero_slider_v1",
                    "true",
                    "GENERAL",
                    "Migration marker nexor_legacy_hero_slider_v1",
                    "Cờ đánh dấu đã khôi phục bộ banner Hero Slider gốc (ASUS TUF F15 & Gaming Gear)",
                    "BOOLEAN",
                    false
            );
        }
    }

    private void insertHeroBannerIfMissing(
            String title,
            String subtitle,
            String badge,
            String imageUrl,
            String linkUrl,
            int displayOrder
    ) {
        Integer existing = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM banners WHERE position = 'HERO_SLIDER' AND image_url = ?",
                Integer.class,
                imageUrl
        );
        if (existing == null || existing == 0) {
            jdbcTemplate.update(
                    """
                    INSERT INTO banners (title, subtitle, badge, image_url, link_url, position, display_order, is_active, click_count, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 'HERO_SLIDER', ?, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """,
                    title, subtitle, badge, imageUrl, linkUrl, displayOrder
            );
        }
    }

    private void createAndSeedSystemSettingTable() {
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(120) NOT NULL UNIQUE,
                setting_value LONGTEXT NULL,
                setting_group VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
                label VARCHAR(200) NULL,
                description VARCHAR(500) NULL,
                value_type VARCHAR(30) NOT NULL DEFAULT 'STRING',
                is_public BOOLEAN NOT NULL DEFAULT TRUE,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                INDEX idx_sys_setting_group (setting_group)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """);

        upsertSettingIfMissing("shipping.freeshipThreshold", "20000000", "SHIPPING", "Ngưỡng miễn phí vận chuyển (VNĐ)", "Đơn hàng đạt mức này trở lên được miễn phí 100% cước vận chuyển", "NUMBER", true);
        upsertSettingIfMissing("shipping.halfShipThreshold", "10000000", "SHIPPING", "Ngưỡng giảm 50% phí vận chuyển (VNĐ)", "Đơn hàng đạt mức này được giảm 50% cước vận chuyển chuẩn", "NUMBER", true);
        upsertSettingIfMissing("shipping.defaultFee", "30000", "SHIPPING", "Phí vận chuyển mặc định (VNĐ)", "Áp dụng khi đơn hàng không chọn hãng vận chuyển cụ thể", "NUMBER", true);
        upsertSettingIfMissing("shipping.estimatedLeadTime", "2 - 3 ngày làm việc", "SHIPPING", "Thời gian giao hàng dự kiến mặc định", "Hiển thị tại trang giỏ hàng và chi tiết sản phẩm", "STRING", true);

        upsertSettingIfMissing("payment.codEnabled", "true", "PAYMENT", "Bật thanh toán khi nhận hàng (COD)", "Cho phép khách chọn COD khi đặt hàng", "BOOLEAN", true);
        upsertSettingIfMissing("payment.sepayEnabled", "true", "PAYMENT", "Bật thanh toán chuyển khoản VietQR / SePay", "Cho phép thanh toán quét mã QR tự động đối soát", "BOOLEAN", true);
        upsertSettingIfMissing("payment.vnpayEnabled", "false", "PAYMENT", "Bật cổng thanh toán VNPay / Thẻ quốc tế", "Chỉ hiển thị khi đã cấu hình khóa tích hợp cổng thẻ", "BOOLEAN", true);

        upsertSettingIfMissing("store.name", "NEXOR Technology Store", "STORE_CONTACT", "Tên thương hiệu cửa hàng", "Hiển thị tại Header, Footer, Tiêu đề và hóa đơn", "STRING", true);
        upsertSettingIfMissing("store.shortName", "NEXOR", "STORE_CONTACT", "Tên viết tắt thương hiệu", "Hiển thị tại Logo và các nhãn ngắn", "STRING", true);
        upsertSettingIfMissing("store.tagline", "Hệ sinh thái Công nghệ & Trải nghiệm AI", "STORE_CONTACT", "Khẩu hiệu (Tagline)", "Hiển thị ở trang đăng nhập, giới thiệu và Footer", "STRING", true);
        upsertSettingIfMissing("store.hotline", "1800 6688", "STORE_CONTACT", "Hotline CSKH", "Số tổng đài hỗ trợ khách hàng toàn quốc", "STRING", true);
        upsertSettingIfMissing("store.hotlineLabel", "1800 6688 (Miễn phí)", "STORE_CONTACT", "Nhãn Hotline hiển thị", "Chuỗi hotline kèm chú thích hiển thị ở Header/Footer", "STRING", true);
        upsertSettingIfMissing("store.email", "support@nexor.vn", "STORE_CONTACT", "Email hỗ trợ chính thức", "Email tiếp nhận hỗ trợ, bảo hành và hợp tác", "STRING", true);
        upsertSettingIfMissing("store.address", "Tầng 12, Tòa nhà Nexor Tower, Quận 1, TP. Hồ Chí Minh", "STORE_CONTACT", "Địa chỉ trụ sở chính", "Địa chỉ văn phòng & flagship trung tâm hiển thị ở Footer", "STRING", true);
        upsertSettingIfMissing("store.openHours", "08:00 - 22:00 (Thứ 2 - Chủ Nhật)", "STORE_CONTACT", "Giờ làm việc", "Thời gian phục vụ showroom và tư vấn trực tuyến", "STRING", true);
        upsertSettingIfMissing("store.copyright", "© 2026 NEXOR Technology. Bảo lưu mọi quyền.", "STORE_CONTACT", "Bản quyền Footer", "Dòng bản quyền cuối trang Storefront", "STRING", true);

        upsertSettingIfMissing("social.facebookUrl", "https://facebook.com", "SOCIAL", "Liên kết Facebook", "Trang Fanpage chính thức (để trống để ẩn)", "STRING", true);
        upsertSettingIfMissing("social.youtubeUrl", "https://youtube.com", "SOCIAL", "Liên kết YouTube", "Kênh YouTube review công nghệ (để trống để ẩn)", "STRING", true);
        upsertSettingIfMissing("social.zaloUrl", "https://zalo.me", "SOCIAL", "Liên kết Zalo OA", "Kênh chat hỗ trợ Zalo Official Account (để trống để ẩn)", "STRING", true);

        upsertSettingIfMissing("general.wheelEnabled", "true", "GENERAL", "Bật Vòng quay may mắn trên Client", "Hiển thị nút nổi và modal Vòng quay may mắn cho khách hàng", "BOOLEAN", true);
        upsertSettingIfMissing("general.promoTickerText", "Giao hàng miễn phí cho đơn từ 20 triệu • Bảo hành 1 đổi 1 30 ngày • Trả góp 0% qua VietQR", "GENERAL", "Thông báo Topbar Header", "Thông điệp khuyến mãi nổi bật trên đầu trang", "STRING", true);
        upsertSettingIfMissing("general.flashSaleBannerTitle", "GIỜ VÀNG GIÁ SỐC - SĂN DEAL CHÍNH HÃNG", "GENERAL", "Tiêu đề mặc định khu vực Flash Sale", "Tiêu đề hiển thị khi có chương trình Flash Sale", "STRING", true);
    }

    private void upsertSettingIfMissing(String key, String value, String group, String label, String description, String valueType, boolean isPublic) {
        Integer existing = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM system_settings WHERE setting_key = ?", Integer.class, key
        );
        if (existing == null || existing == 0) {
            jdbcTemplate.update("""
                INSERT INTO system_settings (setting_key, setting_value, setting_group, label, description, value_type, is_public, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, key, value, group, label, description, valueType, isPublic);
        }
    }

    private void createAndSeedWheelRewardTable() {
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS wheel_rewards (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                label VARCHAR(120) NOT NULL,
                short_label VARCHAR(50) NOT NULL,
                discount VARCHAR(50) NOT NULL,
                reward_type VARCHAR(30) NOT NULL DEFAULT 'ORDER',
                min_order VARCHAR(100) NULL,
                max_discount_amount DECIMAL(12,2) NULL,
                weight INT NOT NULL DEFAULT 10,
                color VARCHAR(30) NULL,
                text_color VARCHAR(30) NULL,
                icon VARCHAR(50) NULL,
                display_order INT NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                INDEX idx_wheel_reward_active (is_active),
                INDEX idx_wheel_reward_order (display_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """);

        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM wheel_rewards", Integer.class);
        if (count != null && count == 0) {
            jdbcTemplate.update("""
                INSERT INTO wheel_rewards (label, short_label, discount, reward_type, min_order, max_discount_amount, weight, color, text_color, icon, display_order, is_active, created_at, updated_at) VALUES
                ('10K Voucher', '10K', '10.000', 'ORDER', 'Mọi đơn hàng', NULL, 30, '#1e40af', '#ffffff', 'coupon', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('10% Giảm Giá', '10%', '10%', 'ORDER', '100.000₫', 50000.00, 25, '#4338ca', '#ffffff', 'cube', 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Miễn Phí Vận Chuyển', 'FREESHIP', '100%', 'SHIPPING', 'Mọi đơn hàng', NULL, 20, '#059669', '#ffffff', 'truck', 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('20K Voucher', '20K', '20.000', 'ORDER', '200.000₫', NULL, 15, '#ea580c', '#ffffff', 'coins', 4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('15% Giảm Giá', '15%', '15%', 'ORDER', '300.000₫', 100000.00, 5, '#dc2626', '#ffffff', 'fire', 5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('50K Siêu Sale', '50K', '50.000', 'ORDER', '500.000₫', NULL, 3, '#0284c7', '#ffffff', 'bolt', 6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('25% Giảm Giá VIP', '25%', '25%', 'ORDER', '500.000₫', 150000.00, 1, '#9333ea', '#ffffff', 'star', 7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('100K Voucher Jackpot', '100K', '100.000', 'ORDER', '1.000.000₫', NULL, 1, '#b45309', '#ffffff', 'crown', 8, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """);
        }
    }

    private void createAndSeedBrandTable() {
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS brands (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                slug VARCHAR(120) NOT NULL UNIQUE,
                logo_url VARCHAR(500) NULL,
                country VARCHAR(100) NULL,
                description TEXT NULL,
                website_url VARCHAR(300) NULL,
                display_order INT NOT NULL DEFAULT 0,
                status BOOLEAN NOT NULL DEFAULT TRUE,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                INDEX idx_brand_name (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """);

        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM brands", Integer.class);
        if (count != null && count == 0) {
            List<String> productBrands = jdbcTemplate.queryForList(
                    "SELECT DISTINCT TRIM(brand) FROM products WHERE brand IS NOT NULL AND TRIM(brand) <> '' ORDER BY TRIM(brand) ASC",
                    String.class
            );
            int order = 1;
            Set<String> inserted = new HashSet<>();
            for (String bName : productBrands) {
                if (bName == null || bName.isBlank()) continue;
                String clean = bName.trim();
                String slug = SlugUtil.toSlug(clean);
                if (inserted.add(slug)) {
                    jdbcTemplate.update("""
                        INSERT INTO brands (name, slug, country, description, display_order, status, created_at, updated_at)
                        VALUES (?, ?, 'Quốc tế', ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, clean, slug, "Thương hiệu công nghệ chính hãng " + clean + " phân phối tại NEXOR", order++);
                }
            }
            String[][] defaults = {
                {"Apple", "Hoa Kỳ"},
                {"Samsung", "Hàn Quốc"},
                {"Sony", "Nhật Bản"},
                {"ASUS", "Đài Loan"},
                {"Dell", "Hoa Kỳ"},
                {"Xiaomi", "Trung Quốc"},
                {"Logitech", "Thụy Sĩ"},
                {"Anker", "Hoa Kỳ"}
            };
            for (String[] def : defaults) {
                String slug = SlugUtil.toSlug(def[0]);
                if (inserted.add(slug)) {
                    jdbcTemplate.update("""
                        INSERT INTO brands (name, slug, country, description, display_order, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, def[0], slug, def[1], "Thương hiệu công nghệ chính hãng " + def[0], order++);
                }
            }
        }
    }

    private void createAndSeedFlashSaleTables() {
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS flash_sales (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description VARCHAR(500) NULL,
                badge_text VARCHAR(80) NULL DEFAULT 'FLASH SALE',
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                INDEX idx_flash_sale_active (is_active),
                INDEX idx_flash_sale_time (start_time, end_time)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """);

        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS flash_sale_items (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                flash_sale_id BIGINT NOT NULL,
                product_id BIGINT NOT NULL,
                sale_price DECIMAL(12,2) NOT NULL,
                original_price DECIMAL(12,2) NULL,
                stock_limit INT NOT NULL DEFAULT 20,
                sold_count INT NOT NULL DEFAULT 0,
                display_order INT NOT NULL DEFAULT 0,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                CONSTRAINT fk_fs_item_sale FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(id) ON DELETE CASCADE,
                CONSTRAINT fk_fs_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                INDEX idx_fs_item_sale (flash_sale_id),
                INDEX idx_fs_item_product (product_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """);

        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM flash_sales", Integer.class);
        if (count != null && count == 0) {
            java.sql.Timestamp startTs = java.sql.Timestamp.valueOf(java.time.LocalDateTime.now().minusHours(1));
            java.sql.Timestamp endTs = java.sql.Timestamp.valueOf(java.time.LocalDateTime.now().plusDays(7));
            jdbcTemplate.update("""
                INSERT INTO flash_sales (title, description, badge_text, start_time, end_time, is_active, created_at, updated_at)
                VALUES (
                    'GIỜ VÀNG GIÁ SỐC - TUẦN LỄ CÔNG NGHỆ NEXOR',
                    'Săn ngay siêu phẩm công nghệ chính hãng với mức giá ưu đãi đặc biệt trong khung giờ giới hạn',
                    'HOT DEAL 24/7',
                    ?,
                    ?,
                    TRUE,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
            """, startTs, endTs);
            Long fsId = jdbcTemplate.queryForObject("SELECT MAX(id) FROM flash_sales", Long.class);
            if (fsId != null) {
                List<Map<String, Object>> products = jdbcTemplate.queryForList("""
                    SELECT id, price FROM products
                    WHERE (is_deleted = FALSE OR is_deleted IS NULL)
                      AND price > 0
                    ORDER BY id DESC LIMIT 6
                """);
                int idx = 1;
                for (Map<String, Object> p : products) {
                    Long prodId = ((Number) p.get("id")).longValue();
                    java.math.BigDecimal origPrice = (java.math.BigDecimal) p.get("price");
                    java.math.BigDecimal salePrice = origPrice.multiply(java.math.BigDecimal.valueOf(0.85))
                            .setScale(0, java.math.RoundingMode.HALF_UP);
                    jdbcTemplate.update("""
                        INSERT INTO flash_sale_items (flash_sale_id, product_id, sale_price, original_price, stock_limit, sold_count, display_order, created_at, updated_at)
                        VALUES (?, ?, ?, ?, 20, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, fsId, prodId, salePrice, origPrice, idx * 2, idx);
                    idx++;
                }
            }
        }
    }

    private void createAndSeedPolicyTable() {
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS policies (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                slug VARCHAR(220) NOT NULL UNIQUE,
                category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
                summary VARCHAR(500) NULL,
                content LONGTEXT NULL,
                display_order INT NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                INDEX idx_policy_category (category),
                INDEX idx_policy_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """);

        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM policies", Integer.class);
        if (count != null && count == 0) {
            jdbcTemplate.update("""
                INSERT INTO policies (title, slug, category, summary, content, display_order, is_active, created_at, updated_at) VALUES
                ('Chính sách bảo hành chính hãng NEXOR', 'chinh-sach-bao-hanh', 'WARRANTY',
                 'Bảo hành chính hãng từ 12 - 24 tháng, hỗ trợ kiểm tra nhanh và bảo hành điện tử theo số serial.',
                 '<h3>1. Thời hạn bảo hành tiêu chuẩn</h3><p>Tất cả sản phẩm bán tại <strong>NEXOR Technology</strong> được bảo hành chính hãng từ 12 đến 24 tháng tùy theo quy định của nhà sản xuất.</p><h3>2. Quyền lợi 1 đổi 1 trong 30 ngày</h3><p>Nếu sản phẩm phát sinh lỗi phần cứng từ nhà sản xuất trong 30 ngày đầu tiên kể từ ngày nhận hàng, khách hàng được đổi mới 100% sản phẩm cùng model hoặc hoàn tiền tương đương.</p><h3>3. Điều kiện tiếp nhận bảo hành</h3><ul><li>Sản phẩm còn nguyên vẹn tem niêm phong (nếu có) và không có dấu hiệu vào nước, nứt vỡ do tác động vật lý bên ngoài.</li><li>Tra cứu bảo hành nhanh qua số điện thoại đặt hàng hoặc mã IMEI/Serial trên hóa đơn.</li></ul>',
                 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Chính sách đổi trả & hoàn tiền 30 ngày', 'chinh-sach-doi-tra', 'RETURN',
                 'Hỗ trợ đổi mới miễn phí trong 30 ngày đối với lỗi kỹ thuật và hướng dẫn hoàn tiền minh bạch.',
                 '<h3>1. Phạm vi áp dụng</h3><p>Áp dụng cho toàn bộ đơn hàng mua trực tuyến trên website NEXOR và mua trực tiếp tại hệ thống Showroom trên toàn quốc.</p><h3>2. Thời gian xử lý hoàn tiền</h3><ul><li>Chuyển khoản / VietQR SePay: Hoàn tiền trong vòng 1 - 3 ngày làm việc sau khi kiểm định sản phẩm thu hồi.</li><li>Đơn hàng COD: Chuyển khoản trực tiếp về tài khoản ngân hàng do quý khách cung cấp.</li></ul>',
                 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Chính sách giao hàng & kiểm tra hàng', 'chinh-sach-van-chuyen', 'SHIPPING',
                 'Miễn phí vận chuyển toàn quốc theo ngưỡng giá trị đơn hàng, hỗ trợ giao nhanh hỏa tốc 2H nội thành.',
                 '<h3>1. Biểu phí vận chuyển</h3><p>Mức miễn phí vận chuyển và giảm 50% phí vận chuyển được cấu hình linh hoạt bởi hệ thống NEXOR (áp dụng tự động ở bước Giỏ hàng và Thanh toán).</p><h3>2. Đồng kiểm khi nhận hàng</h3><p>Khách hàng được quyền kiểm tra ngoại quan hộp hàng, đối chiếu đúng mã sản phẩm và phụ kiện trước khi thanh toán cho nhân viên giao nhận.</p>',
                 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Hướng dẫn thanh toán & bảo mật giao dịch', 'huong-dan-thanh-toan', 'PAYMENT',
                 'Hỗ trợ thanh toán COD tận nơi và chuyển khoản VietQR tự động xác nhận qua SePay 24/7.',
                 '<h3>1. Thanh toán khi nhận hàng (COD)</h3><p>Thanh toán trực tiếp bằng tiền mặt hoặc chuyển khoản cho nhân viên giao vận sau khi kiểm tra kiện hàng.</p><h3>2. Thanh toán chuyển khoản VietQR (SePay)</h3><p>Hệ thống tạo mã QR chứa sẵn số tiền và mã nội dung giao dịch chính xác. Đơn hàng được xác nhận thanh toán tự động chỉ sau 3 - 10 giây.</p>',
                 4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Chính sách bảo mật thông tin khách hàng', 'chinh-sach-bao-mat', 'PRIVACY',
                 'Cam kết bảo vệ tuyệt đối dữ liệu cá nhân, lịch sử mua sắm và thông tin giao dịch của khách hàng.',
                 '<h3>1. Mục đích thu thập thông tin</h3><p>NEXOR chỉ sử dụng họ tên, số điện thoại, địa chỉ và email để xử lý đơn hàng, giao vận, bảo hành điện tử và gửi thông báo khuyến mãi khi được sự đồng ý.</p><h3>2. Bảo mật & lưu trữ</h3><p>Dữ liệu xác thực được mã hóa an toàn theo chuẩn JWT/BCrypt và tuyệt đối không chia sẻ cho bên thứ ba ngoài mục đích vận chuyển đơn hàng.</p>',
                 5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('Điều khoản sử dụng dịch vụ NEXOR', 'dieu-khoan-su-dung', 'TERMS',
                 'Quy định chung khi truy cập, đặt hàng, sử dụng mã ưu đãi và tham gia chương trình thành viên tại NEXOR.',
                 '<h3>1. Quy định chung</h3><p>Khi truy cập và đặt hàng tại NEXOR, quý khách xác nhận đồng ý với các quy chuẩn về giá niêm yết, thời gian xử lý đơn hàng và quy định sử dụng mã khuyến mãi.</p><h3>2. Liên hệ hỗ trợ</h3><p>Mọi thắc mắc vui lòng liên hệ tổng đài hỗ trợ khách hàng hoặc đến trực tiếp hệ thống showroom NEXOR trên toàn quốc.</p>',
                 6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """);
        }
    }

    private void createWishlistTableIfNotExists() {
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS wishlist_items (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                product_id BIGINT NOT NULL,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                CONSTRAINT uk_wishlist_user_product UNIQUE (user_id, product_id),
                INDEX idx_wishlist_user (user_id),
                INDEX idx_wishlist_product (product_id),
                CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """);
    }
}