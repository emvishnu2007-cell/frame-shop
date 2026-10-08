import { useEffect, useState } from 'react';
import { Ban, ChevronLeft, ChevronRight, Download, Eye, Mail, Search } from 'lucide-react';
import { api, downloadBlob } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, formatMoney, ORDER_STATUSES, PAYMENT_LABELS, PAYMENT_STATUSES, whatsappLink } from '../../utils/format';
import { EmptyState, ErrorState, Modal, PageLoader, Spinner, StatusBadge } from '../../components/ui';

const FILTERS = ['all', 'Pending', 'Confirmed', 'Processing', 'Ready', 'Out for Delivery', 'Completed', 'Cancelled'];

function OrderModal({ id, onClose, onChanged }) {
  const toast = useToast();
  const { settings } = useSettings();
  const { data, loading, error, reload } = useFetch(() => (id ? api.adminOrder(id) : Promise.resolve(null)), [id]);
  const [busy, setBusy] = useState('');
  const [notify, setNotify] = useState(true);
  const order = data && data.order;
  const money = (n) => formatMoney(n, order ? order.currency : settings.currency);

  async function update(patch, label) {
    setBusy(label);
    try {
      const r = await api.updateOrder(id, { ...patch, notifyCustomer: notify });
      toast.success(r.customerNotified === true ? 'Updated. Customer notified by email.' : r.customerNotified === false ? 'Updated. (Email could not be sent.)' : 'Updated.');
      reload();
      onChanged();
    } catch (e) { toast.error(e.message); }
    setBusy('');
  }

  async function invoice() {
    setBusy('pdf');
    try { downloadBlob(await api.adminReceipt(id), `Invoice-${id}.pdf`); } catch (e) { toast.error(e.message); }
    setBusy('');
  }

  async function resend() {
    setBusy('mail');
    try { const r = await api.resendEmail(id); toast.success(r.message); onChanged(); } catch (e) { toast.error(e.message); }
    setBusy('');
  }

  const wa = order && whatsappLink(`91${order.phone.replace(/\D/g, '').slice(-10)}`, `Hello ${order.customerName}, regarding your order ${order.orderId} at ${settings.shop_name}.`);

  return (
    <Modal open={Boolean(id)} onClose={onClose} title={`Order ${id || ''}`} wide>
      {loading || !order ? (error ? <ErrorState message={error.message} onRetry={reload} /> : <PageLoader />) : (
        <div className="space-y-6 text-sm">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge status={order.status} /><StatusBadge status={order.paymentStatus} /><span className="text-charcoal-500">{formatDateTime(order.createdAt)}</span>
            <span className={`badge ${order.emailStatus === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>Email: {order.emailStatus.replace('_', ' ')}</span></div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-cream-100 p-4"><p className="label">Customer</p><p className="font-semibold">{order.customerName}</p><p>{order.phone}</p><p className="break-all">{order.email}</p></div>
            <div className="rounded-xl bg-cream-100 p-4"><p className="label">Delivery address</p><p>{order.address}</p><p>{order.city} - {order.pincode}</p>{order.notes && <p className="mt-2 text-charcoal-500"><strong>Notes:</strong> {order.notes}</p>}</div>
          </div>

          <div className="space-y-3">
            {order.items.map((it, i) => (
              <div key={i} className="flex flex-wrap items-center gap-4 rounded-xl border border-beige/70 p-3">
                {it.photoPath ? <a href={it.photoPath} target="_blank" rel="noopener noreferrer" title="Open customer photo in full size"><img src={it.photoPath} alt="Customer upload" className="h-20 w-20 rounded-lg object-cover" /></a> : <div className="h-20 w-20 rounded-lg bg-beige" />}
                <div className="min-w-0 flex-1"><p className="font-semibold">{it.frameName} <span className="text-xs font-normal text-charcoal-400">({it.frameCode})</span></p><p className="text-charcoal-500">{it.design}</p><p>{it.size} · {it.orientation} · Qty {it.quantity}</p></div>
                <div className="text-right"><p className="text-xs text-charcoal-500">{money(it.unitPrice)} each</p><p className="font-semibold">{money(it.lineTotal)}</p></div>
              </div>
            ))}
          </div>

          <dl className="ml-auto max-w-xs space-y-1.5">
            <div className="flex justify-between"><dt className="text-charcoal-500">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between"><dt className="text-charcoal-500">Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>− {money(order.discount)}</dd></div>}
            {order.tax > 0 && <div className="flex justify-between"><dt className="text-charcoal-500">Tax</dt><dd>{money(order.tax)}</dd></div>}
            <div className="flex justify-between"><dt className="text-charcoal-500">Delivery</dt><dd>{order.deliveryCharge > 0 ? money(order.deliveryCharge) : 'Free'}</dd></div>
            <div className="flex justify-between border-t border-beige/70 pt-2 text-base font-semibold"><dt>Total</dt><dd className="text-bronze-600">{money(order.total)}</dd></div>
            <p className="text-right text-xs text-charcoal-400">{PAYMENT_LABELS[order.paymentMethod]}</p>
          </dl>

          <div className="grid gap-4 rounded-xl border border-beige/70 p-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="o-status">Order status</label>
              <select id="o-status" className="input" value={order.status} disabled={Boolean(busy) || order.status === 'Cancelled'} onChange={(e) => update({ status: e.target.value }, 'status')}>
                {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select></div>
            <div><label className="label" htmlFor="o-pay">Payment status</label>
              <select id="o-pay" className="input" value={order.paymentStatus} disabled={Boolean(busy)} onChange={(e) => update({ paymentStatus: e.target.value }, 'pay')}>
                {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select></div>
            <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[#C88F9F]" /> Email the customer when the status changes</label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn-outline btn-sm" onClick={invoice} disabled={busy === 'pdf'}>{busy === 'pdf' ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />} Download invoice</button>
            <button className="btn-outline btn-sm" onClick={resend} disabled={busy === 'mail'}>{busy === 'mail' ? <Spinner className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />} Resend confirmation</button>
            {wa && <a className="btn-outline btn-sm" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp customer</a>}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Orders() {
  const toast = useToast();
  const { settings } = useSettings();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [busy, setBusy] = useState(false);
  const money = (n) => formatMoney(n, settings.currency);

  useEffect(() => { const t = setTimeout(() => { setTerm(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data, loading, error, reload } = useFetch(() => api.adminOrders({ status, q: term, page }), [status, term, page]);

  async function quickInvoice(o) {
    try { downloadBlob(await api.adminReceipt(o.orderId), `Invoice-${o.orderId}.pdf`); } catch (e) { toast.error(e.message); }
  }

  async function doCancel() {
    setBusy(true);
    try { await api.cancelOrder(cancel.orderId); toast.success(`Order ${cancel.orderId} cancelled.`); setCancel(null); reload(); } catch (e) { toast.error(e.message); setCancel(null); }
    setBusy(false);
  }

  const actions = (o) => (
    <div className="flex flex-wrap gap-1.5">
      <button className="btn-outline btn-sm" onClick={() => setOpenId(o.orderId)} title="View / update status"><Eye className="h-3.5 w-3.5" /> View</button>
      <button className="btn-ghost btn-sm" onClick={() => quickInvoice(o)} title="Download invoice"><Download className="h-3.5 w-3.5" /></button>
      {o.status !== 'Cancelled' && o.status !== 'Completed' && <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setCancel(o)} title="Cancel order"><Ban className="h-3.5 w-3.5" /></button>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="font-serif text-3xl font-semibold">Orders</h1><p className="text-sm text-charcoal-500">View bookings, update their status and download invoices.</p></div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" /><input className="input pl-11" placeholder="Search order ID, name, phone, email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" /></div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => <button key={f} onClick={() => { setStatus(f); setPage(1); }} className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${status === f ? 'border-charcoal bg-charcoal text-cream' : 'border-beige-300 bg-white hover:border-charcoal'}`}>{f === 'all' ? 'All' : f}</button>)}
        </div>
      </div>

      {loading ? <PageLoader /> : error ? <ErrorState message={error.message} onRetry={reload} /> : data.orders.length === 0 ? <EmptyState title="No orders found" message="Try another filter or search." /> : (
        <>
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[960px]">
              <thead className="border-b border-beige/70 bg-cream-100"><tr>{['Order ID', 'Customer', 'Phone', 'Frame', 'Size', 'Amount', 'Payment', 'Status', 'Date', 'Actions'].map((h) => <th key={h} className="table-th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-beige/60">
                {data.orders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-cream-100/60">
                    <td className="table-td font-mono text-xs font-semibold">{o.orderId}</td>
                    <td className="table-td font-semibold">{o.customerName}</td>
                    <td className="table-td">{o.phone}</td>
                    <td className="table-td">{o.items[0] ? o.items[0].frameName : '-'}{o.items.length > 1 && <span className="text-xs text-charcoal-400"> +{o.items.length - 1} more</span>}</td>
                    <td className="table-td">{o.items[0] ? o.items[0].size : '-'}</td>
                    <td className="table-td font-semibold">{money(o.total)}</td>
                    <td className="table-td"><StatusBadge status={o.paymentStatus} /></td>
                    <td className="table-td"><StatusBadge status={o.status} /></td>
                    <td className="table-td whitespace-nowrap text-xs text-charcoal-500">{formatDateTime(o.createdAt)}</td>
                    <td className="table-td">{actions(o)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {data.orders.map((o) => (
              <div key={o.orderId} className="card p-4 text-sm">
                <div className="flex items-start justify-between gap-3"><div><p className="font-mono font-semibold">{o.orderId}</p><p className="text-xs text-charcoal-500">{formatDateTime(o.createdAt)}</p></div><StatusBadge status={o.status} /></div>
                <p className="mt-3 font-semibold">{o.customerName} <span className="font-normal text-charcoal-500">· {o.phone}</span></p>
                <p className="text-charcoal-500">{o.items[0] ? `${o.items[0].frameName} · ${o.items[0].size}` : ''}{o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}</p>
                <div className="mt-3 flex items-center justify-between border-t border-beige/70 pt-3"><div><p className="font-semibold">{money(o.total)}</p><StatusBadge status={o.paymentStatus} /></div>{actions(o)}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-charcoal-500">
            <span>{data.total} order{data.total === 1 ? '' : 's'} · page {data.page} of {data.pages}</span>
            <div className="flex gap-2">
              <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Prev</button>
              <button className="btn-outline btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      )}

      {openId && <OrderModal id={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
      <Modal open={Boolean(cancel)} onClose={() => setCancel(null)} title="Cancel this order?">
        <p className="text-sm text-charcoal-600">Order <strong>{cancel && cancel.orderId}</strong> will be marked Cancelled, stock will be returned, and the customer will be emailed. A cancelled order cannot be reopened.</p>
        <div className="mt-6 flex justify-end gap-3"><button className="btn-ghost" onClick={() => setCancel(null)}>Keep order</button><button className="btn-danger" onClick={doCancel} disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Cancel order</button></div>
      </Modal>
    </div>
  );
}
