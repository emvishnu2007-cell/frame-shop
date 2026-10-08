const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'frameshop_admin_token';

export class ApiError extends Error {
  constructor(message, status, code, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields || {};
  }
}

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

async function request(path, { method = 'GET', body, auth = false, form } = {}) {
  const headers = {};
  if (auth) {
    const t = tokenStore.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError('Cannot reach the server. Please check your connection and try again.', 0, 'NETWORK');
  }

  const isPdf = (res.headers.get('content-type') || '').includes('application/pdf');
  if (res.ok && isPdf) return res.blob();

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }

  if (!res.ok) {
    const err = data && data.error ? data.error : {};
    if (res.status === 401 && auth) {
      tokenStore.clear();
      window.dispatchEvent(new Event('frameshop:logout'));
    }
    if (err.code === 'PASSWORD_CHANGE_REQUIRED') window.dispatchEvent(new Event('frameshop:password-required'));
    throw new ApiError(err.message || 'Something went wrong. Please try again.', res.status, err.code, err.fields);
  }
  return data;
}

const qs = (params = {}) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.set(k, v); });
  const str = s.toString();
  return str ? `?${str}` : '';
};

export const api = {
  // public
  settings: () => request('/api/settings'),
  reviews: () => request('/api/reviews'),
  categories: () => request('/api/categories'),
  frames: (params) => request(`/api/frames${qs(params)}`),
  frame: (id) => request(`/api/frames/${id}`),
  quote: (items, couponCode) => request('/api/orders/quote', { method: 'POST', body: { items, couponCode: couponCode || null } }),
  createOrder: (payload) => request('/api/orders', { method: 'POST', body: payload }),
  trackOrder: (orderId, phone) => request(`/api/orders/track${qs({ orderId, phone })}`),
  receipt: (orderId, phone) => request(`/api/orders/${encodeURIComponent(orderId)}/receipt${qs({ phone })}`),
  uploadPhoto: (file) => { const f = new FormData(); f.append('file', file); return request('/api/upload', { method: 'POST', form: f }); },
  createRazorpayOrder: (orderId, phone) => request(`/api/orders/${encodeURIComponent(orderId)}/payment/create`, { method: 'POST', body: { phone } }),
  verifyRazorpay: (orderId, body) => request(`/api/orders/${encodeURIComponent(orderId)}/payment/verify`, { method: 'POST', body }),

  // admin
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/api/auth/me', { auth: true }),
  changePassword: (currentPassword, newPassword) => request('/api/auth/change-password', { method: 'POST', auth: true, body: { currentPassword, newPassword } }),
  adminStats: () => request('/api/admin/stats', { auth: true }),
  adminFrames: (params) => request(`/api/frames${qs({ ...params, all: 1 })}`, { auth: true }),
  adminFrame: (id) => request(`/api/frames/${id}`, { auth: true }),
  saveFrame: (id, body) => request(id ? `/api/frames/${id}` : '/api/frames', { method: id ? 'PUT' : 'POST', auth: true, body }),
  deleteFrame: (id) => request(`/api/frames/${id}`, { method: 'DELETE', auth: true }),
  uploadFrameImage: (file) => { const f = new FormData(); f.append('file', file); return request('/api/upload/frame', { method: 'POST', auth: true, form: f }); },
  uploadLogo: (file) => { const f = new FormData(); f.append('file', file); return request('/api/upload/logo', { method: 'POST', auth: true, form: f }); },
  saveCategory: (id, body) => request(id ? `/api/categories/${id}` : '/api/categories', { method: id ? 'PUT' : 'POST', auth: true, body }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE', auth: true }),
  adminOrders: (params) => request(`/api/orders${qs(params)}`, { auth: true }),
  adminOrder: (id) => request(`/api/orders/${encodeURIComponent(id)}`, { auth: true }),
  updateOrder: (id, body) => request(`/api/orders/${encodeURIComponent(id)}/status`, { method: 'PUT', auth: true, body }),
  cancelOrder: (id) => request(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', auth: true }),
  adminReceipt: (id) => request(`/api/orders/${encodeURIComponent(id)}/receipt`, { auth: true }),
  resendEmail: (orderId) => request('/api/email/send', { method: 'POST', auth: true, body: { type: 'confirmation', orderId } }),
  testEmail: (to) => request('/api/email/send', { method: 'POST', auth: true, body: { type: 'test', to } }),
  adminCustomers: (params) => request(`/api/admin/customers${qs(params)}`, { auth: true }),
  adminSettings: () => request('/api/admin/settings', { auth: true }),
  saveSettings: (body) => request('/api/admin/settings', { method: 'PUT', auth: true, body }),
  coupons: () => request('/api/admin/coupons', { auth: true }),
  saveCoupon: (id, body) => request(id ? `/api/admin/coupons/${id}` : '/api/admin/coupons', { method: id ? 'PUT' : 'POST', auth: true, body }),
  deleteCoupon: (id) => request(`/api/admin/coupons/${id}`, { method: 'DELETE', auth: true }),
  adminReviews: () => request('/api/admin/reviews', { auth: true }),
  saveReview: (id, body) => request(id ? `/api/admin/reviews/${id}` : '/api/admin/reviews', { method: id ? 'PUT' : 'POST', auth: true, body }),
  deleteReview: (id) => request(`/api/admin/reviews/${id}`, { method: 'DELETE', auth: true }),
};

/** Triggers a browser download for a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
