import { api } from '../api.js';
import { esc, icon, money, number, badge, productCell, movementBadge, dateTime, loading, errorState, emptyState } from '../ui.js';

export async function renderOverview(root) {
  root.innerHTML = '<div class="page-heading"><div><span class="eyebrow">MỘT NGÀY LÀM VIỆC GỌN GÀNG</span><h1>Tổng quan cửa hàng</h1><p>Theo dõi sản phẩm và hàng tồn trong cùng một nơi.</p></div><button class="button button-primary" data-add>' + icon('plus') + 'Thêm sản phẩm</button></div>' +
    '<div id="overview-content">' + loading() + '</div>';
  const content = root.querySelector('#overview-content');
  try {
    const data = await api.overview();
    if (!root.isConnected) return;
    const { metrics, categories, lowStock, recentMovements } = data;
    const stats = [
      ['box', 'Sản phẩm đang bán', number(metrics.activeProducts), 'Mã sản phẩm trong cửa hàng', 'purple'],
      ['layers', 'Tổng lượng tồn', number(metrics.totalUnits), 'Đơn vị hàng đang có trong kho', 'blue'],
      ['money', 'Giá trị hàng tồn', money(metrics.inventoryValue), 'Tính theo giá bán hiện tại', 'green'],
      ['warning', 'Cần bổ sung', number(metrics.lowStockProducts), 'Sản phẩm chạm ngưỡng cảnh báo', 'orange'],
    ];
    content.innerHTML = '<div class="welcome-panel"><div><span class="welcome-label">' + icon('sparkle') + 'LUMA STORE</span><h2>Mọi sản phẩm,<br>trong tầm tay.</h2><p>Một thay đổi nhỏ. Một cửa hàng ngăn nắp hơn.</p><a href="#products" class="welcome-action">Quản lý sản phẩm ' + icon('arrow') + '</a></div><div class="welcome-art" aria-hidden="true"><div class="art-circle"></div><img src="/assets/products/headphones.svg" class="art-headphones" alt=""><img src="/assets/products/lamp.svg" class="art-lamp" alt=""><span class="art-label">' + icon('check') + 'Sẵn sàng cho hôm nay</span></div></div>' +
      '<div class="stats-grid">' + stats.map(([name, label, value, detail, color]) => '<article class="stat-card"><span class="stat-icon ' + color + '">' + icon(name) + '</span><span class="stat-label">' + label + '</span><strong>' + value + '</strong><small>' + detail + '</small></article>').join('') + '</div>' +
      '<div class="overview-grid"><section class="panel"><div class="panel-head"><div><h2>Cần thêm một chút hàng</h2><p>Ưu tiên sản phẩm sắp hết hoặc hết hàng.</p></div><a class="text-link" href="#products?stock=low">Xem tất cả ' + icon('arrow') + '</a></div>' +
      (lowStock.length ? '<div class="attention-list">' + lowStock.map(product => '<div class="attention-row">' + productCell(product) + '<div class="attention-stock">' + badge(product) + '<small>Còn ' + product.stock + ' · ngưỡng ' + product.lowStockAt + '</small></div><button class="button button-secondary button-small" data-stock="' + product.id + '" data-kind="in">' + icon('plus') + 'Nhập kho</button></div>').join('') + '</div>' : emptyState('Kho hàng đang ổn', 'Các sản phẩm đều có lượng tồn trên ngưỡng cảnh báo.')) +
      '</section><section class="panel"><div class="panel-head"><div><h2>Cửa hàng có gì?</h2><p>Số sản phẩm theo danh mục.</p></div>' + icon('layers') + '</div><div class="category-list">' +
      categories.map((category, index) => '<a href="#products?categoryId=' + category.id + '" class="category-row"><div><span class="category-dot dot-' + index + '"></span><strong>' + esc(category.name) + '</strong><span>' + category.productCount + ' sản phẩm</span></div><div class="category-track"><span class="bar-' + index + '" style="width:' + Math.max(4, category.productCount / Math.max(1, metrics.activeProducts) * 100) + '%"></span></div><small>' + number(category.units) + ' đơn vị trong kho</small></a>').join('') +
      '</div><div class="panel-note">' + icon('info') + 'Chỉ tính sản phẩm đang kinh doanh.</div></section></div>' +
      '<section class="panel activity-panel"><div class="panel-head"><div><h2>Chuyển động gần đây</h2><p>Mỗi lần nhập hoặc xuất đều có lịch sử.</p></div><a class="text-link" href="#inventory?tab=history">Xem lịch sử ' + icon('arrow') + '</a></div>' +
      (recentMovements.length ? '<div class="table-scroll"><table><thead><tr><th>Sản phẩm</th><th>Loại phiếu</th><th class="align-right">Số lượng</th><th>Ghi chú</th><th>Thời gian</th></tr></thead><tbody>' +
        recentMovements.map(item => '<tr><td><strong>' + esc(item.productName) + '</strong><small class="cell-subtitle">' + esc(item.sku) + '</small></td><td>' + movementBadge(item.kind) + '</td><td class="align-right movement-' + item.kind + '">' + (item.kind === 'out' ? '−' : '+') + number(item.quantity) + '</td><td class="note-cell">' + esc(item.note || '—') + '</td><td class="date-cell">' + dateTime(item.createdAt) + '</td></tr>').join('') +
        '</tbody></table></div>' : emptyState('Chưa có phiếu kho', 'Thêm sản phẩm hoặc nhập hàng để bắt đầu.')) + '</section>';
  } catch (error) { if (root.isConnected) content.innerHTML = errorState(error); }
}
