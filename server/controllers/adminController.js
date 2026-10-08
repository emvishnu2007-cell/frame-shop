'use strict';
const db = require('../db');
const AppError = require('../utils/AppError');
const settings = require('../services/settingsService');
const { settingsSchema, couponSchema, reviewSchema } = require('../utils/schemas');

const IST = "'+5 hours', '+30 minutes'";

function stats(req, res) {
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  const totals = one(`SELECT COUNT(*) AS orders,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
      COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total ELSE 0 END), 0) AS revenue
    FROM orders`);

  const days = [];
  const byDay = new Map(
    db.prepare(`SELECT date(created_at, ${IST}) AS d, COUNT(*) AS orders,
        COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total ELSE 0 END), 0) AS revenue
      FROM orders WHERE date(created_at, ${IST}) >= date('now', ${IST}, '-13 days') GROUP BY d`)
      .all().map((r) => [r.d, r])
  );
  const todayIst = new Date(Date.now() + 5.5 * 3600 * 1000);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayIst.getTime() - i * 86400000).toISOString().slice(0, 10);
    const row = byDay.get(d);
    days.push({ date: d, orders: row ? row.orders : 0, revenue: row ? row.revenue : 0 });
  }

  const statusBreakdown = db.prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status').all();
  const topFrames = db.prepare(
    `SELECT oi.frame_name AS name, SUM(oi.quantity) AS sold, SUM(oi.line_total) AS revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status != 'Cancelled'
     GROUP BY oi.frame_code, oi.frame_name ORDER BY sold DESC LIMIT 5`
  ).all();
  const recent = db.prepare(
    'SELECT order_code, customer_name, total, status, created_at FROM orders ORDER BY created_at DESC, id DESC LIMIT 6'
  ).all().map((o) => ({ orderId: o.order_code, customerName: o.customer_name, total: o.total, status: o.status, createdAt: o.created_at }));
  const lowStock = db.prepare(
    'SELECT id, code, name, stock FROM frames WHERE is_active = 1 AND stock <= 5 ORDER BY stock ASC LIMIT 5'
  ).all();

  res.json({
    totalOrders: totals.orders,
    pendingOrders: totals.pending || 0,
    completedOrders: totals.completed || 0,
    cancelledOrders: totals.cancelled || 0,
    totalRevenue: totals.revenue,
    totalCustomers: one('SELECT COUNT(*) AS n FROM customers').n,
    totalFrames: one('SELECT COUNT(*) AS n FROM frames').n,
    currency: settings.getAll().currency,
    daily: days,
    statusBreakdown,
    topFrames,
    recentOrders: recent,
    lowStock,
  });
}

function customers(req, res) {
  const q = req.query.q ? `%${String(req.query.q).trim().slice(0, 80)}%` : null;
  const rows = db.prepare(
    `SELECT c.id, c.name, c.phone, c.email, c.city, c.created_at,
        COUNT(o.id) AS orders,
        COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total ELSE 0 END), 0) AS total_spent,
        MAX(o.created_at) AS last_order
     FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
     ${q ? 'WHERE c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?' : ''}
     GROUP BY c.id ORDER BY last_order DESC`
  ).all(...(q ? [q, q, q] : []));
  res.json({
    customers: rows.map((r) => ({
      id: r.id, name: r.name, phone: r.phone, email: r.email, city: r.city,
      orders: r.orders, totalSpent: r.total_spent, lastOrder: r.last_order, joinedAt: r.created_at,
    })),
  });
}

// ---------- Settings ----------
const getSettings = (req, res) => res.json({ settings: settings.getAdmin() });

function putSettings(req, res) {
  settings.update(settingsSchema.parse(req.body));
  res.json({ settings: settings.getAdmin(), message: 'Settings saved.' });
}

// ---------- Coupons ----------
const couponApi = (c) => ({ id: c.id, code: c.code, percentOff: c.percent_off, minSubtotal: c.min_subtotal, isActive: Boolean(c.is_active) });

const listCoupons = (req, res) =>
  res.json({ coupons: db.prepare('SELECT * FROM coupons ORDER BY id DESC').all().map(couponApi) });

function createCoupon(req, res) {
  const d = couponSchema.parse(req.body);
  if (db.prepare('SELECT 1 FROM coupons WHERE code = ? COLLATE NOCASE').get(d.code)) {
    throw new AppError('That coupon code already exists.', 409, 'DUPLICATE');
  }
  const id = db.prepare('INSERT INTO coupons (code, percent_off, min_subtotal, is_active) VALUES (?,?,?,?)')
    .run(d.code, d.percentOff, d.minSubtotal, d.isActive ? 1 : 0).lastInsertRowid;
  res.status(201).json({ coupon: couponApi(db.prepare('SELECT * FROM coupons WHERE id = ?').get(id)) });
}

function updateCoupon(req, res) {
  const d = couponSchema.parse(req.body);
  const id = Number(req.params.id);
  if (db.prepare('SELECT 1 FROM coupons WHERE code = ? COLLATE NOCASE AND id != ?').get(d.code, id)) {
    throw new AppError('That coupon code already exists.', 409, 'DUPLICATE');
  }
  const r = db.prepare('UPDATE coupons SET code=?, percent_off=?, min_subtotal=?, is_active=? WHERE id=?')
    .run(d.code, d.percentOff, d.minSubtotal, d.isActive ? 1 : 0, id);
  if (!r.changes) throw new AppError('Coupon not found.', 404, 'NOT_FOUND');
  res.json({ coupon: couponApi(db.prepare('SELECT * FROM coupons WHERE id = ?').get(id)) });
}

function deleteCoupon(req, res) {
  const r = db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id));
  if (!r.changes) throw new AppError('Coupon not found.', 404, 'NOT_FOUND');
  res.json({ message: 'Coupon deleted.' });
}

// ---------- Reviews ----------
const reviewApi = (r) => ({
  id: r.id, author: r.author, location: r.location, rating: r.rating, body: r.body, isVisible: Boolean(r.is_visible), createdAt: r.created_at,
});

const listReviewsAdmin = (req, res) =>
  res.json({ reviews: db.prepare('SELECT * FROM reviews ORDER BY id DESC').all().map(reviewApi) });

const listReviewsPublic = (req, res) =>
  res.json({ reviews: db.prepare('SELECT * FROM reviews WHERE is_visible = 1 ORDER BY id DESC LIMIT 9').all().map(reviewApi) });

function createReview(req, res) {
  const d = reviewSchema.parse(req.body);
  const id = db.prepare('INSERT INTO reviews (author, location, rating, body, is_visible) VALUES (?,?,?,?,?)')
    .run(d.author, d.location, d.rating, d.body, d.isVisible ? 1 : 0).lastInsertRowid;
  res.status(201).json({ review: reviewApi(db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)) });
}

function updateReview(req, res) {
  const d = reviewSchema.parse(req.body);
  const id = Number(req.params.id);
  const r = db.prepare('UPDATE reviews SET author=?, location=?, rating=?, body=?, is_visible=? WHERE id=?')
    .run(d.author, d.location, d.rating, d.body, d.isVisible ? 1 : 0, id);
  if (!r.changes) throw new AppError('Review not found.', 404, 'NOT_FOUND');
  res.json({ review: reviewApi(db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)) });
}

function deleteReview(req, res) {
  const r = db.prepare('DELETE FROM reviews WHERE id = ?').run(Number(req.params.id));
  if (!r.changes) throw new AppError('Review not found.', 404, 'NOT_FOUND');
  res.json({ message: 'Review deleted.' });
}

const publicSettings = (req, res) => res.json({ settings: settings.getPublic() });

module.exports = {
  stats, customers, getSettings, putSettings, publicSettings,
  listCoupons, createCoupon, updateCoupon, deleteCoupon,
  listReviewsAdmin, listReviewsPublic, createReview, updateReview, deleteReview,
};
