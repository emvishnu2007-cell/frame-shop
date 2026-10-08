import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Frame, IndianRupee, Package, Users } from 'lucide-react';
import { api } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { formatMoney, formatDateTime } from '../../utils/format';
import { ErrorState, PageLoader, StatusBadge } from '../../components/ui';

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-6 w-6" /></span>
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">{label}</p><p className="truncate font-serif text-2xl font-semibold">{value}</p></div>
    </div>
  );
}

function RevenueChart({ daily, currency }) {
  const max = Math.max(1, ...daily.map((d) => d.revenue));
  const W = 700; const H = 200; const pad = 24;
  const bw = (W - pad * 2) / daily.length;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full" role="img" aria-label="Revenue for the last 14 days">
        {[0, 0.5, 1].map((t) => <line key={t} x1={pad} x2={W - pad} y1={H - t * (H - 16)} y2={H - t * (H - 16)} stroke="#E9D7DA" strokeDasharray="4 4" />)}
        {daily.map((d, i) => {
          const h = (d.revenue / max) * (H - 16);
          return (
            <g key={d.date}>
              <rect x={pad + i * bw + 4} y={H - h} width={bw - 8} height={Math.max(h, d.revenue > 0 ? 2 : 0)} rx="4" fill="#C88F9F"><title>{`${d.date}: ${formatMoney(d.revenue, currency)} (${d.orders} orders)`}</title></rect>
              <text x={pad + i * bw + bw / 2} y={H + 18} textAnchor="middle" fontSize="10" fill="#9B6D7C">{d.date.slice(8)}</text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-charcoal-400">Day of month · peak {formatMoney(max, currency)}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: s, loading, error, reload } = useFetch(() => api.adminStats());
  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  const money = (n) => formatMoney(n, s.currency);
  const totalStatus = Math.max(1, s.statusBreakdown.reduce((n, x) => n + x.count, 0));

  return (
    <div className="space-y-6">
      <div><h1 className="font-serif text-3xl font-semibold">Dashboard</h1><p className="text-sm text-charcoal-500">A quick look at how the shop is doing.</p></div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat icon={Package} label="Total orders" value={s.totalOrders} tone="bg-sky-100 text-sky-700" />
        <Stat icon={Clock} label="Pending orders" value={s.pendingOrders} tone="bg-amber-100 text-amber-700" />
        <Stat icon={CheckCircle2} label="Completed orders" value={s.completedOrders} tone="bg-emerald-100 text-emerald-700" />
        <Stat icon={IndianRupee} label="Total revenue" value={money(s.totalRevenue)} tone="bg-beige text-bronze-700" />
        <Stat icon={Users} label="Total customers" value={s.totalCustomers} tone="bg-violet-100 text-violet-700" />
        <Stat icon={Frame} label="Total frames" value={s.totalFrames} tone="bg-rose-100 text-rose-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2"><h2 className="mb-4 font-serif text-xl">Revenue · last 14 days</h2><RevenueChart daily={s.daily} currency={s.currency} /><p className="mt-2 text-xs text-charcoal-400">Cancelled orders are excluded from revenue.</p></section>
        <section className="card p-5">
          <h2 className="mb-4 font-serif text-xl">Orders by status</h2>
          {s.statusBreakdown.length === 0 ? <p className="text-sm text-charcoal-500">No orders yet.</p> : (
            <ul className="space-y-3">
              {s.statusBreakdown.map((x) => (
                <li key={x.status}>
                  <div className="mb-1 flex justify-between text-sm"><span>{x.status}</span><span className="font-semibold">{x.count}</span></div>
                  <div className="h-2 rounded-full bg-beige/60"><div className="h-2 rounded-full bg-bronze" style={{ width: `${(x.count / totalStatus) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-serif text-xl">Recent orders</h2><Link to="/admin/orders" className="text-sm text-bronze-600 hover:underline">View all</Link></div>
          {s.recentOrders.length === 0 ? <p className="text-sm text-charcoal-500">Bookings will appear here.</p> : (
            <ul className="divide-y divide-beige/70">
              {s.recentOrders.map((o) => (
                <li key={o.orderId} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0"><p className="font-mono font-semibold">{o.orderId}</p><p className="truncate text-xs text-charcoal-500">{o.customerName} · {formatDateTime(o.createdAt)}</p></div>
                  <div className="text-right"><p className="font-semibold">{money(o.total)}</p><StatusBadge status={o.status} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 font-serif text-xl">Best sellers</h2>
            {s.topFrames.length === 0 ? <p className="text-sm text-charcoal-500">No sales yet.</p> : (
              <ul className="space-y-2 text-sm">{s.topFrames.map((f) => <li key={f.name} className="flex justify-between"><span className="truncate pr-3">{f.name}</span><span className="shrink-0 text-charcoal-500">{f.sold} sold · {money(f.revenue)}</span></li>)}</ul>
            )}
          </section>
          <section className="card p-5">
            <h2 className="mb-4 font-serif text-xl">Low stock</h2>
            {s.lowStock.length === 0 ? <p className="text-sm text-charcoal-500">All frames are well stocked.</p> : (
              <ul className="space-y-2 text-sm">{s.lowStock.map((f) => <li key={f.id} className="flex justify-between"><span>{f.name} <span className="text-xs text-charcoal-400">({f.code})</span></span><span className={f.stock === 0 ? 'font-semibold text-red-600' : 'text-amber-700'}>{f.stock} left</span></li>)}</ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
