import { useSettings } from '../context/SettingsContext';
import { Spinner } from './ui';

/** Totals block. Values come from the server quote so they always match the final bill. */
export default function OrderSummary({ quote, loading, couponCode }) {
  const { money } = useSettings();
  if (!quote) {
    return <div className="flex items-center gap-2 py-4 text-sm text-charcoal-500">{loading && <Spinner className="h-4 w-4" />} Calculating your total…</div>;
  }
  const row = (label, value, strong) => (
    <div className={`flex justify-between ${strong ? 'border-t border-beige/70 pt-3 text-lg font-semibold' : 'text-sm'}`}>
      <dt className={strong ? '' : 'text-charcoal-500'}>{label}</dt>
      <dd className={strong ? 'text-bronze-600' : ''}>{value}</dd>
    </div>
  );
  return (
    <dl className={`space-y-2.5 transition ${loading ? 'opacity-60' : ''}`} aria-live="polite">
      {row('Subtotal', money(quote.subtotal))}
      {quote.discount > 0 && row(`Discount${couponCode ? ` (${couponCode})` : ''}`, `− ${money(quote.discount)}`)}
      {quote.tax > 0 && row(`Tax (${quote.taxPercent}%)`, money(quote.tax))}
      {row('Delivery charge', quote.deliveryCharge > 0 ? money(quote.deliveryCharge) : 'Free')}
      {row('Grand Total', money(quote.total), true)}
    </dl>
  );
}
