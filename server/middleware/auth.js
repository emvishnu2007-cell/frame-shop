'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const AppError = require('../utils/AppError');

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

function loadAdmin(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  const admin = db
    .prepare('SELECT id, email, name, must_change_password FROM admins WHERE id = ?')
    .get(payload.sub);
  return admin || null;
}

/** Requires a valid admin token. Blocks everything except password change while a change is pending. */
function requireAdmin(options = {}) {
  return (req, res, next) => {
    const token = readToken(req);
    if (!token) return next(new AppError('Please sign in to continue.', 401, 'UNAUTHORIZED'));
    let admin;
    try {
      admin = loadAdmin(token);
    } catch {
      return next(new AppError('Your session has expired. Please sign in again.', 401, 'UNAUTHORIZED'));
    }
    if (!admin) return next(new AppError('Your session is no longer valid.', 401, 'UNAUTHORIZED'));
    if (admin.must_change_password && !options.allowPendingPasswordChange) {
      return next(new AppError('Please change your password before continuing.', 403, 'PASSWORD_CHANGE_REQUIRED'));
    }
    req.admin = admin;
    next();
  };
}

/** Attaches req.admin when a valid token is present, otherwise continues anonymously. */
function optionalAdmin(req, res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const admin = loadAdmin(token);
      if (admin && !admin.must_change_password) req.admin = admin;
    } catch { /* anonymous */ }
  }
  next();
}

function signToken(admin) {
  return jwt.sign({ sub: admin.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

module.exports = { requireAdmin, optionalAdmin, signToken };
