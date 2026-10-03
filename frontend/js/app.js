import { api } from './api.js';
import { hydrateIcons, errorState } from './ui.js';
import { initActions } from './actions.js';
import { renderOverview } from './pages/overview.js';
import { renderProducts } from './pages/products.js';
import { renderInventory } from './pages/inventory.js';

const view = document.querySelector('#view');
let categories = [];
hydrateIcons();
initActions(() => categories);

async function render() {
  const [path, query = ''] = location.hash.slice(1).split('?');
  const page = ['overview', 'products', 'inventory'].includes(path) ? path : 'overview';
  const names = { overview: 'Tổng quan', products: 'Sản phẩm', inventory: 'Kho hàng' };
  document.title = names[page] + ' — Luma Store';
  document.querySelector('#breadcrumb-current').textContent = names[page];
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  const root = document.createElement('div');
  root.className = 'page-view';
  view.replaceChildren(root);
  try {
    if (!categories.length) categories = await api.categories();
    if (!root.isConnected) return;
    const params = new URLSearchParams(query);
    if (query) history.replaceState(null, '', '#' + page);
    if (page === 'products') await renderProducts(root, categories, params);
    else if (page === 'inventory') await renderInventory(root, categories, params);
    else await renderOverview(root);
  } catch (error) { if (root.isConnected) root.innerHTML = errorState(error); }
}
view.addEventListener('click', event => { if (event.target.closest('[data-retry]')) render(); });
window.addEventListener('hashchange', render);
document.addEventListener('data-changed', render);
render();
