'use strict';
const { z } = require('zod');
const AppError = require('../utils/AppError');
const orders = require('../services/orderService');
const { sendMail, isConfigured } = require('../services/mailer');
const templates = require('../services/emailTemplates');

const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('confirmation'), orderId: z.string().min(3) }),
  z.object({ type: z.literal('test'), to: z.string().trim().email('Enter a valid email address') }),
]);

/** Admin only: resend a booking confirmation (with the PDF) or send an SMTP test message. */
async function send(req, res) {
  const body = schema.parse(req.body);
  if (!isConfigured()) {
    throw new AppError('Email is not configured. Add your SMTP details under Settings first.', 400, 'SMTP_NOT_CONFIGURED');
  }
  if (body.type === 'test') {
    const tpl = templates.testEmail();
    const r = await sendMail({ to: body.to, ...tpl });
    if (!r.sent) throw new AppError(r.reason, 502, 'EMAIL_FAILED');
    return res.json({ message: `Test email sent to ${body.to}.` });
  }
  const order = orders.getOrderRow(body.orderId);
  if (!order) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  const r = await orders.sendConfirmation(order);
  if (!r.sent) throw new AppError(`Unable to send email. ${r.reason}`, 502, 'EMAIL_FAILED');
  res.json({ message: `Confirmation re-sent to ${order.email}.` });
}

module.exports = { send };
