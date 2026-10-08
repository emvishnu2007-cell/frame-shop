import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Download, MailCheck, MailWarning, MapPin, MessageCircle } from 'lucide-react';
import { api, downloadBlob } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { payOnline } from '../utils/razorpay';
import { PAYMENT_LABELS, whatsappLink } from '../utils/format';
import { LAST_ORDER_KEY } from './Checkout';
import { SEO, Spinner, StatusBadge } from '../components/ui';

function readLast(orderId) {
  try {
    const v = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null');
    return v && v.order && v.order.orderId === orderId ? v : null;
  } catch { return null; }
}

export default function OrderSuccess() {
  const { orderId } = useParams();
  const { settings, money } = useSettings();
  const toast = useToast();
  const [state, setState] = useState(() => readLast(orderId));
  const [busy, setBusy] = useState('');

  if (!state) {
    return (
      <div className="container-x py-20 text-center">
        <SEO title="Booking" />
        <h1 className="text-3xl font-semibold">Booking {orderId}</h1>
        <p className="mx-auto mt-3 max-w-md text-charcoal-500">For your privacy, order details are only shown on the device that placed the order. Use Track Order with your Order ID and mobile number to see the status or download your receipt.</p>
        <Link to={`/track-order?orderId=${encodeURIComponent(orderId)}`} className="btn-primary mt-8">Track this order</Link>
      </div>
    );
  }

  const { order, email, paymentNote } = state;
  const wa = whatsappLink(settings.whatsapp_number, `Hello ${settings.shop_name}, I have booked order ${order.orderId}. Please confirm.`);

  async function download() {
    setBusy('receipt');
    try {
      const blob = await api.receipt(order.orderId, order.phone);
      downloadBlob(blob, `Invoice-${order.orderId}.pdf`);
    } catch (e) { toast.error(e.message); }
    setBusy('');
  }

  async function payNow() {
    setBusy('pay');
    try {
      const r = await payOnline(order, settings.shop_name);
      if (r.paid) {
        const next = { ...state, order: { ...order, paymentStatus: 'Paid' }, paymentNote: null };
        setState(next);
        try { sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        toast.success('Payment received. Thank you!');
      }
    } catch (e) { toast.error(e.message); }
    setBusy('');
  }

  const needsPayment = order.paymentMethod === 'online' && order.paymentStatus !== 'Paid';

  return (
    <div className="container-x py-12 sm:py-16">
      <SEO title="Booking Confirmed" />
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }} className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
            <svg viewBox="0 0 52 52" className="h-14 w-14" aria-hidden="true">
              <motion.path d="M14 27 l8 8 l16 -18" fill="none" stroke="#059669" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.5 }} />
            </svg>
          </motion.div>
          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">✓ Booking Confirmed</h1>
          <p className="mt-3 text-charcoal-500">Your booking has been successfully received.</p>
          <p className="mt-5 inline-block rounded-full border border-bronze/40 bg-beige/50 px-5 py-2 font-mono text-base font-semibold tracking-wide">Order ID: {order.orderId}</p>
        </div>

        <div className={`mt-8 flex items-start gap-3 rounded-2xl border p-4 text-sm ${email.sent ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`} role="status">
          {email.sent ? <MailCheck className="mt-0.5 h-5 w-5 shrink-0" /> : <MailWarning className="mt-0.5 h-5 w-5 shrink-0" />}
          <div>
            <p className="font-semibold">{email.message}</p>
            {email.sent ? <p className="mt-0.5 opacity-80">Sent to {order.email}. Check your spam folder if you don&apos;t see it.</p> : <p className="mt-0.5 opacity-80">You can still download your receipt below.</p>}
          </div>
        </div>
        {paymentNote && <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">{paymentNote}</p>}

        <div className="card mt-6 divide-y divide-beige/70">
          <div className="space-y-3 p-5">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {it.frameImage && <img src={it.frameImage} alt="" className="h-14 w-11 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{it.frameName}</p><p className="text-xs text-charcoal-500">{it.size} · Qty {it.quantity}</p></div>
                <p className="font-semibold">{money(it.lineTotal)}</p>
              </div>
            ))}
          </div>
          <dl className="space-y-2 p-5 text-sm">
            <div className="flex justify-between"><dt className="text-charcoal-500">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between"><dt className="text-charcoal-500">Discount</dt><dd>− {money(order.discount)}</dd></div>}
            {order.tax > 0 && <div className="flex justify-between"><dt className="text-charcoal-500">Tax</dt><dd>{money(order.tax)}</dd></div>}
            <div className="flex justify-between"><dt className="text-charcoal-500">Delivery</dt><dd>{order.deliveryCharge > 0 ? money(order.deliveryCharge) : 'Free'}</dd></div>
            <div className="flex justify-between border-t border-beige/70 pt-3 text-lg font-semibold"><dt>Total</dt><dd className="text-bronze-600">{money(order.total)}</dd></div>
          </dl>
          <div className="grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div><p className="label">Status</p><StatusBadge status={order.status} /></div>
            <div><p className="label">Payment</p><p>{PAYMENT_LABELS[order.paymentMethod]} · <StatusBadge status={order.paymentStatus} /></p></div>
            <div className="sm:col-span-2"><p className="label">Delivering to</p><p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />{order.customerName}, {order.address}, {order.city} - {order.pincode}</p></div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button onClick={download} disabled={busy === 'receipt'} className="btn-primary py-4">{busy === 'receipt' ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Download Receipt</button>
          <Link to={`/track-order?orderId=${encodeURIComponent(order.orderId)}`} className="btn-outline py-4">Track Order</Link>
          <Link to="/frames" className="btn-outline py-4">Continue Shopping</Link>
        </div>
        {needsPayment && <button onClick={payNow} disabled={busy === 'pay'} className="btn-gold mt-3 w-full py-4">{busy === 'pay' ? <Spinner className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />} Pay {money(order.total)} now</button>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn mt-3 w-full border border-[#25D366] py-4 text-[#128C4A] hover:bg-[#25D366] hover:text-white"><MessageCircle className="h-4 w-4" /> Message us on WhatsApp about this order</a>}
      </div>
    </div>
  );
}
