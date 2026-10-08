'use strict';
const db = require('../db');
const config = require('../config');

const DEFAULTS = {
  shop_name: config.shop.name,
  shop_tagline: 'Premium photo frames, crafted by hand.',
  shop_logo: '',
  shop_address: '12, Mission Street, White Town, Puducherry 605001, India',
  shop_phone: config.shop.phone,
  shop_email: config.shop.email,
  whatsapp_number: '919876543210',
  business_hours: 'Mon - Sat: 10:00 AM - 8:00 PM\nSunday: 11:00 AM - 5:00 PM',
  maps_embed_url: '',
  instagram_url: '',
  facebook_url: '',
  delivery_charge: '80',
  free_delivery_above: '3000',
  tax_percent: '0',
  tax_label: 'GST',
  currency: 'INR',
  smtp_host: config.smtp.host,
  smtp_port: String(config.smtp.port),
  smtp_secure: String(config.smtp.secure),
  smtp_user: config.smtp.user,
  smtp_password: config.smtp.password,
  smtp_from_name: config.smtp.fromName,
};

const SECRET_KEYS = new Set(['smtp_password']);
const PUBLIC_KEYS = [
  'shop_name', 'shop_tagline', 'shop_logo', 'shop_address', 'shop_phone', 'shop_email',
  'whatsapp_number', 'business_hours', 'maps_embed_url', 'instagram_url', 'facebook_url',
  'delivery_charge', 'free_delivery_above', 'tax_percent', 'tax_label', 'currency',
];

function getAll() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

function getNumber(all, key) {
  const n = Number(all[key]);
  return Number.isFinite(n) ? n : 0;
}

function getPublic() {
  const all = getAll();
  const out = {};
  for (const k of PUBLIC_KEYS) out[k] = all[k];
  out.delivery_charge = getNumber(all, 'delivery_charge');
  out.free_delivery_above = getNumber(all, 'free_delivery_above');
  out.tax_percent = getNumber(all, 'tax_percent');
  out.payment_methods = {
    cod: true,
    store: true,
    online: Boolean(config.razorpay.keyId && config.razorpay.keySecret),
  };
  out.razorpay_key_id = config.razorpay.keyId || null;
  return out;
}

/** Admin view: secrets are masked, never returned. */
function getAdmin() {
  const all = getAll();
  const out = { ...all };
  for (const k of SECRET_KEYS) {
    out[`${k}_set`] = Boolean(all[k]);
    delete out[k];
  }
  out.razorpay_configured = Boolean(config.razorpay.keyId && config.razorpay.keySecret);
  return out;
}

const upsert = db.prepare(
  "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) " +
  "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
);

function update(patch) {
  const allowed = new Set(Object.keys(DEFAULTS));
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) {
      if (!allowed.has(k)) continue;
      // Blank secret means "keep the existing one".
      if (SECRET_KEYS.has(k) && (v === undefined || v === null || v === '')) continue;
      upsert.run(k, String(v ?? ''));
    }
  });
  tx(Object.entries(patch));
}

module.exports = { getAll, getPublic, getAdmin, update, getNumber, DEFAULTS };
