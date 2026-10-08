'use strict';
const nodemailer = require('nodemailer');
const settings = require('./settingsService');

function smtpConfig() {
  const s = settings.getAll();
  return {
    host: (s.smtp_host || '').trim(),
    port: Number(s.smtp_port) || 587,
    secure: String(s.smtp_secure) === 'true',
    user: (s.smtp_user || '').trim(),
    pass: s.smtp_password || '',
    fromName: s.smtp_from_name || s.shop_name,
    shopEmail: s.shop_email,
  };
}

function isConfigured() {
  const c = smtpConfig();
  return Boolean(c.host && c.user && c.pass);
}

function friendlyError(err) {
  const code = err && err.code;
  if (code === 'EAUTH') return 'SMTP login failed. Check the SMTP username and password (Gmail needs an App Password).';
  if (code === 'ECONNECTION' || code === 'ESOCKET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
    return 'Could not reach the SMTP server. Check the host, port and your internet connection.';
  }
  return 'The email could not be sent.';
}

/**
 * Sends an email. Never throws: returns { sent, reason } so a failed email
 * can never undo a saved booking.
 */
async function sendMail({ to, subject, html, text, attachments }) {
  if (!isConfigured()) {
    return { sent: false, reason: 'Email is not configured yet (SMTP settings are missing).' };
  }
  const c = smtpConfig();
  try {
    const transport = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.secure,
      auth: { user: c.user, pass: c.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
    await transport.sendMail({
      from: `"${c.fromName}" <${c.user}>`,
      replyTo: c.shopEmail || undefined,
      to,
      subject,
      html,
      text,
      attachments,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mail] send failed:', err.code || '', err.message);
    return { sent: false, reason: friendlyError(err) };
  }
}

module.exports = { sendMail, isConfigured };
