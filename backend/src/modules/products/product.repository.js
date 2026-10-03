const selection = [
  'p.id', 'p.sku', 'p.name', 'p.description', 'p.category_id AS categoryId',
  'c.name AS categoryName', 'p.price', 'p.stock', 'p.low_stock_at AS lowStockAt',
  'p.is_active AS isActive', 'p.image_file AS imageFile', 'p.illustration',
  'p.created_at AS createdAt', 'p.updated_at AS updatedAt',
].join(', ');

const from = ' FROM products p JOIN categories c ON c.id = p.category_id';

export function createProductRepository(pool) {
  return {
    async categories() {
      const [rows] = await pool.query('SELECT id, name, slug FROM categories ORDER BY id');
      return rows;
    },
    async categoryExists(id) {
      const [rows] = await pool.execute('SELECT id FROM categories WHERE id = ?', [id]);
      return rows.length > 0;
    },
    async find(id, connection = pool) {
      const [rows] = await connection.execute('SELECT ' + selection + from + ' WHERE p.id = ?', [id]);
      return rows[0] || null;
    },
    async list(filters) {
      const conditions = [];
      const values = [];
      if (filters.status !== 'all') {
        conditions.push('p.is_active = ?'); values.push(filters.status === 'active' ? 1 : 0);
      }
      if (filters.categoryId) {
        conditions.push('p.category_id = ?'); values.push(filters.categoryId);
      }
      if (filters.q) {
        conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
        values.push('%' + filters.q + '%', '%' + filters.q + '%');
      }
      if (filters.stock === 'low') conditions.push('p.stock <= p.low_stock_at');
      if (filters.stock === 'out') conditions.push('p.stock = 0');
      const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
      const sorts = {
        newest: 'p.id DESC', name: 'p.name ASC, p.id DESC',
        priceAsc: 'p.price ASC, p.id DESC', priceDesc: 'p.price DESC, p.id DESC',
        stockAsc: 'p.stock ASC, p.id DESC',
      };
      const [counts] = await pool.execute('SELECT COUNT(*) AS total' + from + where, values);
      // LIMIT/OFFSET are validated integers. All user text uses placeholders.
      const limit = filters.pageSize;
      const offset = (filters.page - 1) * limit;
      const [rows] = await pool.execute(
        'SELECT ' + selection + from + where + ' ORDER BY ' + sorts[filters.sort] +
        ' LIMIT ' + limit + ' OFFSET ' + offset, values,
      );
      return { items: rows, total: Number(counts[0].total), page: filters.page, pageSize: limit };
    },
    async insert(input, connection) {
      const [result] = await connection.execute(
        'INSERT INTO products (sku, name, description, category_id, price, stock, low_stock_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [input.sku, input.name, input.description, input.categoryId, input.price, input.stock, input.lowStockAt, input.isActive],
      );
      return result.insertId;
    },
    async update(id, input) {
      const [result] = await pool.execute(
        'UPDATE products SET sku=?, name=?, description=?, category_id=?, price=?, low_stock_at=?, is_active=? WHERE id=?',
        [input.sku, input.name, input.description, input.categoryId, input.price, input.lowStockAt, input.isActive, id],
      );
      return result.affectedRows;
    },
    async lock(id, connection) {
      const [rows] = await connection.execute('SELECT * FROM products WHERE id = ? FOR UPDATE', [id]);
      return rows[0] || null;
    },
    async setImage(id, imageFile, connection) {
      await connection.execute('UPDATE products SET image_file=? WHERE id=?', [imageFile, id]);
    },
  };
}
