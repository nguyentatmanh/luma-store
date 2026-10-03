export function createInventoryRepository(pool) {
  return {
    async insert(movement, connection) {
      const [result] = await connection.execute(
        'INSERT INTO stock_movements (product_id, product_name, kind, quantity, stock_before, stock_after, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [movement.productId, movement.productName, movement.kind, movement.quantity,
          movement.stockBefore, movement.stockAfter, movement.note],
      );
      return result.insertId;
    },
    async setStock(id, stock, connection) {
      await connection.execute('UPDATE products SET stock=? WHERE id=?', [stock, id]);
    },
    async list({ productId, page, pageSize }) {
      const where = productId ? ' WHERE m.product_id = ?' : '';
      const params = productId ? [productId] : [];
      const [counts] = await pool.execute('SELECT COUNT(*) AS total FROM stock_movements m' + where, params);
      const [items] = await pool.execute(
        'SELECT m.id, m.product_id AS productId, m.product_name AS productName, p.sku, m.kind, m.quantity, ' +
        'm.stock_before AS stockBefore, m.stock_after AS stockAfter, m.note, m.created_at AS createdAt ' +
        'FROM stock_movements m JOIN products p ON p.id=m.product_id' + where +
        ' ORDER BY m.id DESC LIMIT ' + pageSize + ' OFFSET ' + (page - 1) * pageSize, params,
      );
      return { items, total: Number(counts[0].total), page, pageSize };
    },
  };
}
