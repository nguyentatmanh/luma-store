import assert from 'node:assert/strict';
import { imageFixture } from '../tests/image-fixture.mjs';

const base = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
let testProduct;
const checks = [];
function pass(message) { checks.push(message); console.log('PASS: ' + message); }
async function call(path, options = {}) {
  const response = await fetch(base + path, {
    ...options, headers: { ...(typeof options.body === 'string' && { 'Content-Type': 'application/json' }), ...options.headers },
  });
  const body = await response.json();
  return { response, body, status: response.status, data: body.data };
}
const post = (path, body) => call(path, { method: 'POST', body: JSON.stringify(body) });
const put = (path, body) => call(path, { method: 'PUT', body: JSON.stringify(body) });

try {
  assert.equal((await call('/api/health')).status, 200);
  const servers = new Set();
  for (let i = 0; i < 12; i++) {
    const { response, data } = await call('/api/server-info');
    servers.add(data.serverId);
    assert.equal(response.headers.get('x-backend-id'), data.serverId);
    assert.ok(data.receivedHeaders.xForwardedFor);
    assert.equal(data.receivedHeaders.xForwardedProto, base.startsWith('https:') ? 'https' : 'http');
  }
  assert.deepEqual(servers, new Set(['BACKEND-01', 'BACKEND-02']));
  pass('Proxy headers and both backend instances');
  const categories = (await call('/api/categories')).data;
  const listing = await call('/api/products?pageSize=3');
  assert.equal(listing.data.items.length, Math.min(3, listing.data.total));
  assert.ok((await call('/api/overview')).data.metrics.activeProducts >= 1);
  assert.equal((await call('/api/products?page=-1')).status, 422);
  assert.equal((await call('/api/missing')).status, 404);
  pass('Overview, categories, pagination, validation and API 404');

  const payload = {
    sku: 'QA-' + Date.now(), name: 'Sản phẩm kiểm tra ' + Date.now(),
    description: 'Do smoke test tạo. Sẽ ngừng kinh doanh sau khi kiểm tra.',
    categoryId: categories[0].id, price: 99000, stock: 7, lowStockAt: 3, isActive: true,
  };
  const created = await post('/api/products', payload);
  assert.equal(created.status, 201);
  testProduct = created.data;
  const path = '/api/products/' + testProduct.id;
  assert.equal((await call(path)).data.stock, 7);
  assert.equal((await post('/api/products', payload)).status, 409);
  const { stock, ...metadata } = payload;
  const updated = await put(path, { ...metadata, name: payload.name + ' đã sửa', price: 119000 });
  assert.equal(updated.status, 200); testProduct = updated.data;
  assert.equal(testProduct.price, 119000);
  assert.equal((await put(path, { ...metadata, stock: 999 })).status, 422);
  pass('Create, read, update, duplicate SKU and stock cannot be changed via metadata');

  const inward = await post('/api/inventory/movements', { productId: testProduct.id, kind: 'in', quantity: 3, note: 'QA nhập' });
  assert.equal(inward.status, 201); assert.equal(inward.data.stockAfter, 10);
  const outbound = { productId: testProduct.id, kind: 'out', quantity: 8, note: 'QA xuất đồng thời' };
  const concurrent = await Promise.all([post('/api/inventory/movements', outbound), post('/api/inventory/movements', outbound)]);
  assert.deepEqual(concurrent.map(result => result.status).sort(), [201, 409]);
  assert.equal((await call(path)).data.stock, 2);
  const movements = (await call('/api/inventory/movements?productId=' + testProduct.id)).data.items;
  assert.equal(movements.length, 3);
  assert.equal(movements[0].stockBefore, 10); assert.equal(movements[0].stockAfter, 2);
  pass('Concurrent outbound requests cannot oversell; balance and movement commit together');

  const form = new FormData(); form.append('image', new Blob([imageFixture()], { type: 'image/png' }), 'qa-image.png');
  const uploaded = await call(path + '/image', { method: 'POST', body: form });
  assert.equal(uploaded.status, 200, 'Run at stage 4 (20M) for the image >1 MiB');
  assert.match(uploaded.data.imageUrl, /^\/media\/[a-f0-9-]+\.webp$/);
  const sharedImage = await fetch(base + uploaded.data.imageUrl);
  assert.equal(sharedImage.status, 200);
  assert.ok(sharedImage.headers.get('content-type').includes('image/webp'));
  const invalid = new FormData(); invalid.append('image', new Blob(['not an image']), 'fake.png');
  assert.equal((await call(path + '/image', { method: 'POST', body: invalid })).status, 422);
  pass('Image >1 MiB stored as WebP and served by NGINX; invalid image rejected');
  console.log('\n' + checks.length + ' groups passed. Test product #' + testProduct.id + ' will be archived.');
} catch (error) {
  console.error('FAIL:', error.message); process.exitCode = 1;
} finally {
  if (testProduct) {
    const { id, sku, name, description, categoryId, price, lowStockAt } = testProduct;
    try {
      const result = await put('/api/products/' + id, { sku, name, description, categoryId, price, lowStockAt, isActive: false });
      assert.equal(result.status, 200);
      assert.equal((await post('/api/inventory/movements', { productId: id, kind: 'in', quantity: 1, note: '' })).status, 409);
      console.log('CLEANUP: test product archived; history kept.');
    } catch (error) { console.error('CLEANUP:', error.message); process.exitCode = 1; }
  }
}
