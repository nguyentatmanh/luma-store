import { AppError, notFound } from '../../common/errors.js';
import { transaction } from '../../database/pool.js';

export function createInventoryService({ pool, products, inventory }) {
  return {
    list: filters => inventory.list(filters),
    async move(input) {
      return transaction(pool, async connection => {
        // Lock the row across BOTH backend instances before calculating the balance.
        const product = await products.lock(input.productId, connection);
        if (!product) throw notFound();
        if (!product.is_active) throw new AppError(409, 'ARCHIVED_PRODUCT', 'Khôi phục sản phẩm trước khi nhập/xuất kho.');
        const before = Number(product.stock);
        const after = before + (input.kind === 'in' ? input.quantity : -input.quantity);
        if (after < 0) throw new AppError(409, 'INSUFFICIENT_STOCK', 'Số lượng xuất vượt tồn kho hiện tại (' + before + ').', { quantity: 'Chỉ có thể xuất tối đa ' + before + ' sản phẩm.' });
        if (after > 1000000) throw new AppError(409, 'STOCK_LIMIT', 'Tồn kho tối đa là 1.000.000.');
        const movement = {
          ...input, productName: product.name, stockBefore: before, stockAfter: after,
        };
        await inventory.setStock(product.id, after, connection);
        const id = await inventory.insert(movement, connection);
        return { id, ...movement };
      });
    },
  };
}
