import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Download, Search } from 'lucide-react';
import { api, downloadBlob } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, PAYMENT_LABELS } from '../utils/format';
import { Field, SEO, Spinner, StatusBadge } from '../components/ui';

const FLOW = ['Pending', 'Confirmed', 'Processing', 'Ready', 'Out for Delivery', 'Completed'];

export default function TrackOrder() {
  const [params] = useSearchParams();
  const { money } = useSettings();
  const toast = useToast();
  const [orderId, setOrderId] = useState(params.get('orderId') || '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setOrderId(params.get('orderId') || ''); }, [params]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setOrder(null);
    if (!orderId.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Enter your Order ID and the 10-digit mobile number used while booking.');
      return;
    }
    setBusy(true);
    try {
      const { order: o } = await api.trackOrder(orderId.trim(), phone.trim());
      setOrder(o);
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  async function receipt() {
    try { downloadBlob(await api.receipt(order.orderId, phone.trim()), `Invoice-${order.orderId}.pdf`); }
    catch (err) { toast.error(err.message); }
  }

  const cancelled = order && order.status === 'Cancelled';
  const stepIdx = order ? FLOW.indexOf(order.status) : -1;

  return (
    <>
      <SEO title="Track Your Order" description="Check the status of your frame booking using your Order ID and mobile number." />
      <div className="container-x py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className="eyebrow mb-3">Order tracking</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">Track your order</h1>
            <p className="mt-3 text-charcoal-500">Enter your Order ID and the mobile number you used while booking.</p>
          </div>

          <form onSubmit={submit} className="card mt-8 grid gap-4 p-5 sm:grid-cols-2 sm:p-7" noValidate>
            <Field label="Order ID"><input className="input font-mono uppercase" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="FRM-2026-00001" autoComplete="off" /></Field>
            <Field label="Mobile number"><input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" autoComplete="tel" /></Field>
            <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />} Track order</button>
            {error && <p className="field-error sm:col-span-2" role="alert">{error}</p>}
          </form>

          {order && (
            <div className="card mt-6 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-beige/70 bg-cream-100 p-5">
                <div><p className="font-mono text-lg font-semibold">{order.orderId}</p><p className="text-xs text-charcoal-500">Placed {formatDateTime(order.createdAt)}</p></div>
                <StatusBadge status={order.status} />
              </div>

              <div className="p-5 sm:p-7">
                {cancelled ? (
                  <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">This order was cancelled. Please contact us if you have any questions.</p>
                ) : (
                  <ol className="relative space-y-5 border-l-2 border-beige pl-7">
                    {FLOW.map((s, i) => {
                      const done = i <= stepIdx;
                      return (
                        <li key={s} className="relative">
                          <span className={`absolute -left-[38px] flex h-6 w-6 items-center justify-center rounded-full border-2 ${done ? 'border-bronze bg-bronze text-white' : 'border-beige bg-white'}`}>{done && <Check className="h-3.5 w-3.5" />}</span>
                          <p className={`text-sm ${i === stepIdx ? 'font-semibold text-charcoal' : done ? 'text-charcoal-600' : 'text-charcoal-400'}`}>{s}{i === stepIdx && <span className="ml-2 text-xs text-bronze-600">· current</span>}</p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              <div className="space-y-3 border-t border-beige/70 p-5 sm:p-7">
                {order.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {it.frameImage && <img src={it.frameImage} alt="" className="h-14 w-11 rounded-lg object-cover" />}
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold">{it.frameName}</p><p className="text-xs text-charcoal-500">{it.size} · Qty {it.quantity}</p></div>
                    <p className="font-semibold">{money(it.lineTotal)}</p>
                  </div>
                ))}
                <div className="flex justify-between border-t border-beige/70 pt-3 font-semibold"><span>Total ({PAYMENT_LABELS[order.paymentMethod]} · {order.paymentStatus})</span><span className="text-bronze-600">{money(order.total)}</span></div>
              </div>
              <div className="border-t border-beige/70 p-5"><button onClick={receipt} className="btn-outline w-full"><Download className="h-4 w-4" /> Download Receipt</button></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
