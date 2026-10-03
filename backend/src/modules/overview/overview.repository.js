export function createOverviewRepository(pool) {
  return {
    async metrics() {
      const [rows] = await pool.query(
        'SELECT COUNT(*) AS activeProducts, COALESCE(SUM(stock),0) AS totalUnits, ' +
        'COALESCE(SUM(price * stock),0) AS inventoryValue, ' +
        'COALESCE(SUM(stock <= low_stock_at),0) AS lowStockProducts ' +
        'FROM products WHERE is_active=1',
      );
      return Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]));
    },
    async categoryBreakdown() {
      const [rows] = await pool.query(
        'SELECT c.id, c.name, COUNT(p.id) AS productCount, COALESCE(SUM(p.stock),0) AS units ' +
        'FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.is_active=1 GROUP BY c.id, c.name ORDER BY c.id',
      );
      return rows.map(row => ({ ...row, productCount: Number(row.productCount), units: Number(row.units) }));
    },
  };
}
