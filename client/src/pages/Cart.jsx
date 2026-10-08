import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BadgePercent, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import useQuote from '../hooks/useQuote';
import FramePreview from '../components/FramePreview';
import OrderSummary from '../components/OrderSummary';
import { EmptyState, QuantityInput, SEO } from '../components/ui';

export const COUPON_KEY = 'frameshop_coupon';

export default function Cart() {
  const cart = useCart();
  const { money } = useSettings();
  const [coupon, setCoupon] = useState(() => { try { return sessionStorage.getItem(COUPON_KEY) || ''; } catch { return ''; } });
  const [input, setInput] = useState(coupon);
  const { quote, loading, error, couponError } = useQuote(cart.items, coupon);

  const apply = (e) => {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    setCoupon(code);
    try { code ? sessionStorage.setItem(COUPON_KEY, code) : sessionStorage.removeItem(COUPON_KEY); } catch { /* ignore */ }
  };

  if (cart.items.length === 0) {
    return (
      <>
        <SEO title="Your Cart" />
        <div className="container-x py-16">
          <EmptyState title="Your cart is empty" message="Choose a frame, upload your photo and it will appear here." action={<Link to="/frames" className="btn-primary"><ShoppingBag className="h-4 w-4" /> Browse frames</Link>} />
        </div>
      </>
    );
  }

  const couponApplied = quote && quote.couponCode;

  return (
    <>
      <SEO title="Your Cart" />
      <div className="container-x py-8 sm:py-12">
        <h1 className="mb-8 text-3xl font-semibold sm:text-4xl">Your Cart</h1>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <ul className="space-y-4">
            <AnimatePresence initial={false}>
              {cart.items.map((it) => (
                <motion.li key={it.key} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} className="card flex gap-4 p-4 sm:gap-6 sm:p-5">
                  <div className="w-24 shrink-0 sm:w-32">
                    <FramePreview colorHex={it.snapshot.colorHex} matHex={it.snapshot.matHex} borderStyle={it.snapshot.borderStyle} photoUrl={it.photoPath}
                      widthIn={it.snapshot.widthIn} heightIn={it.snapshot.heightIn} orientation={it.orientation} placeholder={false} maxHeight={150} alt={`Your photo in ${it.snapshot.name}`} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/frames/${it.frameId}`} className="block truncate font-serif text-lg font-semibold hover:text-bronze-600">{it.snapshot.name}</Link>
                        <p className="text-xs text-charcoal-500">{it.snapshot.color} · {it.snapshot.material}</p>
                        <p className="mt-1 text-sm">Size: <strong>{it.snapshot.sizeLabel}</strong> <span className="text-charcoal-400">({it.orientation})</span></p>
                      </div>
                      <button onClick={() => cart.remove(it.key)} className="rounded-full p-2 text-charcoal-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${it.snapshot.name}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                      <QuantityInput size="sm" value={it.quantity} onChange={(q) => cart.setQuantity(it.key, q)} />
                      <div className="text-right">
                        <p className="text-xs text-charcoal-500">{money(it.snapshot.unitPrice)} each</p>
                        <p className="text-lg font-semibold">{money(it.snapshot.unitPrice * it.quantity)}</p>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
            <li><button onClick={cart.clear} className="text-sm text-charcoal-500 underline hover:text-red-600">Clear cart</button></li>
          </ul>

          <aside className="card h-fit p-6 lg:sticky lg:top-24">
            <h2 className="mb-5 font-serif text-xl">Order summary</h2>
            <form onSubmit={apply} className="mb-5">
              <label className="label" htmlFor="coupon">Discount code</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <BadgePercent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
                  <input id="coupon" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter code" className="input !pl-9 uppercase" />
                </div>
                <button className="btn-outline btn-sm" type="submit">Apply</button>
              </div>
              {couponError && <p className="field-error" role="alert">{couponError}</p>}
              {couponApplied && <p className="mt-1 text-xs text-emerald-700">Code {quote.couponCode} applied.</p>}
            </form>

            {error ? (
              <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{error.message}</p>
            ) : (
              <OrderSummary quote={quote} loading={loading} couponCode={couponApplied} />
            )}
            <Link to="/checkout" aria-disabled={Boolean(error)} onClick={(e) => error && e.preventDefault()} className={`btn-primary mt-6 w-full py-4 ${error ? 'pointer-events-none opacity-50' : ''}`}>Proceed to Checkout <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/frames" className="mt-3 block text-center text-sm text-charcoal-500 hover:text-charcoal">Continue shopping</Link>
          </aside>
        </div>
      </div>
    </>
  );
}
