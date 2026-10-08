'use strict';
const bcrypt = require('bcryptjs');
const db = require('../db');
const AppError = require('../utils/AppError');
const { signToken } = require('../middleware/auth');
const { loginSchema, passwordChangeSchema } = require('../utils/schemas');

// Used to keep response time similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const publicAdmin = (a) => ({ id: a.id, email: a.email, name: a.name, mustChangePassword: Boolean(a.must_change_password) });

function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  const ok = bcrypt.compareSync(password, admin ? admin.password_hash : DUMMY_HASH);
  if (!admin || !ok) throw new AppError('Incorrect email or password.', 401, 'INVALID_CREDENTIALS');
  res.json({ token: signToken(admin), admin: publicAdmin(admin) });
}

function me(req, res) {
  res.json({ admin: publicAdmin(req.admin) });
}

function changePassword(req, res) {
  const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body);
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!bcrypt.compareSync(currentPassword, admin.password_hash)) {
    throw new AppError('Your current password is incorrect.', 400, 'WRONG_PASSWORD');
  }
  if (currentPassword === newPassword) {
    throw new AppError('Choose a new password that is different from the current one.', 400, 'SAME_PASSWORD');
  }
  db.prepare(
    "UPDATE admins SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?"
  ).run(bcrypt.hashSync(newPassword, 12), admin.id);
  const fresh = db.prepare('SELECT * FROM admins WHERE id = ?').get(admin.id);
  res.json({ message: 'Password updated.', token: signToken(fresh), admin: publicAdmin(fresh) });
}

module.exports = { login, me, changePassword };
