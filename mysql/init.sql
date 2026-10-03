-- Dữ liệu mẫu cho cửa hàng Luma. Docker chỉ chạy file này khi volume MySQL còn trống.
SET NAMES utf8mb4;

CREATE TABLE categories (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE products (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  category_id INT UNSIGNED NOT NULL,
  price INT UNSIGNED NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  low_stock_at INT UNSIGNED NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  image_file VARCHAR(80) NULL,
  illustration VARCHAR(32) NOT NULL DEFAULT 'box',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_products_category (category_id),
  INDEX idx_products_active_stock (is_active, stock)
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  kind ENUM('opening', 'in', 'out') NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  stock_before INT UNSIGNED NOT NULL,
  stock_after INT UNSIGNED NOT NULL,
  note VARCHAR(300) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_movements_product (product_id, id),
  INDEX idx_movements_created (created_at)
) ENGINE=InnoDB;

INSERT INTO categories (name, slug) VALUES
('Góc làm việc', 'workspace'), ('Âm thanh', 'audio'),
('Thiết bị số', 'digital'), ('Phụ kiện', 'accessories');

INSERT INTO products
  (sku, name, description, category_id, price, stock, low_stock_at, illustration)
VALUES
('LM-KB01', 'Bàn phím Luma Keys', 'Bàn phím không dây gọn nhẹ, phím êm. Phù hợp góc làm việc tại nhà.', 1, 890000, 24, 5, 'keyboard'),
('LM-HP01', 'Tai nghe Studio', 'Tai nghe chụp tai với đệm mềm, kết nối Bluetooth và dây âm thanh.', 2, 1290000, 18, 5, 'headphones'),
('LM-LP01', 'Đèn bàn Halo', 'Ánh sáng dịu, ba mức sáng. Thiết kế tối giản cho bàn làm việc.', 1, 590000, 4, 5, 'lamp'),
('LM-MS01', 'Chuột Air Mouse', 'Chuột không dây, thao tác nhẹ và yên tĩnh. Có đầu thu USB.', 1, 390000, 32, 8, 'mouse'),
('LM-CM01', 'Camera Pocket', 'Camera nhỏ gọn cho cuộc gọi và ghi hình cá nhân.', 3, 2190000, 8, 3, 'camera'),
('LM-SP01', 'Loa Mini Sound', 'Loa di động nhỏ gọn, âm thanh ấm. Có thể dùng trên bàn làm việc.', 2, 790000, 3, 5, 'speaker'),
('LM-WT01', 'Đồng hồ Daily', 'Đồng hồ điện tử nhẹ, màn hình rõ. Dây silicone dễ vệ sinh.', 3, 1490000, 12, 3, 'watch'),
('LM-BG01', 'Túi Everyday', 'Túi đeo chéo nhiều ngăn, tiện mang theo đồ dùng cá nhân.', 4, 450000, 15, 5, 'bag'),
('LM-BT01', 'Bình giữ nhiệt Flow', 'Bình 500 ml, nắp vặn kín. Vừa tay và dễ mang theo.', 4, 320000, 0, 5, 'bottle'),
('LM-CH01', 'Sạc Compact', 'Bộ sạc USB-C cho thiết bị cá nhân. Thiết kế nhỏ gọn.', 4, 490000, 21, 5, 'charger'),
('LM-ST01', 'Giá đỡ Rise', 'Giá đỡ laptop bằng kim loại, gọn và chắc chắn.', 1, 650000, 10, 3, 'stand'),
('LM-EB01', 'Tai nghe Buds', 'Tai nghe không dây kèm hộp sạc. Gọn nhẹ cho việc di chuyển.', 2, 990000, 2, 5, 'earbuds');

-- Tồn đầu kỳ cũng có dấu vết; không tạo doanh thu hoặc đơn hàng giả.
INSERT INTO stock_movements
  (product_id, product_name, kind, quantity, stock_before, stock_after, note)
SELECT id, name, 'opening', stock, 0, stock, 'Khởi tạo dữ liệu mẫu'
FROM products WHERE stock > 0;
