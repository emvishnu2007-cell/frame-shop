'use strict';

const SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
const ASCII_SYMBOLS = { INR: 'Rs. ', USD: '$', EUR: 'EUR ', GBP: 'GBP ' };

function money(n, currency = 'INR', { ascii = false } = {}) {
  const value = Number(n) || 0;
  const sym = (ascii ? ASCII_SYMBOLS : SYMBOLS)[currency] ?? `${currency} `;
  const formatted = value.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${sym}${formatted}`;
}

function formatDateTime(sqliteUtc) {
  // SQLite datetime('now') is UTC without a zone marker.
  const d = new Date(String(sqliteUtc).replace(' ', 'T') + 'Z');
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(sqliteUtc) {
  const d = new Date(String(sqliteUtc).replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
}

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = { money, formatDate, formatDateTime, escapeHtml };
