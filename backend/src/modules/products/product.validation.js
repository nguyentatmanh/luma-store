import { validationError } from '../../common/errors.js';

export function productId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw validationError({ id: 'ID không hợp lệ.' });
  return id;
}

function text(value, maximum) {
  return typeof value === 'string' ? value.trim().slice(0, maximum + 1) : '';
}

export function productInput(body, creating = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validationError({ body: 'Dữ liệu phải là một đối tượng JSON.' });
  const fields = {};
  const input = {
    sku: text(body.sku, 32).toUpperCase(),
    name: text(body.name, 160),
    description: text(body.description, 1000),
    categoryId: body.categoryId,
    price: body.price,
    lowStockAt: body.lowStockAt,
    isActive: body.isActive,
  };
  if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(input.sku)) fields.sku = 'SKU gồm 2–32 chữ, số, dấu - hoặc _.';
  if (input.name.length < 2 || input.name.length > 160) fields.name = 'Tên sản phẩm gồm 2–160 ký tự.';
  if (input.description.length > 1000) fields.description = 'Mô tả tối đa 1.000 ký tự.';
  if (!Number.isInteger(input.categoryId) || input.categoryId < 1) fields.categoryId = 'Chọn danh mục.';
  if (!Number.isInteger(input.price) || input.price < 0 || input.price > 1000000000) fields.price = 'Giá từ 0 đến 1 tỷ đồng, không có phần lẻ.';
  if (!Number.isInteger(input.lowStockAt) || input.lowStockAt < 0 || input.lowStockAt > 1000000) fields.lowStockAt = 'Ngưỡng từ 0 đến 1.000.000.';
  if (typeof input.isActive !== 'boolean') fields.isActive = 'Trạng thái không hợp lệ.';
  if (creating) {
    input.stock = body.stock;
    if (!Number.isInteger(input.stock) || input.stock < 0 || input.stock > 1000000) fields.stock = 'Tồn đầu kỳ từ 0 đến 1.000.000.';
  } else if (Object.hasOwn(body, 'stock')) {
    fields.stock = 'Sử dụng chức năng nhập/xuất để thay đổi tồn kho.';
  }
  if (Object.keys(fields).length) throw validationError(fields);
  return input;
}

export function productQuery(query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 8);
  if (!Number.isInteger(page) || page < 1 || page > 100000 ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw validationError({ page: 'Phân trang không hợp lệ.' });
  }
  const categoryId = query.categoryId ? productId(query.categoryId) : null;
  const status = query.status || 'active';
  const stock = query.stock || 'all';
  const sort = query.sort || 'newest';
  if (!['active', 'archived', 'all'].includes(status) ||
      !['all', 'low', 'out'].includes(stock) ||
      !['newest', 'name', 'priceAsc', 'priceDesc', 'stockAsc'].includes(sort)) {
    throw validationError({ filters: 'Bộ lọc không hợp lệ.' });
  }
  return { page, pageSize, categoryId, status, stock, sort, q: text(query.q, 100) };
}
