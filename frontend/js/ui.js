const paths = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  box: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v10l9 5 9-5V8M12 13v10M7.5 5.5l9 5"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/>',
  stock: '<path d="M4 7h16v14H4zM2 3h20v4H2zM9 12h6M12 9v6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 15v5h16v-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  warning: '<path d="m12 3 10 18H2L12 3ZM12 9v5M12 17h.01"/>',
  money: '<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
  trend: '<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',
  refresh: '<path d="M20 7a9 9 0 1 0 1 9M20 3v5h-5"/>',
  sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M12 6.5h5M12 17.5h5"/>',
  external: '<path d="M14 3h7v7M21 3l-9 9M10 3H4v17h17v-6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  in: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  out: '<path d="M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
};

export function icon(name, className = '') {
  return '<svg class="icon ' + className + '" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.box) + '</svg>';
}
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
}
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
export const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
export const number = value => new Intl.NumberFormat('vi-VN').format(value);
export const dateTime = value => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export function badge(product) {
  if (!product.isActive) return '<span class="badge badge-muted">Ngừng bán</span>';
  if (!product.stock) return '<span class="badge badge-danger"><span></span>Hết hàng</span>';
  if (product.stock <= product.lowStockAt) return '<span class="badge badge-warning"><span></span>Sắp hết</span>';
  return '<span class="badge badge-success"><span></span>Còn hàng</span>';
}
export function productCell(product) {
  return '<div class="product-cell"><img class="product-thumb" src="' + esc(product.imageUrl) + '" alt="" loading="lazy"><div><strong>' + esc(product.name) + '</strong><small>' + esc(product.sku) + '</small></div></div>';
}
export function productActions(product) {
  return '<div class="row-actions"><button class="icon-button" data-edit="' + product.id + '" title="Sửa sản phẩm" aria-label="Sửa ' + esc(product.name) + '">' + icon('edit') + '</button>' +
    (product.isActive ? '<button class="icon-button" data-stock="' + product.id + '" title="Nhập / xuất kho" aria-label="Nhập xuất ' + esc(product.name) + '">' + icon('stock') + '</button>' : '') + '</div>';
}
export function movementBadge(kind) {
  const values = { opening: ['muted', 'Tồn đầu kỳ'], in: ['success', 'Nhập kho'], out: ['warning', 'Xuất kho'] };
  const [style, label] = values[kind] || values.opening;
  return '<span class="badge badge-' + style + '">' + label + '</span>';
}
export function emptyState(title, description, action = '') {
  return '<div class="empty-state"><div class="empty-icon">' + icon('box') + '</div><h3>' + esc(title) + '</h3><p>' + esc(description) + '</p>' + action + '</div>';
}
export function loading() {
  return '<div class="loading-state" role="status" aria-label="Đang tải"><div class="skeleton skeleton-heading"></div>' + [1, 2, 3, 4].map(() => '<div class="skeleton skeleton-row"></div>').join('') + '<span class="visually-hidden">Đang tải dữ liệu…</span></div>';
}
export function errorState(error) {
  return '<div class="error-state" role="alert">' + icon('warning') + '<h3>Chưa tải được dữ liệu</h3><p>' + esc(error.message) + '</p><button class="button button-secondary" data-retry>' + icon('refresh') + 'Thử lại</button></div>';
}
export function toast(message, kind = 'success') {
  const item = document.createElement('div');
  item.className = 'toast toast-' + kind;
  item.innerHTML = icon(kind === 'success' ? 'check' : 'warning') + '<span>' + esc(message) + '</span>';
  document.querySelector('#toast-region').replaceChildren(item);
  setTimeout(() => item.remove(), 4500);
}
export function busy(button, working, label) {
  if (working) {
    button.dataset.label = button.textContent;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span>' + esc(label || 'Đang lưu…');
  } else {
    button.disabled = false;
    button.textContent = button.dataset.label;
  }
}
export function clearErrors(form, alert) {
  alert.classList.add('hidden'); alert.textContent = '';
  form.querySelectorAll('[data-error-for]').forEach(element => { element.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
}
export function formError(form, alert, error) {
  alert.textContent = error.message; alert.classList.remove('hidden');
  for (const [field, message] of Object.entries(error.fields || {})) {
    const output = form.querySelector('[data-error-for="' + field + '"]');
    if (output) output.textContent = message;
    form.elements.namedItem(field)?.setAttribute('aria-invalid', 'true');
  }
  form.querySelector('[aria-invalid="true"]')?.focus();
}
export function pagination(result) {
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const from = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = Math.min(result.page * result.pageSize, result.total);
  return '<div class="pagination"><span>Hiển thị <strong>' + from + '–' + to + '</strong> trên ' + number(result.total) + '</span><div><button class="icon-button" data-page="' + (result.page - 1) + '" aria-label="Trang trước" ' + (result.page === 1 ? 'disabled' : '') + '>' + icon('chevron', 'rotate') + '</button><span>Trang ' + result.page + ' / ' + pages + '</span><button class="icon-button" data-page="' + (result.page + 1) + '" aria-label="Trang tiếp" ' + (result.page >= pages ? 'disabled' : '') + '>' + icon('chevron') + '</button></div></div>';
}
