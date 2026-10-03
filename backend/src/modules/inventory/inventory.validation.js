import { validationError } from '../../common/errors.js';
import { productId } from '../products/product.validation.js';

export function movementInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validationError({ body: 'Dữ liệu phải là một đối tượng JSON.' });
  const fields = {};
  const input = {
    productId: productId(body.productId),
    kind: body.kind,
    quantity: body.quantity,
    note: typeof body.note === 'string' ? body.note.trim() : '',
  };
  if (!['in', 'out'].includes(input.kind)) fields.kind = 'Chọn nhập kho hoặc xuất kho.';
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 1000000) fields.quantity = 'Số lượng từ 1 đến 1.000.000.';
  if (input.note.length > 300) fields.note = 'Ghi chú tối đa 300 ký tự.';
  if (Object.keys(fields).length) throw validationError(fields);
  return input;
}

export function movementQuery(query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 10);
  if (!Number.isInteger(page) || page < 1 || page > 100000 ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw validationError({ page: 'Phân trang không hợp lệ.' });
  }
  return { page, pageSize, productId: query.productId ? productId(query.productId) : null };
}
