'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Keep only digits; compare phones by their last 10 digits so "+91 98765-43210" == "9876543210". */
const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-10);

const toBool = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);

/** Only allow files that live inside our uploads dir. Returns the absolute path or null. */
function resolveUpload(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith('/uploads/')) return null;
  const abs = path.normalize(path.join(config.uploadsDir, publicPath.replace(/^\/uploads\//, '')));
  if (!abs.startsWith(config.uploadsDir + path.sep)) return null;
  return abs;
}

function deleteUploadQuietly(publicPath) {
  const abs = resolveUpload(publicPath);
  if (abs && fs.existsSync(abs)) {
    try { fs.unlinkSync(abs); } catch { /* ignore */ }
  }
}

module.exports = { asyncHandler, round2, slugify, phoneKey, toBool, resolveUpload, deleteUploadQuietly };
