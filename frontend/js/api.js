export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options, headers: { ...(options.body && !(options.body instanceof FormData) && { 'Content-Type': 'application/json' }), ...options.headers },
    });
  } catch {
    throw new ApiError('Không thể kết nối. Kiểm tra hệ thống rồi thử lại.', 0);
  }
  let body;
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    const error = new ApiError(message || (response.status === 502 || response.status === 503
      ? 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.'
      : 'Yêu cầu chưa được xử lý (' + response.status + ').'), response.status, body.error?.fields);
    error.origin = body.origin || 'backend';
    error.code = body.error?.code;
    throw error;
  }
  return { data: body.data, meta: body.meta, headers: response.headers };
}

function query(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== '' && value != null) params.set(key, value);
  return params.toString();
}

export const api = {
  categories: async () => (await request('/api/categories')).data,
  overview: async () => (await request('/api/overview')).data,
  products: async filters => (await request('/api/products?' + query(filters))).data,
  product: async id => (await request('/api/products/' + id)).data,
  saveProduct: async (id, data) => (await request('/api/products' + (id ? '/' + id : ''), {
    method: id ? 'PUT' : 'POST', body: JSON.stringify(data),
  })).data,
  uploadImage: async (id, file) => {
    const form = new FormData(); form.append('image', file);
    return (await request('/api/products/' + id + '/image', { method: 'POST', body: form })).data;
  },
  movements: async filters => (await request('/api/inventory/movements?' + query(filters))).data,
  move: async data => (await request('/api/inventory/movements', { method: 'POST', body: JSON.stringify(data) })).data,
};
