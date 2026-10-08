'use strict';
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const config = require('../config');
const settings = require('./settingsService');
const { money, formatDateTime } = require('../utils/format');
const { resolveUpload } = require('../utils/helpers');

const INK = '#1F1D1B';
const MUTED = '#6B665F';
const BRONZE = '#A8803F';
const LINE = '#E3DACB';
const CREAM = '#FAF7F2';

function drawLogo(doc, shop, x, y) {
  const logoAbs = shop.shop_logo ? resolveUpload(shop.shop_logo) : null;
  if (logoAbs && fs.existsSync(logoAbs) && /\.(png|jpe?g)$/i.test(logoAbs)) {
    try {
      doc.image(logoAbs, x, y, { fit: [56, 56], align: 'left', valign: 'center' });
      return;
    } catch { /* fall back to monogram */ }
  }
  // Monogram fallback
  doc.save();
  doc.roundedRect(x, y, 52, 52, 8).lineWidth(2).strokeColor(BRONZE).stroke();
  doc.roundedRect(x + 7, y + 7, 38, 38, 4).lineWidth(0.8).strokeColor(BRONZE).stroke();
  doc.font('Times-Bold').fontSize(22).fillColor(INK)
    .text((shop.shop_name || 'F').trim().charAt(0).toUpperCase(), x, y + 14, { width: 52, align: 'center' });
  doc.restore();
}

/**
 * Builds the invoice PDF for an order and resolves to a Buffer.
 * `order` must include `items`. The PDF uses "Rs." because the built-in PDF fonts have no rupee glyph.
 */
function buildInvoicePdf(order) {
  const shop = settings.getAll();
  const cur = order.currency || 'INR';
  const m = (n) => money(n, cur, { ascii: true });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: { Title: `Invoice ${order.order_code}`, Author: shop.shop_name, Subject: 'Booking receipt' },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // ---------- Header band ----------
    doc.rect(0, 0, doc.page.width, 6).fill(BRONZE);
    drawLogo(doc, shop, left, 36);
    doc.fillColor(INK).font('Times-Bold').fontSize(20).text(shop.shop_name, left + 68, 38, { width: 280 });
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
      .text(shop.shop_address, left + 68, 62, { width: 250 })
      .text(`Phone: ${shop.shop_phone}   |   ${shop.shop_email}`, left + 68, doc.y + 2, { width: 300 });

    doc.font('Helvetica-Bold').fontSize(15).fillColor(INK)
      .text('INVOICE / BOOKING RECEIPT', left + 250, 40, { width: width - 250, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(`Order ID: `, left + 250, 64, { width: width - 250 - 110, align: 'right', continued: false });
    doc.font('Helvetica-Bold').fillColor(INK).fontSize(10)
      .text(order.order_code, right - 110, 63, { width: 110, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(`Date: ${formatDateTime(order.created_at)}`, left + 200, 80, { width: width - 200, align: 'right' })
      .text(`Status: ${order.status}  |  Payment: ${order.payment_status}`, left + 200, 94, { width: width - 200, align: 'right' });

    let y = 124;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.8).strokeColor(LINE).stroke();

    // ---------- Customer + payment ----------
    y += 14;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BRONZE).text('BILLED TO / DELIVER TO', left, y);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(order.customer_name, left, y + 14);
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED)
      .text(`Phone: ${order.phone}`, left, doc.y + 2)
      .text(`Email: ${order.email}`)
      .text(`${order.address}, ${order.city} - ${order.pincode}`, { width: 260 });

    const payLabel = { cod: 'Cash on Delivery', store: 'Pay at Store', online: 'Online Payment' }[order.payment_method] || order.payment_method;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BRONZE).text('PAYMENT', left + 330, y, { width: width - 330 });
    doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(payLabel, left + 330, y + 14, { width: width - 330 });
    doc.fillColor(MUTED).text(`Payment status: ${order.payment_status}`, left + 330, doc.y + 2, { width: width - 330 });
    if (order.notes) doc.text(`Notes: ${order.notes}`, left + 330, doc.y + 2, { width: width - 330 });

    y = Math.max(doc.y, y + 90) + 18;

    // ---------- Items table ----------
    const cols = [
      { key: 'frame', label: 'FRAME', x: left, w: 170, align: 'left' },
      { key: 'design', label: 'DESIGN', x: left + 170, w: 110, align: 'left' },
      { key: 'size', label: 'SIZE', x: left + 280, w: 70, align: 'left' },
      { key: 'qty', label: 'QTY', x: left + 350, w: 36, align: 'right' },
      { key: 'unit', label: 'UNIT PRICE', x: left + 386, w: 54, align: 'right' },
      { key: 'total', label: 'TOTAL', x: left + 440, w: width - 440, align: 'right' },
    ];
    const drawHead = (yy) => {
      doc.rect(left, yy, width, 22).fill(INK);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF');
      for (const c of cols) doc.text(c.label, c.x + 6, yy + 7, { width: c.w - 12, align: c.align });
    };
    drawHead(y);
    y += 22;

    order.items.forEach((it, i) => {
      const rowH = 34;
      if (y + rowH > doc.page.height - 200) {
        doc.addPage();
        y = 48;
        drawHead(y);
        y += 22;
      }
      if (i % 2 === 0) doc.rect(left, y, width, rowH).fill(CREAM);
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5)
        .text(it.frame_name, cols[0].x + 6, y + 6, { width: cols[0].w - 12, height: 14, ellipsis: true });
      doc.font('Helvetica').fontSize(8).fillColor(MUTED)
        .text(`Code: ${it.frame_code}`, cols[0].x + 6, y + 20, { width: cols[0].w - 12 });
      doc.font('Helvetica').fontSize(9).fillColor(INK)
        .text(it.design || '-', cols[1].x + 6, y + 6, { width: cols[1].w - 12, height: 24, ellipsis: true })
        .text(it.size_label, cols[2].x + 6, y + 6, { width: cols[2].w - 12 });
      doc.text(String(it.quantity), cols[3].x + 6, y + 6, { width: cols[3].w - 12, align: 'right' })
        .text(m(it.unit_price), cols[4].x + 2, y + 6, { width: cols[4].w - 4, align: 'right' });
      doc.font('Helvetica-Bold').text(m(it.line_total), cols[5].x + 6, y + 6, { width: cols[5].w - 12, align: 'right' });
      y += rowH;
    });
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.8).strokeColor(LINE).stroke();

    // ---------- Totals ----------
    y += 14;
    if (y > doc.page.height - 170) { doc.addPage(); y = 60; }
    const tx = left + 300;
    const tw = width - 300;
    const row = (label, value, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 9.5).fillColor(bold ? INK : MUTED)
        .text(label, tx, y, { width: tw - 110 });
      doc.fillColor(INK).text(value, tx + tw - 110, y, { width: 110, align: 'right' });
      y += bold ? 20 : 16;
    };
    row('Subtotal', m(order.subtotal));
    row(order.coupon_code ? `Discount (${order.coupon_code})` : 'Discount', order.discount > 0 ? `- ${m(order.discount)}` : m(0));
    if (order.tax > 0) row(shop.tax_label || 'Tax', m(order.tax));
    row('Delivery charge', order.delivery_charge > 0 ? m(order.delivery_charge) : 'Free');
    y += 2;
    doc.rect(tx - 8, y - 6, tw + 8, 30).fill(CREAM);
    doc.moveTo(tx - 8, y - 6).lineTo(tx + tw, y - 6).lineWidth(1.2).strokeColor(BRONZE).stroke();
    y += 2;
    row('GRAND TOTAL', m(order.total), true);

    // ---------- Thank-you + footer ----------
    const fy = doc.page.height - 120;
    doc.font('Times-Italic').fontSize(14).fillColor(INK)
      .text('Thank you for choosing us to frame your memories.', left, fy, { width, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
      .text('This is a computer-generated receipt and does not require a signature.', left, fy + 24, { width, align: 'center' })
      .text(`${shop.shop_name}  •  ${shop.shop_phone}  •  ${shop.shop_email}`, left, fy + 38, { width, align: 'center' });
    doc.rect(0, doc.page.height - 6, doc.page.width, 6).fill(BRONZE);

    doc.end();
  });
}

/** Builds the PDF, stores a copy on disk for the admin, and returns the buffer. */
async function generateInvoice(order) {
  const buf = await buildInvoicePdf(order);
  try {
    fs.writeFileSync(path.join(config.invoicesDir, `${order.order_code}.pdf`), buf);
  } catch (err) {
    console.error('[invoice] could not store copy:', err.message);
  }
  return buf;
}

module.exports = { generateInvoice, buildInvoicePdf };
