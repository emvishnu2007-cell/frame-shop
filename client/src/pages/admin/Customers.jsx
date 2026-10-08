import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { formatDate, formatMoney } from '../../utils/format';
import { useSettings } from '../../context/SettingsContext';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui';

export default function Customers() {
  const { settings } = useSettings();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const t = setTimeout(() => setTerm(q), 300); return () => clearTimeout(t); }, [q]);
  const { data, loading, error, reload } = useFetch(() => api.adminCustomers({ q: term }), [term]);
  const money = (n) => formatMoney(n, settings.currency);

  return (
    <div className="space-y-6">
      <div><h1 className="font-serif text-3xl font-semibold">Customers</h1><p className="text-sm text-charcoal-500">Everyone who has booked with you.</p></div>
      <div className="relative max-w-sm"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" /><input className="input pl-11" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" /></div>

      {loading ? <PageLoader /> : error ? <ErrorState message={error.message} onRetry={reload} /> : data.customers.length === 0 ? <EmptyState title="No customers found" /> : (
        <>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-beige/70 bg-cream-100"><tr>{['Name', 'Phone', 'Email', 'Orders', 'Total spent', 'Last order'].map((h) => <th key={h} className="table-th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-beige/60">
                {data.customers.map((c) => (
                  <tr key={c.id} className="hover:bg-cream-100/60">
                    <td className="table-td font-semibold">{c.name}<span className="block text-xs font-normal text-charcoal-400">{c.city}</span></td>
                    <td className="table-td">{c.phone}</td>
                    <td className="table-td break-all">{c.email}</td>
                    <td className="table-td">{c.orders}</td>
                    <td className="table-td font-semibold">{money(c.totalSpent)}</td>
                    <td className="table-td text-charcoal-500">{c.lastOrder ? formatDate(c.lastOrder) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {data.customers.map((c) => (
              <div key={c.id} className="card p-4 text-sm">
                <p className="font-semibold">{c.name}</p>
                <p className="text-charcoal-500">{c.phone}</p>
                <p className="break-all text-charcoal-500">{c.email}</p>
                <div className="mt-3 flex justify-between border-t border-beige/70 pt-3"><span>{c.orders} orders</span><span className="font-semibold">{money(c.totalSpent)}</span><span className="text-charcoal-500">{c.lastOrder ? formatDate(c.lastOrder) : '-'}</span></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
