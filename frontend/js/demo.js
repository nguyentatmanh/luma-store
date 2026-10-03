import { api, request } from './api.js';
import { hydrateIcons, esc, busy, icon } from './ui.js';

hydrateIcons();
const history = [];
const counts = { 'BACKEND-01': 0, 'BACKEND-02': 0 };
const status = document.querySelector('#call-status');
const once = document.querySelector('#call-once');
const many = document.querySelector('#call-many');
let running = false;

async function loadStage() {
  const response = await fetch('/demo-stage.json', { cache: 'no-store' });
  const stage = await response.json();
  document.querySelector('#stage-badge').textContent = 'Bước ' + stage.stage + ' · ' + stage.name +
    (stage.name.includes(stage.bodyLimit) ? '' : ' · ' + stage.bodyLimit);
}
async function loadProducts() {
  try {
    const data = await api.products({ status: 'all', pageSize: 100, sort: 'name' });
    document.querySelector('#upload-product').innerHTML = '<option value="">Chọn sản phẩm</option>' + data.items.map(product => '<option value="' + product.id + '">' + esc(product.name) + ' · ' + esc(product.sku) + '</option>').join('');
  } catch {
    document.querySelector('#upload-product').innerHTML = '<option value="">API chưa sẵn sàng ở cấu hình này</option>';
  }
}
function draw() {
  document.querySelector('#count-01').textContent = counts['BACKEND-01'];
  document.querySelector('#count-02').textContent = counts['BACKEND-02'];
  document.querySelector('#request-history').innerHTML = history.slice(-20).reverse().map(item => '<tr><td>' + item.index + '</td><td>' + esc(item.backend) + '</td><td>' + item.status + '</td><td>' + item.ms + ' ms</td></tr>').join('');
}
async function call(amount) {
  if (running) return;
  running = true; once.disabled = true; many.disabled = true;
  let errors = 0;
  for (let i = 0; i < amount; i++) {
    const start = performance.now();
    try {
      const result = await request('/api/server-info');
      const id = result.data.serverId;
      if (Object.hasOwn(counts, id)) counts[id]++;
      history.push({ index: history.length + 1, backend: id, status: 200, ms: Math.round(performance.now() - start) });
      const headers = { 'X-Backend-Id (response)': result.headers.get('x-backend-id'), 'X-Request-Id (response)': result.meta.requestId, ...result.data.receivedHeaders };
      document.querySelector('#proxy-headers').innerHTML = Object.entries(headers).map(([key, value]) => '<dt>' + esc(key) + '</dt><dd>' + esc(value || '(không có)') + '</dd>').join('');
    } catch (error) {
      errors++;
      history.push({ index: history.length + 1, backend: '—', status: error.status || 'Network', ms: Math.round(performance.now() - start) });
      status.textContent = error.message;
    }
    draw();
    if (!errors) status.textContent = 'Đã gọi ' + (i + 1) + '/' + amount + ' request.';
  }
  status.textContent = 'Hoàn tất ' + amount + ' request · ' + (amount - errors) + ' thành công · ' + errors + ' lỗi.';
  running = false; once.disabled = false; many.disabled = false;
}
once.addEventListener('click', () => call(1));
many.addEventListener('click', () => call(20));
document.querySelector('#reset-history').addEventListener('click', () => {
  if (running) return;
  history.length = 0; counts['BACKEND-01'] = counts['BACKEND-02'] = 0; draw();
  status.textContent = 'Đã xóa lịch sử quan sát. Dữ liệu cửa hàng được giữ nguyên.';
});
document.querySelector('#demo-upload-form').addEventListener('submit', async event => {
  event.preventDefault();
  const id = document.querySelector('#upload-product').value;
  const file = document.querySelector('#upload-file').files[0];
  if (!id || !file) return;
  const output = document.querySelector('#upload-result');
  const button = document.querySelector('#upload-submit');
  busy(button, true, 'Đang tải…');
  output.className = 'upload-result';
  output.textContent = 'Đang gửi ' + (file.size / 1024 / 1024).toFixed(2) + ' MB qua NGINX…';
  try {
    const form = new FormData(); form.append('image', file);
    const result = await request('/api/products/' + id + '/image', { method: 'POST', body: form });
    output.classList.add('success');
    output.innerHTML = icon('check') + ' HTTP 200 · ' + esc(result.meta.serverId) + ' đã lưu ảnh. Mở cửa hàng để xem thay đổi.<img src="' + esc(result.data.imageUrl) + '" alt="Ảnh vừa tải">';
  } catch (error) {
    output.classList.add('error');
    output.textContent = 'HTTP ' + error.status + ' · ' + error.message +
      (error.status === 413 && error.origin === 'nginx' ? ' Chuyển sang stage 4 rồi thử lại cùng ảnh.' : '');
  } finally { busy(button, false); }
});
loadStage().catch(() => { document.querySelector('#stage-badge').textContent = 'Không đọc được cấu hình NGINX'; });
loadProducts();
