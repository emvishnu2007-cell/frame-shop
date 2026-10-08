import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, Store, Truck } from 'lucide-react';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import useQuote from '../hooks/useQuote';
import { toServerItems } from '../utils/cart';
import { payOnline } from '../utils/razorpay';
import { COUPON_KEY } from './Cart';
import OrderSummary from '../components/OrderSummary';
import FramePreview from '../components/FramePreview';
import { Field, SEO, Spinner } from '../components/ui';

export const LAST_ORDER_KEY = 'frameshop_last_order';

const EMPTY = { name: '', phone: '', email: '', address: '', city: '', pincode: '', notes: '' };

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Full name is required';
  if (!/^\+?[0-9\s-]{10,15}$/.test(f.phone.trim()) || f.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid mobile number';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (f.address.trim().length < 5) e.address = 'Delivery address is required';
  if (f.city.trim().length < 2) e.city = 'City is required';
  if (!/^[0-9]{6}$/.test(f.pincode.trim())) e.pincode = 'Enter a valid 6-digit pincode';
  return e;
}

export default function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();
  const toast = useToast();
  const { settings, money } = useSettings();
  const [form, setForm] = useState(() => {
    try { return { ...EMPTY, ...(JSON.parse(localStorage.getItem('frameshop_customer') || '{}')) }; } catch { return EMPTY; }
  });
  const [errors, setErrors] = useState({});
  const [payment, setPayment] = useState('cod');
  const [busy, setBusy] = useState(false);
  const coupon = (() => { try { return sessionStorage.getItem(COUPON_KEY) || ''; } catch { return ''; } })();
  const { quote, loading, error, couponError } = useQuote(cart.items, coupon);

  useEffect(() => {
    if (payment === 'online' && !settings.payment_methods.online) setPayment('cod');
  }, [settings, payment]);

  if (cart.items.length === 0 && !busy) return <Navigate to="/cart" replace />;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) {
      toast.error('Please fix the highlighted fields.');
      document.querySelector('[data-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    try {
      const body = {
        customer: { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim() },
        items: toServerItems(cart.items),
        paymentMethod: payment,
        couponCode: coupon && quote && quote.couponCode ? coupon : null,
      };
      const res = await api.createOrder(body);
      try { localStorage.setItem('frameshop_customer', JSON.stringify({ ...form, notes: '' })); } catch { /* ignore */ }

      let order = res.order;
      let paymentNote = null;
      if (payment === 'online') {
        try {
          const r = await payOnline(order, settings.shop_name);
          if (r.paid) order = { ...order, paymentStatus: 'Paid' };
          else paymentNote = 'Your booking is saved but payment is not complete yet. You can pay now from this page.';
        } catch (err) {
          paymentNote = err.message;
        }
      }

      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ order, email: res.email, paymentNote }));
        sessionStorage.removeItem(COUPON_KEY);
      } catch { /* ignore */ }
      cart.clear();
      navigate(`/order-success/${order.orderId}`, { replace: true });
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) {
        const mapped = {};
        Object.entries(err.fields).forEach(([k, m]) => { mapped[k.replace('customer.', '')] = m; });
        setErrors(mapped);
      }
      toast.error(err.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  const inp = (k) => ({ id: k, value: form[k], onChange: set(k), 'data-invalid': errors[k] ? 'true' : undefined, className: `input ${errors[k] ? 'input-error' : ''}`, 'aria-invalid': Boolean(errors[k]) });

  const methods = [
    { key: 'cod', label: 'Cash on Delivery', icon: Truck, note: 'Pay in cash when your frame arrives.', enabled: true },
    { key: 'store', label: 'Pay at Store', icon: Store, note: 'Collect from our store and pay there.', enabled: true },
    { key: 'online', label: 'Pay Online', icon: CreditCard, note: settings.payment_methods.online ? 'UPI, cards and netbanking via Razorpay.' : 'Not available right now.', enabled: settings.payment_methods.online },
  ];

  return (
    <>
      <SEO title="Checkout" />
      <div className="container-x py-8 sm:py-12">
        <h1 className="mb-8 text-3xl font-semibold sm:text-4xl">Checkout &amp; Booking</h1>
        <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <section className="card p-5 sm:p-7">
              <h2 className="mb-5 font-serif text-xl">Your details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" error={errors.name}><input {...inp('name')} autoComplete="name" /></Field>
                <Field label="Mobile number" error={errors.phone}><input {...inp('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" /></Field>
                <div className="sm:col-span-2"><Field label="Email address" error={errors.email} hint="Your booking confirmation and receipt are sent here."><input {...inp('email')} type="email" autoComplete="email" /></Field></div>
                <div className="sm:col-span-2"><Field label="Delivery address" error={errors.address}><textarea {...inp('address')} rows={3} autoComplete="street-address" /></Field></div>
                <Field label="City" error={errors.city}><input {...inp('city')} autoComplete="address-level2" /></Field>
                <Field label="Pincode" error={errors.pincode}><input {...inp('pincode')} inputMode="numeric" maxLength={6} autoComplete="postal-code" /></Field>
                <div className="sm:col-span-2"><Field label="Special instructions (optional)" error={errors.notes}><textarea {...inp('notes')} rows={2} maxLength={1000} placeholder="Gift message, preferred delivery time, crop preferences…" /></Field></div>
              </div>
            </section>

            <section className="card p-5 sm:p-7">
              <h2 className="mb-5 font-serif text-xl">Payment method</h2>
              <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
                {methods.map((m) => (
                  <button key={m.key} type="button" role="radio" aria-checked={payment === m.key} disabled={!m.enabled} onClick={() => setPayment(m.key)}
                    className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${payment === m.key ? 'border-bronze bg-beige/40 ring-2 ring-bronze/20' : 'border-beige-300 hover:border-charcoal'}`}>
                    <m.icon className="h-5 w-5 text-bronze" />
                    <span className="mt-2 block text-sm font-semibold">{m.label}</span>
                    <span className="mt-0.5 block text-xs text-charcoal-500">{m.note}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="card h-fit p-6 lg:sticky lg:top-24">
            <h2 className="mb-4 font-serif text-xl">Order summary</h2>
            <ul className="mb-5 max-h-72 space-y-4 overflow-y-auto pr-1">
              {cart.items.map((it) => (
                <li key={it.key} className="flex gap-3">
                  <div className="w-14 shrink-0">
                    <FramePreview colorHex={it.snapshot.colorHex} matHex={it.snapshot.matHex} borderStyle={it.snapshot.borderStyle} photoUrl={it.photoPath} widthIn={it.snapshot.widthIn} heightIn={it.snapshot.heightIn} orientation={it.orientation} placeholder={false} maxHeight={70} alt="" />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-semibold">{it.snapshot.name}</p>
                    <p className="text-xs text-charcoal-500">{it.snapshot.sizeLabel} · Qty {it.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">{money(it.snapshot.unitPrice * it.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-beige/70 pt-4">
              {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{error.message} <Link to="/cart" className="underline">Review cart</Link></p> : <OrderSummary quote={quote} loading={loading} couponCode={quote && quote.couponCode} />}
              {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
            </div>
            <button type="submit" className="btn-primary mt-6 w-full py-4 text-base" disabled={busy || Boolean(error) || !quote}>
              {busy ? <><Spinner className="h-4 w-4" /> Confirming…</> : <><Lock className="h-4 w-4" /> Confirm Booking</>}
            </button>
            <p className="mt-3 text-center text-xs text-charcoal-400">The final amount is calculated securely on our server.</p>
          </aside>
        </form>
      </div>
    </>
  );
}
