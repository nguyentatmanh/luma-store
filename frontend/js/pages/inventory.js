import { api } from '../api.js';
import { esc, icon, number, badge, productCell, movementBadge, dateTime, pagination, loading, errorState, emptyState } from '../ui.js';

const state = { tab: 'stock', page: 1, q: '', stock: 'all', productId: '' };

export async function renderInventory(root, categories, params) {
  if (params.has('tab')) { state.tab = params.get('tab') === 'history' ? 'history' : 'stock'; state.page = 1; }
  root.innerHTML = '<div class="page-heading"><div><span class="eyebrow">HÀNG HÓA LUÔN RÕ RÀNG</span><h1>Kho hàng</h1><p>Nhập, xuất và theo dõi từng thay đổi tồn kho.</p></div><a href="#products" class="button button-secondary">' + icon('box') + 'Danh sách sản phẩm</a></div><div class="inventory-tip">' + icon('info') + '<span>Tạo phiếu từ một sản phẩm để cập nhật tồn kho. Lịch sử được lưu ngay khi phiếu hoàn tất.</span></div><section class="panel"><div class="inventory-tabs" role="group" aria-label="Nội dung kho"><button data-tab="stock">Tồn kho hiện tại</button><button data-tab="history">Lịch sử nhập / xuất</button></div><div id="inventory-toolbar"></div><div id="inventory-result">' + loading() + '</div></section>';
  const toolbar = root.querySelector('#inventory-toolbar');
  const result = root.querySelector('#inventory-result');
  let generation = 0;
  let timer;
  let choices = [];
  async function buildToolbar() {
    root.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === state.tab));
    if (state.tab === 'stock') {
      toolbar.innerHTML = '<div class="filter-toolbar"><div class="search-field">' + icon('search') + '<input type="search" id="inventory-search" placeholder="Tìm sản phẩm trong kho…" aria-label="Tìm sản phẩm trong kho" value="' + esc(state.q) + '"></div><select id="inventory-stock-filter" aria-label="Lọc tồn kho"><option value="all">Tất cả tồn kho</option><option value="low">Cần bổ sung</option><option value="out">Hết hàng</option></select></div>';
      toolbar.querySelector('select').value = state.stock;
    } else {
      toolbar.innerHTML = '<div class="filter-toolbar"><p class="toolbar-caption">Phiếu mới nhất hiển thị trước.</p><select id="history-product" aria-label="Lọc lịch sử theo sản phẩm"><option value="">Tất cả sản phẩm</option>' + choices.map(product => '<option value="' + product.id + '">' + esc(product.name) + '</option>').join('') + '</select></div>';
      toolbar.querySelector('select').value = state.productId;
    }
  }
  async function load() {
    const token = ++generation;
    result.innerHTML = loading();
    try {
      const data = state.tab === 'stock'
        ? await api.products({ q: state.q, stock: state.stock, status: 'active', sort: 'stockAsc', page: state.page, pageSize: 8 })
        : await api.movements({ productId: state.productId, page: state.page, pageSize: 10 });
      if (!root.isConnected || token !== generation) return;
      const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
      if (state.page > pages) { state.page = pages; return load(); }
      result.innerHTML = !data.items.length
        ? emptyState(state.tab === 'stock' ? 'Chưa có sản phẩm phù hợp' : 'Chưa có phiếu kho', 'Thử đổi bộ lọc hoặc tạo phiếu nhập hàng.') + pagination(data)
        : state.tab === 'stock' ? '<div class="table-scroll"><table><thead><tr><th>Sản phẩm</th><th class="align-right">Tồn hiện tại</th><th class="align-right">Ngưỡng cảnh báo</th><th>Tình trạng</th><th class="align-right">Tạo phiếu</th></tr></thead><tbody>' +
          data.items.map(product => '<tr><td>' + productCell(product) + '</td><td class="align-right stock-cell">' + number(product.stock) + '</td><td class="align-right muted">' + number(product.lowStockAt) + '</td><td>' + badge(product) + '</td><td><div class="row-actions"><button class="button button-secondary button-small" data-stock="' + product.id + '" data-kind="in">' + icon('in') + 'Nhập</button><button class="button button-secondary button-small" data-stock="' + product.id + '" data-kind="out">' + icon('out') + 'Xuất</button></div></td></tr>').join('') + '</tbody></table></div>' + pagination(data) :
          '<div class="table-scroll"><table class="history-table"><thead><tr><th>Phiếu / thời gian</th><th>Sản phẩm</th><th>Loại</th><th class="align-right">Số lượng</th><th class="align-right">Tồn trước → sau</th><th>Ghi chú</th></tr></thead><tbody>' +
          data.items.map(item => '<tr><td><strong>PK-' + String(item.id).padStart(4, '0') + '</strong><small class="cell-subtitle date-cell">' + dateTime(item.createdAt) + '</small></td><td><strong>' + esc(item.productName) + '</strong><small class="cell-subtitle">' + esc(item.sku) + '</small></td><td>' + movementBadge(item.kind) + '</td><td class="align-right movement-' + item.kind + '">' + (item.kind === 'out' ? '−' : '+') + number(item.quantity) + '</td><td class="align-right">' + number(item.stockBefore) + ' <span class="muted">→</span> <strong>' + number(item.stockAfter) + '</strong></td><td class="note-cell">' + esc(item.note || '—') + '</td></tr>').join('') + '</tbody></table></div>' + pagination(data);
    } catch (error) { if (root.isConnected && token === generation) result.innerHTML = errorState(error); }
  }
  root.addEventListener('click', event => {
    const tab = event.target.closest('[data-tab]');
    if (tab) { state.tab = tab.dataset.tab; state.page = 1; buildToolbar(); load(); }
    const page = event.target.closest('[data-page]');
    if (page) { state.page = Number(page.dataset.page); load(); }
  });
  root.addEventListener('input', event => {
    if (event.target.id !== 'inventory-search') return;
    state.q = event.target.value; state.page = 1;
    clearTimeout(timer); timer = setTimeout(load, 250);
  });
  root.addEventListener('change', event => {
    if (event.target.id === 'inventory-stock-filter') { state.stock = event.target.value; state.page = 1; load(); }
    if (event.target.id === 'history-product') { state.productId = event.target.value; state.page = 1; load(); }
  });
  // A small store list populates the optional history filter; inventory itself remains paginated.
  try { choices = (await api.products({ status: 'all', sort: 'name', pageSize: 100 })).items; } catch {}
  if (!root.isConnected) return;
  await buildToolbar(); await load();
}
