import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, ShoppingBag, ShieldCheck, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/frames', label: 'Frames' },
  { to: '/create', label: 'Custom Frame' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/track-order', label: 'Track Order' },
];

export function Logo({ light = false }) {
  const { settings } = useSettings();
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={`${settings.shop_name} home`}>
      {settings.shop_logo ? (
        <img src={settings.shop_logo} alt="" className="h-9 w-9 rounded-lg object-contain" />
      ) : (
        <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border-2 border-bronze">
          <span className="h-4 w-4 rounded-[2px] bg-bronze" />
        </span>
      )}
      <span className={`font-serif text-xl font-semibold tracking-tight ${light ? 'text-cream' : 'text-charcoal'}`}>{settings.shop_name}</span>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count, bump } = useCart();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const linkCls = ({ isActive }) =>
    `relative px-3 py-2 text-sm font-medium transition ${isActive ? 'text-charcoal after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-bronze' : 'text-charcoal-500 hover:text-charcoal'}`;

  return (
    <header className={`sticky top-0 z-50 transition ${scrolled ? 'border-b border-beige/70 bg-cream/90 shadow-card backdrop-blur-md' : 'bg-cream'}`}>
      <div className="container-x flex h-16 items-center justify-between lg:h-[72px]">
        <Logo />
        <nav className="hidden items-center lg:flex" aria-label="Main">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>{l.label}</NavLink>)}
        </nav>
        <div className="flex items-center gap-1.5">
          <Link to="/admin/login" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-charcoal-500 hover:bg-beige/60 hover:text-charcoal xl:flex">
            <ShieldCheck className="h-4 w-4" /> Admin
          </Link>
          <Link to="/cart" className="relative flex h-11 items-center gap-2 rounded-full bg-charcoal px-4 text-sm font-semibold text-cream transition hover:bg-charcoal-700" aria-label={`Cart, ${count} items`}>
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            <AnimatePresence mode="popLayout">
              {count > 0 && (
                <motion.span key={`${count}-${bump}`} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="flex h-5 min-w-5 items-center justify-center rounded-full bg-bronze px-1.5 text-[11px] font-bold">{count}</motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-beige/60 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute inset-x-0 top-full h-[calc(100dvh-4rem)] overflow-y-auto border-t border-beige/70 bg-cream lg:hidden" aria-label="Mobile">
            <ul className="container-x py-4">
              {[...LINKS, { to: '/cart', label: 'Cart / Booking' }, { to: '/admin/login', label: 'Admin Login' }].map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} end={l.end} className={({ isActive }) => `block border-b border-beige/60 py-4 font-serif text-xl ${isActive ? 'text-bronze' : 'text-charcoal'}`}>{l.label}</NavLink>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
