const SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

export function formatMoney(n, currency = 'INR') {
  const value = Number(n) || 0;
  const sym = SYMBOLS[currency] ?? `${currency} `;
  return `${sym}${value.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateTime(sqliteUtc) {
  if (!sqliteUtc) return '';
  const d = new Date(String(sqliteUtc).replace(' ', 'T') + 'Z');
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(sqliteUtc) {
  if (!sqliteUtc) return '';
  const d = new Date(String(sqliteUtc).replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Lighten (+) or darken (-) a #rrggbb colour. */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v));
  const r = c((n >> 16) + amt);
  const g = c(((n >> 8) & 255) + amt);
  const b = c((n & 255) + amt);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function whatsappLink(number, text) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready', 'Out for Delivery', 'Completed', 'Cancelled'];
export const PAYMENT_STATUSES = ['Unpaid', 'Paid', 'Refunded', 'Failed'];
export const PAYMENT_LABELS = { cod: 'Cash on Delivery', store: 'Pay at Store', online: 'Online Payment' };

export const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-800',
  Confirmed: 'bg-sky-100 text-sky-800',
  Processing: 'bg-indigo-100 text-indigo-800',
  Ready: 'bg-teal-100 text-teal-800',
  'Out for Delivery': 'bg-violet-100 text-violet-800',
  Completed: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-red-100 text-red-700',
  Unpaid: 'bg-amber-100 text-amber-800',
  Paid: 'bg-emerald-100 text-emerald-800',
  Refunded: 'bg-slate-200 text-slate-700',
  Failed: 'bg-red-100 text-red-700',
};

/** Inline sunset illustration used for previews before a photo is chosen. */
export const SAMPLE_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D8A8"/><stop offset=".6" stop-color="#F2B98A"/><stop offset="1" stop-color="#E59A7B"/></linearGradient></defs><rect width="400" height="500" fill="url(#s)"/><circle cx="270" cy="190" r="48" fill="#FFF3D6"/><path d="M0 330 Q100 250 200 320 T400 290 V500 H0Z" fill="#B8765F"/><path d="M0 390 Q120 320 240 390 T400 360 V500 H0Z" fill="#7C4A3F"/><path d="M0 450 Q160 400 400 450 V500 H0Z" fill="#4A2E2B"/></svg>`
)}`;
