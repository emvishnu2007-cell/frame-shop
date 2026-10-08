'use strict';
// End-to-end API test. Runs the real app against a throw-away database and upload folder.
//   npm run test:flow
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frameshop-test-'));
process.env.DATABASE_URL = path.join(tmp, 'test.db');
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
process.env.RATE_LIMIT_OFF = '1';
process.env.SMTP_HOST = '';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'Admin@12345';

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

// Seed the catalogue into the temp DB by running the seed script in-process.
process.argv.push('--reset');
require('../db/seed');

const db = require('../db');
const { createApp } = require('../app');

let server;
let base;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const j = async (method, url, { body, token } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.arrayBuffer(), ct };
};

const upload = async (url, buf, { type = 'image/png', name = 'a.png', token } = {}) => {
  const form = new FormData();
  form.append('file', new Blob([buf], { type }), name);
  const res = await fetch(base + url, { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, data: await res.json() };
};

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const state = {};

test('frames load from the database with sizes and prices', async () => {
  const { status, data } = await j('GET', '/api/frames');
  assert.equal(status, 200);
  assert.ok(data.frames.length >= 8);
  const f = data.frames[0];
  assert.ok(f.sizes.length >= 4);
  assert.equal(f.sizes[0].price, f.basePrice + f.sizes[0].extraPrice);
  state.frame = (await j('GET', `/api/frames/${f.id}`)).data.frame;
});

test('valid photo upload is accepted', async () => {
  const r = await upload('/api/upload', PNG);
  assert.equal(r.status, 201);
  assert.match(r.data.path, /^\/uploads\/photos\/[a-f0-9]{32}\.png$/);
  state.photo = r.data.path;
});

test('invalid image uploads are rejected', async () => {
  const wrongType = await upload('/api/upload', Buffer.from('hello'), { type: 'text/plain', name: 'a.txt' });
  assert.equal(wrongType.status, 400);
  const fake = await upload('/api/upload', Buffer.from('<?php echo 1; ?> not really an image at all'), { type: 'image/png', name: 'evil.png' });
  assert.equal(fake.status, 400);
  assert.equal(fake.data.error.code, 'INVALID_IMAGE');
});

test('quote is priced by the server and ignores client prices', async () => {
  const size = state.frame.sizes[2];
  const { status, data } = await j('POST', '/api/orders/quote', {
    body: { items: [{ frameId: state.frame.id, sizeId: size.id, quantity: 2, unitPrice: 1, total: 1 }] },
  });
  assert.equal(status, 200);
  assert.equal(data.subtotal, size.price * 2);
});

test('checkout validation rejects bad input with field errors', async () => {
  const { status, data } = await j('POST', '/api/orders', {
    body: { customer: { name: '', phone: '123', email: 'nope', address: '', city: '', pincode: '12' }, items: [], paymentMethod: 'cod' },
  });
  assert.equal(status, 422);
  assert.ok(data.error.fields['customer.email']);
  assert.ok(data.error.fields['customer.pincode']);
});

test('booking creates an order with a correct ID and server-calculated totals', async () => {
  const size = state.frame.sizes[3];
  const { status, data } = await j('POST', '/api/orders', {
    body: {
      customer: { name: 'Test Customer', phone: '+91 98765 43210', email: 'cust@example.com', address: '12 Test Street', city: 'Chennai', pincode: '600001', notes: 'Gift' },
      items: [{ frameId: state.frame.id, sizeId: size.id, quantity: 2, orientation: 'portrait', photoPath: state.photo }],
      paymentMethod: 'cod',
      couponCode: 'WELCOME10',
    },
  });
  assert.equal(status, 201, JSON.stringify(data));
  const year = new Date().getFullYear();
  assert.match(data.order.orderId, new RegExp(`^FRM-${year}-00001$`));
  const subtotal = size.price * 2;
  assert.equal(data.order.subtotal, subtotal);
  assert.equal(data.order.discount, Math.round(subtotal * 10) / 100);
  assert.equal(data.email.sent, false); // SMTP is not configured in tests; booking must still succeed
  assert.match(data.email.message, /Your booking is still saved/);
  state.order = data.order;

  const second = await j('POST', '/api/orders', {
    body: {
      customer: { name: 'Test Customer', phone: '9876543210', email: 'cust@example.com', address: '12 Test Street', city: 'Chennai', pincode: '600001' },
      items: [{ frameId: state.frame.id, sizeId: size.id, quantity: 1, photoPath: state.photo }],
      paymentMethod: 'store',
    },
  });
  assert.match(second.data.order.orderId, /-00002$/);
});

test('stock is reduced and out-of-stock is enforced', async () => {
  const after = (await j('GET', `/api/frames/${state.frame.id}`)).data.frame;
  assert.equal(after.stock, state.frame.stock - 3);
  const size = state.frame.sizes[0];
  const r = await j('POST', '/api/orders/quote', { body: { items: [{ frameId: state.frame.id, sizeId: size.id, quantity: 50 }] } });
  if (after.stock < 50) assert.equal(r.status, 400);
});

test('customer can track by order ID + phone, and not with the wrong phone', async () => {
  const ok = await j('GET', `/api/orders/track?orderId=${state.order.orderId}&phone=9876543210`);
  assert.equal(ok.status, 200);
  assert.equal(ok.data.order.status, 'Pending');
  const bad = await j('GET', `/api/orders/track?orderId=${state.order.orderId}&phone=9000000000`);
  assert.equal(bad.status, 404);
});

test('receipt PDF is generated for the owner and refused otherwise', async () => {
  const ok = await fetch(`${base}/api/orders/${state.order.orderId}/receipt?phone=9876543210`);
  assert.equal(ok.status, 200);
  const buf = Buffer.from(await ok.arrayBuffer());
  assert.equal(buf.slice(0, 5).toString(), '%PDF-');
  assert.ok(buf.length > 1500);
  const bad = await fetch(`${base}/api/orders/${state.order.orderId}/receipt?phone=9000000000`);
  assert.equal(bad.status, 404);
  const none = await fetch(`${base}/api/orders/${state.order.orderId}/receipt`);
  assert.equal(none.status, 404);
});

test('unauthorised requests to admin APIs are blocked', async () => {
  for (const [m, u] of [['GET', '/api/orders'], ['GET', '/api/admin/stats'], ['GET', '/api/admin/customers'], ['PUT', '/api/admin/settings'], ['POST', '/api/frames'], ['DELETE', '/api/frames/1'], ['POST', '/api/categories'], ['PUT', `/api/orders/${state.order.orderId}/status`], ['POST', '/api/email/send'], ['POST', '/api/upload/frame']]) {
    const r = await j(m, u, { body: m === 'GET' || m === 'DELETE' ? undefined : {} });
    assert.equal(r.status, 401, `${m} ${u} should be 401 but was ${r.status}`);
  }
  const forged = await j('GET', '/api/orders', { token: 'not.a.token' });
  assert.equal(forged.status, 401);
});

test('admin must change the default password, then can use the panel', async () => {
  const bad = await j('POST', '/api/auth/login', { body: { email: 'admin@test.local', password: 'wrong' } });
  assert.equal(bad.status, 401);
  const login = await j('POST', '/api/auth/login', { body: { email: 'admin@test.local', password: 'Admin@12345' } });
  assert.equal(login.status, 200);
  assert.equal(login.data.admin.mustChangePassword, true);
  const blocked = await j('GET', '/api/orders', { token: login.data.token });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.data.error.code, 'PASSWORD_CHANGE_REQUIRED');
  const weak = await j('POST', '/api/auth/change-password', { token: login.data.token, body: { currentPassword: 'Admin@12345', newPassword: 'short' } });
  assert.equal(weak.status, 422);
  const change = await j('POST', '/api/auth/change-password', { token: login.data.token, body: { currentPassword: 'Admin@12345', newPassword: 'NewStrongPass123' } });
  assert.equal(change.status, 200);
  state.token = change.data.token;
  const hash = db.prepare('SELECT password_hash FROM admins WHERE email = ?').get('admin@test.local').password_hash;
  assert.ok(hash.startsWith('$2'), 'password must be stored as a bcrypt hash');
  assert.ok(bcrypt.compareSync('NewStrongPass123', hash));
});

test('admin sees the booking, dashboard counts it, and can update status', async () => {
  const list = await j('GET', '/api/orders', { token: state.token });
  assert.equal(list.status, 200);
  assert.ok(list.data.orders.some((o) => o.orderId === state.order.orderId));
  const filtered = await j('GET', '/api/orders?status=Pending&q=Test', { token: state.token });
  assert.ok(filtered.data.total >= 1);
  const stats = await j('GET', '/api/admin/stats', { token: state.token });
  assert.equal(stats.data.totalOrders, 2);
  assert.equal(stats.data.pendingOrders, 2);
  assert.equal(stats.data.totalCustomers, 1);
  const upd = await j('PUT', `/api/orders/${state.order.orderId}/status`, { token: state.token, body: { status: 'Processing', notifyCustomer: false } });
  assert.equal(upd.status, 200);
  const track = await j('GET', `/api/orders/track?orderId=${state.order.orderId}&phone=9876543210`);
  assert.equal(track.data.order.status, 'Processing');
  const invalid = await j('PUT', `/api/orders/${state.order.orderId}/status`, { token: state.token, body: { status: 'Banana' } });
  assert.equal(invalid.status, 422);
  const inv = await fetch(`${base}/api/orders/${state.order.orderId}/receipt`, { headers: { Authorization: `Bearer ${state.token}` } });
  assert.equal(inv.status, 200);
});

test('cancelling restores stock and cannot be reopened', async () => {
  const before = (await j('GET', `/api/frames/${state.frame.id}`)).data.frame.stock;
  const c = await j('POST', `/api/orders/${state.order.orderId}/cancel`, { token: state.token });
  assert.equal(c.status, 200);
  assert.equal(c.data.order.status, 'Cancelled');
  const after = (await j('GET', `/api/frames/${state.frame.id}`)).data.frame.stock;
  assert.equal(after, before + 2);
  const reopen = await j('PUT', `/api/orders/${state.order.orderId}/status`, { token: state.token, body: { status: 'Pending' } });
  assert.equal(reopen.status, 400);
});

test('admin can edit size prices and the new price flows into quotes', async () => {
  const { frame } = (await j('GET', `/api/frames/${state.frame.id}`, { token: state.token })).data;
  const body = {
    name: frame.name, categoryId: frame.categoryId, description: frame.description, basePrice: 700, material: frame.material, color: frame.color,
    colorHex: frame.colorHex, matHex: frame.matHex, borderStyle: frame.borderStyle, glassType: frame.glassType, stock: frame.stock,
    isFeatured: frame.isFeatured, isActive: true, images: frame.images.map((i) => i.path),
    sizes: frame.sizes.map((s, i) => ({ label: s.label, widthIn: s.widthIn, heightIn: s.heightIn, extraPrice: i === 0 ? 50 : s.extraPrice })),
  };
  const put = await j('PUT', `/api/frames/${frame.id}`, { token: state.token, body });
  assert.equal(put.status, 200);
  const q = await j('POST', '/api/orders/quote', { body: { items: [{ frameId: frame.id, sizeId: put.data.frame.sizes[0].id, quantity: 1 }] } });
  assert.equal(q.data.subtotal, 750);
});

test('categories: create, block delete while in use, delete when empty', async () => {
  const created = await j('POST', '/api/categories', { token: state.token, body: { name: 'Test Cat', description: 'x' } });
  assert.equal(created.status, 201);
  const dup = await j('POST', '/api/categories', { token: state.token, body: { name: 'test cat' } });
  assert.equal(dup.status, 409);
  const inUse = await j('DELETE', `/api/categories/${state.frame.categoryId}`, { token: state.token });
  assert.equal(inUse.status, 409);
  const del = await j('DELETE', `/api/categories/${created.data.category.id}`, { token: state.token });
  assert.equal(del.status, 200);
});

test('settings never expose the SMTP password', async () => {
  await j('PUT', '/api/admin/settings', { token: state.token, body: { smtp_password: 'super-secret', smtp_host: 'smtp.example.com' } });
  const admin = await j('GET', '/api/admin/settings', { token: state.token });
  assert.equal(admin.data.settings.smtp_password, undefined);
  assert.equal(admin.data.settings.smtp_password_set, true);
  const pub = await j('GET', '/api/settings');
  assert.ok(!JSON.stringify(pub.data).includes('super-secret'));
  assert.equal(pub.data.settings.smtp_host, undefined);
});

test('unknown API routes return JSON 404 and errors never leak stack traces', async () => {
  const r = await j('GET', '/api/nope');
  assert.equal(r.status, 404);
  const bad = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  assert.equal(bad.status, 400);
  assert.ok(!(await bad.text()).includes('at '));
});
