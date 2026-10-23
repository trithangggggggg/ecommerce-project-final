package ra.project.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

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
        log.info(">>> [Migration] Bắt đầu kiểm tra và thực thi migration cấu trúc biến thể (Variants)...");
        try {
            createVariantTablesIfNotExists();
            addOrderItemColumnsIfNotExists();
            migrateDefaultVariantsForExistingProducts();
            backfillOrderItems();
            log.info(">>> [Migration] Hoàn tất migration biến thể sản phẩm thành công!");
        } catch (Exception e) {
            log.error(">>> [Migration] Gặp lỗi trong quá trình thực thi migration:", e);
            throw new RuntimeException("Migration failed", e);
        }
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
            WHERE oi.variant_id IS NULL
        """;

        List<Map<String, Object>> unlinkedItems = jdbcTemplate.queryForList(query);
        if (unlinkedItems.isEmpty()) {
            log.info(">>> [Migration] Tất cả order_items đã có thông tin biến thể snapshot.");
            return;
        }

        log.info(">>> [Migration] Đang backfill snapshot và variant_id cho {} chi tiết đơn hàng cũ...", unlinkedItems.size());

        for (Map<String, Object> item : unlinkedItems) {
            Long itemId = ((Number) item.get("id")).longValue();
            Long productId = ((Number) item.get("product_id")).longValue();

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
}
