'use strict';
const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const config = require('../config');
const AppError = require('../utils/AppError');
const { phoneKey } = require('../utils/helpers');
const { orderSchema, statusSchema } = require('../utils/schemas');
const orders = require('../services/orderService');
const { priceItems, computeTotals } = require('../services/pricing');
const { generateInvoice } = require('../services/invoice');
const payments = require('../services/payments');

const quoteSchema = z.object({
  items: orderSchema.shape.items,
  couponCode: z.string().trim().max(40).optional().nullable(),
});

const razorpayVerifySchema = z.object({
  phone: z.string(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

/** Public: server-side price preview used by the cart and checkout pages. */
function quote(req, res) {
  const { items, couponCode } = quoteSchema.parse(req.body);
  const lines = priceItems(items);
  const totals = computeTotals(lines, couponCode);
  res.json({
    ...totals,
    lines: lines.map((l) => ({ frameId: l.frame.id, sizeId: l.size.id, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
  });
}

async function create(req, res) {
  const input = orderSchema.parse(req.body);
  if (input.paymentMethod === 'online' && !payments.isEnabled()) {
    throw new AppError('Online payment is not available right now. Please choose Cash on Delivery or Pay at Store.', 400, 'PAYMENT_DISABLED');
  }
  const order = orders.createOrder(input);
  const mail = await orders.sendConfirmation(order);
  const fresh = orders.getOrderRow(order.order_code);
  res.status(201).json({
    order: orders.toApi(fresh),
    email: {
      sent: mail.sent,
      message: mail.sent
        ? 'Your confirmation receipt has been sent to your email.'
        : 'Unable to send email. Your booking is still saved.',
    },
    message: 'Your booking has been successfully confirmed.',
  });
}

function track(req, res) {
  const { orderId, phone } = req.query;
  if (!orderId || !phone) throw new AppError('Enter your Order ID and mobile number.', 400, 'MISSING_FIELDS');
  const order = orders.trackOrder(String(orderId), String(phone));
  if (!order) throw new AppError('We could not find an order matching those details. Please check and try again.', 404, 'NOT_FOUND');
  res.json({ order: orders.toApi(order) });
}

function list(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  res.json(orders.listOrders({
    status: req.query.status ? String(req.query.status) : undefined,
    q: req.query.q ? String(req.query.q).trim().slice(0, 80) : '',
    page,
    pageSize,
  }));
}

function get(req, res) {
  const order = orders.getOrderRow(req.params.orderId);
  if (!order) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  res.json({ order: orders.toApi(order) });
}

async function updateStatus(req, res) {
  const body = statusSchema.parse(req.body);
  const { order, statusChanged } = orders.updateOrder(req.params.orderId, body);
  let emailed = null;
  if (statusChanged && body.notifyCustomer) {
    const r = await orders.sendStatusEmail(order);
    emailed = r.sent;
  }
  res.json({ order: orders.toApi(order), customerNotified: emailed });
}

async function cancel(req, res) {
  const { order } = orders.updateOrder(req.params.orderId, { status: 'Cancelled' });
  const r = await orders.sendStatusEmail(order);
  res.json({ order: orders.toApi(order), customerNotified: r.sent });
}

/** Admin (token) or customer (order id + phone) can download the PDF. */
async function receipt(req, res) {
  const code = String(req.params.orderId).toUpperCase();
  const order = orders.getOrderRow(code);
  const authorised = req.admin || (order && req.query.phone && phoneKey(order.phone) === phoneKey(String(req.query.phone)) && phoneKey(String(req.query.phone)).length >= 10);
  if (!order || !authorised) throw new AppError('Receipt not found.', 404, 'NOT_FOUND');
  const pdf = await generateInvoice(order);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.order_code}.pdf"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(pdf);
}

function ownedOrder(code, phone) {
  const order = orders.trackOrder(code, phone);
  if (!order) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  return order;
}

async function paymentCreate(req, res) {
  const order = ownedOrder(String(req.params.orderId).toUpperCase(), String(req.body.phone || ''));
  res.json(await payments.createRazorpayOrder(order));
}

function paymentVerify(req, res) {
  const body = razorpayVerifySchema.parse(req.body);
  const order = ownedOrder(String(req.params.orderId).toUpperCase(), body.phone);
  payments.confirmPayment(order, body);
  res.json({ order: orders.toApi(orders.getOrderRow(order.order_code)), message: 'Payment received. Thank you!' });
}

module.exports = { quote, create, track, list, get, updateStatus, cancel, receipt, paymentCreate, paymentVerify };
