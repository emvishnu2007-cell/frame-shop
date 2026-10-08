import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'frameshop_cart_v1';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

/**
 * Cart items hold what is needed to RENDER the cart (snapshot) plus the ids the server
 * needs to PRICE it. The server never trusts the snapshot prices.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  }, [items]);

  const add = useCallback((item) => {
    setItems((prev) => {
      const key = `${item.frameId}-${item.sizeId}-${item.photoPath}-${item.orientation}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(50, i.quantity + item.quantity) } : i));
      return [...prev, { ...item, key }];
    });
    setBump((b) => b + 1);
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    const q = Math.max(1, Math.min(50, Number(quantity) || 1));
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: q } : i)));
  }, []);

  const remove = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    estimate: items.reduce((s, i) => s + i.snapshot.unitPrice * i.quantity, 0),
    bump,
    add, setQuantity, remove, clear,
  }), [items, bump, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
