export function createOverviewService({ overview, productService, inventory }) {
  return {
    async get() {
      const [metrics, categories, lowStock, movements] = await Promise.all([
        overview.metrics(), overview.categoryBreakdown(),
        productService.list({ page: 1, pageSize: 6, status: 'active', stock: 'low', sort: 'stockAsc', q: '' }),
        inventory.list({ page: 1, pageSize: 5 }),
      ]);
      return { metrics, categories, lowStock: lowStock.items, recentMovements: movements.items };
    },
  };
}
