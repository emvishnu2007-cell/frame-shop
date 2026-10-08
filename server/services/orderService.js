'use strict';
const fs = require('fs');
const db = require('../db');
const AppError = require('../utils/AppError');
const { phoneKey, resolveUpload } = require('../utils/helpers');
const { priceItems, computeTotals } = require('./pricing');
const { generateInvoice } = require('./invoice');
const { sendMail } = require('./mailer');
const templates = require('./emailTemplates');

const STATUS_FLOW = ['Pending', 'Confirmed', 'Processing', 'Ready', 'Out for Delivery', 'Completed'];

function istYear() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).getUTCFullYear();
}

function nextOrderCode() {
  const year = istYear();
  const row = db
    .prepare(
      'INSERT INTO order_counters (year, last) VALUES (?, 1) ON CONFLICT(year) DO UPDATE SET last = last + 1 RETURNING last'
    )
    .get(year);
  return `FRM-${year}-${String(row.last).padStart(5, '0')}`;
}

function getItems(orderId) {
  return db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId);
}

function getOrderRow(code) {
  const order = db.prepare('SELECT * FROM orders WHERE order_code = ?').get(code);
  if (!order) return null;
  order.items = getItems(order.id);
  return order;
}

function toApi(order) {
  return {
    orderId: order.order_code,
    customerName: order.customer_name,
    phone: order.phone,
    email: order.email,
    address: order.address,
    city: order.city,
    pincode: order.pincode,
    notes: order.notes,
    subtotal: order.subtotal,
    discount: order.discount,
    couponCode: order.coupon_code,
    tax: order.tax,
    deliveryCharge: order.delivery_charge,
    total: order.total,
    currency: order.currency,
    status: order.status,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    emailStatus: order.email_status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: (order.items || []).map((i) => ({
      frameId: i.frame_id,
      frameCode: i.frame_code,
      frameName: i.frame_name,
      design: i.design,
      frameImage: i.frame_image,
      size: i.size_label,
      orientation: i.orientation,
      photoPath: i.photo_path,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
    })),
  };
}

function createOrder(input) {
  const { customer, items, paymentMethod, couponCode } = input;

  for (const [i, it] of items.entries()) {
    if (!it.photoPath) {
      throw new AppError(`Please upload a photo for item ${i + 1}.`, 400, 'PHOTO_REQUIRED');
    }
    const abs = resolveUpload(it.photoPath);
    if (!abs || !fs.existsSync(abs)) {
      throw new AppError(`The photo for item ${i + 1} could not be found. Please upload it again.`, 400, 'PHOTO_MISSING');
    }
  }

  // Everything below is priced from the database; client-sent prices are never accepted.
  const lines = priceItems(items);
  const totals = computeTotals(lines, couponCode);

  const run = db.transaction(() => {
    const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(customer.email);
    let customerId;
    if (existing) {
      customerId = existing.id;
      db.prepare(
        "UPDATE customers SET name=?, phone=?, address=?, city=?, pincode=?, updated_at=datetime('now') WHERE id=?"
      ).run(customer.name, customer.phone, customer.address, customer.city, customer.pincode, customerId);
    } else {
      customerId = db
        .prepare('INSERT INTO customers (name, email, phone, address, city, pincode) VALUES (?,?,?,?,?,?)')
        .run(customer.name, customer.email, customer.phone, customer.address, customer.city, customer.pincode)
        .lastInsertRowid;
    }

    const code = nextOrderCode();
    const orderId = db
      .prepare(
        `INSERT INTO orders (order_code, customer_id, customer_name, phone, email, address, city, pincode, notes,
           subtotal, discount, coupon_code, tax, delivery_charge, total, currency, payment_method)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        code, customerId, customer.name, customer.phone, customer.email, customer.address, customer.city,
        customer.pincode, customer.notes || '', totals.subtotal, totals.discount, totals.couponCode, totals.tax,
        totals.deliveryCharge, totals.total, totals.currency, paymentMethod
      ).lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, frame_id, frame_code, frame_name, design, frame_image, size_label,
         orientation, photo_path, quantity, unit_price, line_total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const decStock = db.prepare('UPDATE frames SET stock = stock - ? WHERE id = ? AND stock >= ?');
    for (const l of lines) {
      const design = [l.frame.color, l.frame.material].filter(Boolean).join(' · ') || l.frame.category_name || '';
      insertItem.run(
        orderId, l.frame.id, l.frame.code, l.frame.name, design, l.frame.image, l.size.label,
        l.orientation, l.photoPath, l.quantity, l.unitPrice, l.lineTotal
      );
      const res = decStock.run(l.quantity, l.frame.id, l.quantity);
      if (res.changes === 0) {
        throw new AppError(`"${l.frame.name}" just went out of stock. Please adjust your cart.`, 409, 'OUT_OF_STOCK');
      }
    }
    return code;
  });

  const code = run();
  return getOrderRow(code);
}

/** Generates the PDF and emails the confirmation. Never throws; reports the outcome. */
async function sendConfirmation(order) {
  let pdf = null;
  try {
    pdf = await generateInvoice(order);
  } catch (err) {
    console.error('[invoice] generation failed:', err);
  }
  const tpl = templates.confirmationEmail(order);
  const result = await sendMail({
    to: order.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    attachments: pdf ? [{ filename: `Invoice-${order.order_code}.pdf`, content: pdf, contentType: 'application/pdf' }] : [],
  });
  db.prepare("UPDATE orders SET email_status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(result.sent ? 'sent' : 'failed', order.id);
  return result;
}

async function sendStatusEmail(order) {
  const tpl = templates.statusEmail(order);
  return sendMail({ to: order.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
}

function restoreStock(order) {
  const inc = db.prepare('UPDATE frames SET stock = stock + ? WHERE id = ?');
  for (const it of order.items) if (it.frame_id) inc.run(it.quantity, it.frame_id);
}

/** Applies status / payment changes. Returns { order, statusChanged }. */
function updateOrder(code, { status, paymentStatus }) {
  const order = getOrderRow(code);
  if (!order) throw new AppError('Order not found.', 404, 'NOT_FOUND');

  let statusChanged = false;
  const tx = db.transaction(() => {
    if (status && status !== order.status) {
      if (order.status === 'Cancelled') {
        throw new AppError('A cancelled order cannot be reopened. Ask the customer to place a new booking.', 400, 'ORDER_CANCELLED');
      }
      if (status === 'Cancelled') {
        restoreStock(order);
        if (order.payment_status === 'Paid') {
          db.prepare("UPDATE orders SET payment_status='Refunded' WHERE id = ?").run(order.id);
        }
      }
      db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, order.id);
      statusChanged = true;
    }
    if (paymentStatus && paymentStatus !== order.payment_status) {
      db.prepare("UPDATE orders SET payment_status = ?, updated_at = datetime('now') WHERE id = ?").run(paymentStatus, order.id);
    }
  });
  tx();
  return { order: getOrderRow(code), statusChanged };
}

function listOrders({ status, q, page = 1, pageSize = 20 }) {
  const where = [];
  const params = [];
  if (status && status !== 'all') { where.push('o.status = ?'); params.push(status); }
  if (q) {
    where.push('(o.order_code LIKE ? OR o.customer_name LIKE ? OR o.phone LIKE ? OR o.email LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM orders o ${clause}`).get(...params).n;
  const rows = db
    .prepare(
      `SELECT o.* FROM orders o ${clause} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize);
  for (const r of rows) r.items = getItems(r.id);
  return { orders: rows.map(toApi), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Public lookup: both order id and phone must match (compared by last 10 digits). */
function trackOrder(code, phone) {
  const order = getOrderRow(String(code || '').trim().toUpperCase());
  if (!order || phoneKey(order.phone) !== phoneKey(phone) || phoneKey(phone).length < 10) return null;
  return order;
}

module.exports = {
  STATUS_FLOW, createOrder, sendConfirmation, sendStatusEmail, updateOrder, listOrders,
  trackOrder, getOrderRow, toApi,
};
