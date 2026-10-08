'use strict';
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';

const resolveFromRoot = (p) => (path.isAbsolute(p) ? p : path.join(ROOT, p));

const config = {
  ROOT,
  isProd,
  port: Number(process.env.PORT) || 5000,
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  dbFile: resolveFromRoot(process.env.DATABASE_URL || './data/frameshop.db'),
  uploadsDir: path.join(ROOT, 'server', 'uploads'),
  invoicesDir: path.join(ROOT, 'server', 'invoices'),
  clientDist: path.join(ROOT, 'client', 'dist'),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 8,
  admin: {
    email: (process.env.ADMIN_EMAIL || 'admin@frameshop.local').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromName: process.env.SMTP_FROM_NAME || 'Frame Shop',
  },
  shop: {
    name: process.env.SHOP_NAME || 'Delight Digital Frames',
    email: process.env.SHOP_EMAIL || 'hello@aurumframes.in',
    phone: process.env.SHOP_PHONE || '+91 98765 43210',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
};

if (!config.jwtSecret || config.jwtSecret.startsWith('change-me')) {
  if (isProd) {
    console.error('FATAL: Set a strong JWT_SECRET in your .env file before running in production.');
    process.exit(1);
  }
  // Development convenience only: stable per-machine fallback so logins survive restarts.
  config.jwtSecret = 'dev-only-insecure-secret-' + require('os').hostname();
}

for (const dir of [path.dirname(config.dbFile), config.uploadsDir, config.invoicesDir,
  path.join(config.uploadsDir, 'photos'), path.join(config.uploadsDir, 'frames'), path.join(config.uploadsDir, 'branding')]) {
  fs.mkdirSync(dir, { recursive: true });
}

module.exports = config;
