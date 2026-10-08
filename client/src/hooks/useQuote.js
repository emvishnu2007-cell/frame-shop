import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toServerItems } from '../utils/cart';

/**
 * Asks the SERVER to price the cart (frame + size + qty + coupon + delivery + tax).
 * The numbers shown to the customer, and the numbers saved on the order, come from there.
 */
export default function useQuote(items, couponCode) {
  const [state, setState] = useState({ quote: null, loading: true, error: null, couponError: null });
  const signature = JSON.stringify([toServerItems(items), couponCode || '']);

  useEffect(() => {
    if (!items.length) {
      setState({ quote: null, loading: false, error: null, couponError: null });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(async () => {
      try {
        const quote = await api.quote(toServerItems(items), couponCode);
        if (alive) setState({ quote, loading: false, error: null, couponError: null });
      } catch (e) {
        if (!alive) return;
        if (couponCode && (e.code === 'INVALID_COUPON' || e.code === 'COUPON_MIN')) {
          try {
            const quote = await api.quote(toServerItems(items), null);
            if (alive) setState({ quote, loading: false, error: null, couponError: e.message });
            return;
          } catch (e2) {
            if (alive) setState({ quote: null, loading: false, error: e2, couponError: e.message });
            return;
          }
        }
        setState({ quote: null, loading: false, error: e, couponError: null });
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return state;
}
