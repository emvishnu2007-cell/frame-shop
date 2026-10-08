'use strict';
const db = require('../db');
const AppError = require('../utils/AppError');
const { round2 } = require('../utils/helpers');
const settings = require('./settingsService');

/**
 * Single source of truth for money. The client may display its own estimate,
 * but orders are ALWAYS priced here from database values.
 */
function priceItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new AppError('Your cart is empty.', 400, 'EMPTY_CART');
  }

  const getFrame = db.prepare(
    `SELECT f.*, c.name AS category_name,
            (SELECT path FROM frame_images WHERE frame_id = f.id ORDER BY sort_order, id LIMIT 1) AS image
     FROM frames f LEFT JOIN categories c ON c.id = f.category_id WHERE f.id = ?`
  );
  const getSize = db.prepare('SELECT * FROM frame_sizes WHERE id = ? AND frame_id = ?');

  const lines = rawItems.map((item, idx) => {
    const frame = getFrame.get(item.frameId);
    if (!frame || !frame.is_active) {
      throw new AppError(`Item ${idx + 1} is no longer available.`, 400, 'FRAME_UNAVAILABLE');
    }
    const size = getSize.get(item.sizeId, frame.id);
    if (!size) throw new AppError(`Please choose a valid size for "${frame.name}".`, 400, 'INVALID_SIZE');
    const quantity = Number(item.quantity);
    const unit = round2(frame.base_price + size.extra_price);
    return {
      frame,
      size,
      quantity,
      orientation: item.orientation === 'landscape' ? 'landscape' : 'portrait',
      photoPath: item.photoPath || null,
      unitPrice: unit,
      lineTotal: round2(unit * quantity),
    };
  });

  // Aggregate quantity per frame for stock validation (same frame may appear in several sizes).
  const perFrame = new Map();
  for (const l of lines) perFrame.set(l.frame.id, (perFrame.get(l.frame.id) || 0) + l.quantity);
  for (const [frameId, qty] of perFrame) {
    const frame = lines.find((l) => l.frame.id === frameId).frame;
    if (frame.stock < qty) {
      const msg = frame.stock <= 0
        ? `"${frame.name}" is currently out of stock.`
        : `Only ${frame.stock} of "${frame.name}" left in stock.`;
      throw new AppError(msg, 400, 'OUT_OF_STOCK');
    }
  }
  return lines;
}

function findCoupon(code, subtotal) {
  if (!code) return null;
  const coupon = db
    .prepare('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE AND is_active = 1')
    .get(String(code).trim());
  if (!coupon) throw new AppError('That coupon code is not valid.', 400, 'INVALID_COUPON');
  if (subtotal < coupon.min_subtotal) {
    throw new AppError(`This coupon needs a minimum order of ${coupon.min_subtotal}.`, 400, 'COUPON_MIN');
  }
  return coupon;
}

function computeTotals(lines, couponCode) {
  const all = settings.getAll();
  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const coupon = findCoupon(couponCode, subtotal);
  const discount = coupon ? round2((subtotal * coupon.percent_off) / 100) : 0;
  const taxable = round2(subtotal - discount);
  const taxPercent = settings.getNumber(all, 'tax_percent');
  const tax = round2((taxable * taxPercent) / 100);
  const baseDelivery = settings.getNumber(all, 'delivery_charge');
  const freeAbove = settings.getNumber(all, 'free_delivery_above');
  const delivery = freeAbove > 0 && taxable >= freeAbove ? 0 : round2(baseDelivery);
  const total = round2(taxable + tax + delivery);
  return {
    subtotal,
    discount,
    couponCode: coupon ? coupon.code : null,
    tax,
    taxPercent,
    deliveryCharge: delivery,
    total,
    currency: all.currency || 'INR',
  };
}

module.exports = { priceItems, computeTotals };
