const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'all_30_products.json');
let raw = fs.readFileSync(jsonPath, 'utf8').replace(/^\uFEFF/, '');
const products = JSON.parse(raw);

const categoryMap = {
  'Điện thoại': 1,
  'Laptop': 2,
  'Máy tính bảng': 3,
  'Tai nghe': 4,
  'Đồng hồ thông minh': 5,
  'Phụ kiện công nghệ': 6
};

// Fallback high quality verified images for products with placeholder
const imageOverrides = {
  'TB001': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
  'TB002': 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800',
  'TB003': 'https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=800',
  'TB004': 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800',
  'TB005': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
  'TN001': 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800',
  'TN002': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
  'TN003': 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800',
  'TN004': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
  'TN005': 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800',
  'DH001': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
  'DH002': 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
  'DH003': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
  'DH004': 'https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=800',
  'DH005': 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
  'PK001': 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800',
  'PK002': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800',
  'PK003': 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800',
  'PK004': 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800',
  'PK005': 'https://images.unsplash.com/photo-1628191010210-a59de33e5941?w=800'
};

function escapeSql(str) {
  if (!str) return "''";
  return "'" + str.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\r/g, '').replace(/\n/g, '\\n') + "'";
}

let sql = `-- =============================================================================
-- Migration & Seed Data: 30 Sản phẩm theo Hồ sơ E-SHOPTECH (6 danh mục)
-- =============================================================================
SET NAMES utf8mb4;
USE ecommerce_db;

-- 1. Cập nhật và thêm đủ 6 danh mục chuẩn theo hồ sơ
INSERT INTO categories (id, name, description, status) VALUES
    (1, 'Điện thoại', 'Các dòng điện thoại thông minh chính hãng mới nhất', TRUE),
    (2, 'Laptop', 'Máy tính xách tay văn phòng và gaming hiệu năng cao', TRUE),
    (3, 'Máy tính bảng', 'Thiết bị giải trí, học tập và làm việc đồ họa linh hoạt', TRUE),
    (4, 'Tai nghe', 'Tai nghe True Wireless, tai nghe chống ồn và thiết bị âm thanh', TRUE),
    (5, 'Đồng hồ thông minh', 'Smartwatch thể thao, chăm sóc sức khỏe và thời trang', TRUE),
    (6, 'Phụ kiện công nghệ', 'Củ sạc nhanh, chuột máy tính, thẻ nhớ và phụ kiện chính hãng', TRUE)
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    description = VALUES(description),
    status = VALUES(status);

-- 2. Xóa dữ liệu sản phẩm cũ để nhập đủ chuẩn 30 sản phẩm
DELETE FROM products;
ALTER TABLE products AUTO_INCREMENT = 1;

-- 3. Thêm 30 sản phẩm từ hồ sơ
INSERT INTO products (id, name, description, price, stock, image_url, status, category_id) VALUES
`;

const valueRows = [];

products.forEach((p, index) => {
  const id = index + 1;
  const name = p.Name;
  const catId = categoryMap[p.Category];
  
  let imageUrl = '';
  if (p.Image1 && p.Image1.includes('http')) {
    const match = p.Image1.match(/https?:\/\/[^\s\]]+/);
    if (match) imageUrl = match[0];
  }
  if (!imageUrl && imageOverrides[p.Code]) {
    imageUrl = imageOverrides[p.Code];
  }
  
  // Format rich description: Short description followed by Technical Specs
  let desc = p.ShortDesc || '';
  if (p.Specs) {
    if (desc) desc += '\n\nThông số kỹ thuật:\n';
    desc += p.Specs;
  }
  
  const price = p.Price || 0;
  const stock = p.Stock || 0;
  
  valueRows.push(`    (${id}, ${escapeSql(name)}, ${escapeSql(desc)}, ${price}.00, ${stock}, ${escapeSql(imageUrl)}, TRUE, ${catId})`);
});

sql += valueRows.join(',\n') + ';\n';

fs.writeFileSync(path.join(__dirname, 'import_30_products.sql'), sql, 'utf8');
console.log('Successfully generated scripts/import_30_products.sql with', valueRows.length, 'products.');
