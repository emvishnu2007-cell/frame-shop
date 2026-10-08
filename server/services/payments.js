'use strict';
const crypto = require('crypto');
const config = require('../config');
const db = require('../db');
const AppError = require('../utils/AppError');

function isEnabled() {
  return Boolean(config.razorpay.keyId && config.razorpay.keySecret);
}

let client = null;
function getClient() {
  if (!isEnabled()) {
    throw new AppError('Online payment is not available right now. Please choose Cash on Delivery or Pay at Store.', 400, 'PAYMENT_DISABLED');
  }
  if (!client) {
    const Razorpay = require('razorpay');
    client = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
  }
  return client;
}

/** Creates a Razorpay order for an existing booking. Amount comes from the saved order, never the client. */
async function createRazorpayOrder(order) {
  if (order.payment_method !== 'online') throw new AppError('This booking is not set to online payment.', 400, 'NOT_ONLINE');
  if (order.payment_status === 'Paid') throw new AppError('This booking is already paid.', 400, 'ALREADY_PAID');
  const rz = getClient();
  let rzOrder;
  try {
    rzOrder = await rz.orders.create({
      amount: Math.round(order.total * 100),
      currency: order.currency,
      receipt: order.order_code,
      notes: { order_code: order.order_code },
    });
  } catch (err) {
    console.error('[razorpay] order create failed:', err && err.error ? err.error : err.message);
    throw new AppError('Could not start the payment. Please try again.', 502, 'PAYMENT_GATEWAY');
  }
  db.prepare(
    'INSERT INTO payments (order_id, provider, provider_order_id, amount, currency, status) VALUES (?,?,?,?,?,?)'
  ).run(order.id, 'razorpay', rzOrder.id, order.total, order.currency, 'created');
  return { razorpayOrderId: rzOrder.id, amount: rzOrder.amount, currency: rzOrder.currency, keyId: config.razorpay.keyId };
}

function verifySignature(razorpayOrderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${razorpayOrderId}|${paymentId}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function confirmPayment(order, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const payment = db
    .prepare('SELECT * FROM payments WHERE order_id = ? AND provider_order_id = ?')
    .get(order.id, razorpayOrderId);
  if (!payment) throw new AppError('Payment record not found.', 404, 'NOT_FOUND');
  if (!verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    db.prepare("UPDATE payments SET status='failed', updated_at=datetime('now') WHERE id = ?").run(payment.id);
    db.prepare("UPDATE orders SET payment_status='Failed', updated_at=datetime('now') WHERE id = ?").run(order.id);
    throw new AppError('Payment could not be verified. If money was deducted, please contact the shop.', 400, 'PAYMENT_VERIFY');
  }
  db.transaction(() => {
    db.prepare("UPDATE payments SET status='paid', provider_payment_id=?, updated_at=datetime('now') WHERE id = ?")
      .run(razorpayPaymentId, payment.id);
    db.prepare("UPDATE orders SET payment_status='Paid', updated_at=datetime('now') WHERE id = ?").run(order.id);
  })();
}

module.exports = { isEnabled, createRazorpayOrder, confirmPayment };
