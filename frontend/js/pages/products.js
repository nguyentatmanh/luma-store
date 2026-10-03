import { api } from '../api.js';
import { esc, icon, money, number, badge, productCell, productActions, pagination, loading, errorState, emptyState } from '../ui.js';

const state = { q: '', categoryId: '', status: 'active', stock: 'all', sort: 'newest', page: 1, pageSize: 8, layout: 'table' };

export async function renderProducts(root, categories, params) {
  if (params.has('stock')) { state.stock = params.get('stock'); state.page = 1; }
  if (params.has('categoryId')) { state.categoryId = params.get('categoryId'); state.page = 1; }
  root.innerHTML = '<div class="page-heading"><div><span class="eyebrow">DANH MỤC CỦA CỬA HÀNG</span><h1>Sản phẩm</h1><p>Thông tin rõ ràng, tìm món hàng dễ dàng.</p></div><button class="button button-primary" data-add>' + icon('plus') + 'Thêm sản phẩm</button></div>' +
    '<section class="panel products-panel"><div class="filter-toolbar"><div class="search-field">' + icon('search') + '<input type="search" id="product-search" aria-label="Tìm tên hoặc mã SKU" placeholder="Tìm tên hoặc mã SKU…" value="' + esc(state.q) + '"></div><div class="view-toggle" role="group" aria-label="Kiểu hiển thị"><button class="icon-button ' + (state.layout === 'table' ? 'selected' : '') + '" data-layout="table" aria-label="Dạng bảng">' + icon('list') + '</button><button class="icon-button ' + (state.layout === 'grid' ? 'selected' : '') + '" data-layout="grid" aria-label="Dạng thẻ">' + icon('grid') + '</button></div></div>' +
    '<div class="filter-row"><div class="field compact"><label for="filter-category">Danh mục</label><select id="filter-category" data-filter="categoryId"><option value="">Tất cả danh mục</option>' + categories.map(category => '<option value="' + category.id + '">' + esc(category.name) + '</option>').join('') + '</select></div><div class="field compact"><label for="filter-stock">Tồn kho</label><select id="filter-stock" data-filter="stock"><option value="all">Tất cả tồn kho</option><option value="low">Sắp hết / hết hàng</option><option value="out">Hết hàng</option></select></div><div class="field compact"><label for="filter-status">Trạng thái</label><select id="filter-status" data-filter="status"><option value="active">Đang kinh doanh</option><option value="archived">Ngừng kinh doanh</option><option value="all">Tất cả trạng thái</option></select></div><div class="field compact"><label for="filter-sort">Sắp xếp</label><select id="filter-sort" data-filter="sort"><option value="newest">Mới nhất</option><option value="name">Tên A → Z</option><option value="priceAsc">Giá tăng dần</option><option value="priceDesc">Giá giảm dần</option><option value="stockAsc">Tồn kho thấp nhất</option></select></div><button class="text-button" id="reset-filters">Xóa bộ lọc</button></div><div id="products-result">' + loading() + '</div></section>';
  root.querySelectorAll('[data-filter]').forEach(select => { select.value = state[select.dataset.filter]; });
  const result = root.querySelector('#products-result');
  let generation = 0;
  let timer;
  let currentData;
  function draw(data) {
    const items = data.items;
    result.innerHTML = '<div class="result-label"><strong>' + number(data.total) + ' sản phẩm</strong><span>' + (state.status === 'archived' ? 'Sửa trạng thái để kinh doanh lại.' : 'Cập nhật ảnh và thông tin qua nút chỉnh sửa.') + '</span></div>' +
      (!items.length ? emptyState('Chưa thấy sản phẩm nào', 'Thử từ khóa khác hoặc xóa bộ lọc.', '<button class="button button-secondary" data-reset-result>Xóa bộ lọc</button>') :
        state.layout === 'table' ? '<div class="table-scroll"><table class="product-table"><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th class="align-right">Giá bán</th><th class="align-right">Tồn kho</th><th>Trạng thái</th><th class="align-right">Thao tác</th></tr></thead><tbody>' +
          items.map(product => '<tr><td>' + productCell(product) + '</td><td><span class="category-label">' + esc(product.categoryName) + '</span></td><td class="align-right price-cell">' + money(product.price) + '</td><td class="align-right stock-cell">' + number(product.stock) + '</td><td>' + badge(product) + '</td><td>' + productActions(product) + '</td></tr>').join('') + '</tbody></table></div>' :
          '<div class="product-grid">' + items.map(product => '<article class="product-card"><div class="product-image"><img src="' + esc(product.imageUrl) + '" alt="' + esc(product.name) + '" loading="lazy">' + badge(product) + '</div><div class="product-card-body"><small>' + esc(product.categoryName) + ' · ' + esc(product.sku) + '</small><h3>' + esc(product.name) + '</h3><strong class="card-price">' + money(product.price) + '</strong><div class="product-card-bottom"><span>Tồn kho <strong>' + number(product.stock) + '</strong></span>' + productActions(product) + '</div></div></article>').join('') + '</div>') + pagination(data);
  }
  async function load() {
    const token = ++generation;
    result.innerHTML = loading();
    try {
      const data = await api.products(state);
      if (!root.isConnected || token !== generation) return;
      const pages = Math.max(1, Math.ceil(data.total / state.pageSize));
      if (state.page > pages) { state.page = pages; return load(); }
      currentData = data; draw(data);
    } catch (error) { if (root.isConnected && token === generation) result.innerHTML = errorState(error); }
  }
  function reset() {
    Object.assign(state, { q: '', categoryId: '', status: 'active', stock: 'all', sort: 'newest', page: 1 });
    root.querySelector('#product-search').value = '';
    root.querySelectorAll('[data-filter]').forEach(select => { select.value = state[select.dataset.filter]; });
    load();
  }
  root.querySelector('#product-search').addEventListener('input', event => {
    state.q = event.target.value; state.page = 1;
    clearTimeout(timer); timer = setTimeout(load, 250);
  });
  root.addEventListener('change', event => {
    if (event.target.dataset.filter) { state[event.target.dataset.filter] = event.target.value; state.page = 1; load(); }
  });
  root.addEventListener('click', event => {
    const page = event.target.closest('[data-page]');
    if (page) { state.page = Number(page.dataset.page); load(); }
    if (event.target.closest('#reset-filters, [data-reset-result]')) reset();
    const layout = event.target.closest('[data-layout]');
    if (layout) {
      state.layout = layout.dataset.layout;
      root.querySelectorAll('[data-layout]').forEach(button => button.classList.toggle('selected', button === layout));
      if (currentData) draw(currentData);
    }
  });
  await load();
}
