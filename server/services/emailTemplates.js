'use strict';
const config = require('../config');
const settings = require('./settingsService');
const { money, formatDateTime, escapeHtml: h } = require('../utils/format');

const PAY_LABEL = { cod: 'Cash on Delivery', store: 'Pay at Store', online: 'Online Payment' };

function shell({ shop, title, preheader, body }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(title)}</title></head>
<body style="margin:0;padding:0;background:#F3EDE3;font-family:Helvetica,Arial,sans-serif;color:#1F1D1B;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${h(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3EDE3;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E3DACB;">
<tr><td style="background:#1F1D1B;padding:28px 32px;text-align:center;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#FAF7F2;letter-spacing:1px;">${h(shop.shop_name)}</div>
  <div style="font-size:12px;color:#C09A5A;letter-spacing:3px;text-transform:uppercase;margin-top:6px;">Premium Photo Frames</div>
</td></tr>
<tr><td style="height:4px;background:#A8803F;line-height:4px;font-size:4px;">&nbsp;</td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="background:#FAF7F2;padding:22px 32px;text-align:center;font-size:12px;color:#6B665F;line-height:1.7;border-top:1px solid #E3DACB;">
  <strong style="color:#1F1D1B;">${h(shop.shop_name)}</strong><br>
  ${h(shop.shop_address)}<br>
  Phone: ${h(shop.shop_phone)} &nbsp;|&nbsp; <a href="mailto:${h(shop.shop_email)}" style="color:#A8803F;text-decoration:none;">${h(shop.shop_email)}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(order) {
  const cur = order.currency;
  const rows = order.items.map((it) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #EFE7DA;font-size:14px;">
        <strong>${h(it.frame_name)}</strong><br>
        <span style="color:#6B665F;font-size:12px;">${h(it.design || it.frame_code)} &middot; ${h(it.size_label)}</span>
      </td>
      <td align="center" style="padding:12px 8px;border-bottom:1px solid #EFE7DA;font-size:14px;">${it.quantity}</td>
      <td align="right" style="padding:12px 8px;border-bottom:1px solid #EFE7DA;font-size:14px;">${h(money(it.unit_price, cur))}</td>
      <td align="right" style="padding:12px 8px;border-bottom:1px solid #EFE7DA;font-size:14px;"><strong>${h(money(it.line_total, cur))}</strong></td>
    </tr>`).join('');
  const line = (label, value, strong = false) => `
    <tr><td colspan="3" align="right" style="padding:6px 8px;font-size:${strong ? 16 : 14}px;color:${strong ? '#1F1D1B' : '#6B665F'};${strong ? 'font-weight:bold;' : ''}">${label}</td>
    <td align="right" style="padding:6px 8px;font-size:${strong ? 16 : 14}px;${strong ? 'font-weight:bold;color:#A8803F;' : ''}">${value}</td></tr>`;
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;">
    <tr style="background:#FAF7F2;">
      <th align="left" style="padding:10px 8px;font-size:11px;letter-spacing:1px;color:#6B665F;text-transform:uppercase;">Frame</th>
      <th align="center" style="padding:10px 8px;font-size:11px;letter-spacing:1px;color:#6B665F;text-transform:uppercase;">Qty</th>
      <th align="right" style="padding:10px 8px;font-size:11px;letter-spacing:1px;color:#6B665F;text-transform:uppercase;">Price</th>
      <th align="right" style="padding:10px 8px;font-size:11px;letter-spacing:1px;color:#6B665F;text-transform:uppercase;">Total</th>
    </tr>${rows}
    ${line('Subtotal', h(money(order.subtotal, cur)))}
    ${order.discount > 0 ? line(`Discount${order.coupon_code ? ` (${h(order.coupon_code)})` : ''}`, `- ${h(money(order.discount, cur))}`) : ''}
    ${order.tax > 0 ? line('Tax', h(money(order.tax, cur))) : ''}
    ${line('Delivery charge', order.delivery_charge > 0 ? h(money(order.delivery_charge, cur)) : 'Free')}
    ${line('Total amount', h(money(order.total, cur)), true)}
  </table>`;
}

function confirmationEmail(order) {
  const shop = settings.getAll();
  const trackUrl = `${config.clientUrl}/track-order?orderId=${encodeURIComponent(order.order_code)}`;
  const body = `
    <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:0 0 8px;">Booking confirmed</h1>
    <p style="margin:0 0 20px;color:#46423E;font-size:15px;line-height:1.6;">Hi ${h(order.customer_name)}, thank you for your booking. We have received it and our team will start working on your frame shortly. Your receipt is attached to this email as a PDF.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF7F2;border:1px solid #E3DACB;border-radius:10px;">
      <tr><td style="padding:16px 20px;font-size:14px;line-height:1.9;">
        <strong>Order ID:</strong> ${h(order.order_code)}<br>
        <strong>Booking date:</strong> ${h(formatDateTime(order.created_at))}<br>
        <strong>Order status:</strong> ${h(order.status)}<br>
        <strong>Payment:</strong> ${h(PAY_LABEL[order.payment_method] || order.payment_method)} (${h(order.payment_status)})
      </td></tr>
    </table>
    <h2 style="font-family:Georgia,serif;font-weight:normal;font-size:19px;margin:28px 0 4px;">Your order</h2>
    ${itemsTable(order)}
    <h2 style="font-family:Georgia,serif;font-weight:normal;font-size:19px;margin:28px 0 8px;">Delivery address</h2>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#46423E;">${h(order.customer_name)}<br>${h(order.address)}<br>${h(order.city)} - ${h(order.pincode)}<br>Phone: ${h(order.phone)}</p>
    ${order.notes ? `<p style="margin:14px 0 0;font-size:13px;color:#6B665F;"><strong>Your instructions:</strong> ${h(order.notes)}</p>` : ''}
    <p style="text-align:center;margin:32px 0 8px;">
      <a href="${h(trackUrl)}" style="background:#1F1D1B;color:#FAF7F2;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;display:inline-block;">Track your order</a>
    </p>
    <p style="text-align:center;font-size:12px;color:#948E85;margin:8px 0 0;">Tracking needs your Order ID and the mobile number used while booking.</p>
    <p style="margin:28px 0 0;font-size:14px;color:#46423E;line-height:1.7;">Questions? Reply to this email or call us on <strong>${h(shop.shop_phone)}</strong>.</p>`;
  return {
    subject: `Frame Shop - Booking Confirmation #${order.order_code}`,
    html: shell({ shop, title: 'Booking Confirmation', preheader: `Your booking ${order.order_code} is confirmed.`, body }),
    text:
      `Hi ${order.customer_name},\n\nYour booking ${order.order_code} has been received.\n` +
      order.items.map((i) => `- ${i.frame_name} (${i.size_label}) x ${i.quantity}: ${money(i.line_total, order.currency)}`).join('\n') +
      `\n\nDelivery charge: ${money(order.delivery_charge, order.currency)}\nTotal: ${money(order.total, order.currency)}\n` +
      `Status: ${order.status}\n\nDeliver to: ${order.address}, ${order.city} - ${order.pincode}\n\nContact: ${shop.shop_phone} / ${shop.shop_email}\n`,
  };
}

function statusEmail(order) {
  const shop = settings.getAll();
  const messages = {
    Confirmed: 'Your booking has been confirmed by our team.',
    Processing: 'We have started crafting your frame.',
    Ready: 'Your frame is ready.',
    'Out for Delivery': 'Your frame is on its way to you.',
    Completed: 'Your order is complete. We hope you love it!',
    Cancelled: 'Your order has been cancelled. If you did not request this, please contact us.',
    Pending: 'Your order is pending confirmation.',
  };
  const body = `
    <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 8px;">Order update</h1>
    <p style="margin:0 0 20px;color:#46423E;font-size:15px;line-height:1.6;">Hi ${h(order.customer_name)}, ${h(messages[order.status] || 'your order status has changed.')}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF7F2;border:1px solid #E3DACB;border-radius:10px;">
      <tr><td style="padding:16px 20px;font-size:14px;line-height:1.9;">
        <strong>Order ID:</strong> ${h(order.order_code)}<br>
        <strong>Current status:</strong> <span style="color:#A8803F;font-weight:bold;">${h(order.status)}</span><br>
        <strong>Total:</strong> ${h(money(order.total, order.currency))}
      </td></tr>
    </table>
    <p style="margin:24px 0 0;font-size:14px;color:#46423E;line-height:1.7;">Questions? Call us on <strong>${h(shop.shop_phone)}</strong>.</p>`;
  return {
    subject: `Frame Shop - Order ${order.order_code} is now ${order.status}`,
    html: shell({ shop, title: 'Order update', preheader: `Order ${order.order_code}: ${order.status}`, body }),
    text: `Hi ${order.customer_name},\n\nOrder ${order.order_code} is now: ${order.status}.\n\nContact: ${shop.shop_phone}`,
  };
}

function testEmail() {
  const shop = settings.getAll();
  const body = `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 8px;">Email is working</h1>
  <p style="color:#46423E;font-size:15px;line-height:1.6;">This is a test message from your ${h(shop.shop_name)} admin panel. Your SMTP settings are configured correctly.</p>`;
  return { subject: `${shop.shop_name} - SMTP test`, html: shell({ shop, title: 'SMTP test', preheader: 'SMTP test', body }), text: 'Your SMTP settings are working.' };
}

module.exports = { confirmationEmail, statusEmail, testEmail };
