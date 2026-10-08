import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { formatMoney } from '../utils/format';

const SettingsContext = createContext(null);

const FALLBACK = {
  shop_name: 'Delight Digital Frames', shop_tagline: 'Premium photo frames, crafted by hand.', shop_logo: '', shop_address: '',
  shop_phone: '', shop_email: '', whatsapp_number: '', business_hours: '', maps_embed_url: '', instagram_url: '',
  facebook_url: '', delivery_charge: 0, free_delivery_above: 0, tax_percent: 0, tax_label: 'GST', currency: 'INR',
  payment_methods: { cod: true, store: true, online: false }, razorpay_key_id: null,
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { settings: s } = await api.settings();
      setSettings({ ...FALLBACK, ...s });
    } catch { /* keep fallback so the site still renders */ }
    setLoaded(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(
    () => ({ settings, loaded, refresh, money: (n) => formatMoney(n, settings.currency) }),
    [settings, loaded, refresh]
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
