import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Frame, Home, LayoutDashboard, LogOut, Menu, Package, Settings, Tags, Users, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field, PageLoader, Spinner } from '../components/ui';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/admin/frames', label: 'Frames', icon: Frame },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

function ForcePasswordChange() {
  const { changePassword, logout } = useAuth();
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (next !== confirm) return setError('The new passwords do not match.');
    setBusy(true);
    try {
      await changePassword(cur, next);
      toast.success('Password updated. Welcome!');
    } catch (err) {
      setError(err.fields && err.fields.newPassword ? err.fields.newPassword : err.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <form onSubmit={submit} className="card w-full max-w-md p-7">
        <h1 className="font-serif text-2xl font-semibold">Set a new password</h1>
        <p className="mt-2 text-sm text-charcoal-500">For security, please replace the default password before using the admin panel.</p>
        <div className="mt-6 space-y-4">
          <Field label="Current password"><input type="password" className="input" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required /></Field>
          <Field label="New password" hint="At least 10 characters with upper-case, lower-case and a number."><input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required /></Field>
          <Field label="Confirm new password"><input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></Field>
        </div>
        {error && <p className="field-error mt-3" role="alert">{error}</p>}
        <button className="btn-primary mt-6 w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Update password</button>
        <button type="button" onClick={logout} className="mt-3 w-full text-center text-sm text-charcoal-500 hover:underline">Sign out</button>
      </form>
    </div>
  );
}

export default function AdminLayout() {
  const { admin, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  if (!ready) return <PageLoader />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (admin.mustChangePassword) return <ForcePasswordChange />;

  const nav = (
    <nav className="space-y-1" aria-label="Admin">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-bronze text-white' : 'text-cream/70 hover:bg-white/10 hover:text-cream'}`}>
          <n.icon className="h-4 w-4" /> {n.label}
        </NavLink>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-1 border-t border-white/10 pt-4">
      <Link to="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-cream/70 hover:bg-white/10"><Home className="h-4 w-4" /> View website</Link>
      <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-cream/70 hover:bg-white/10"><LogOut className="h-4 w-4" /> Sign out</button>
      <p className="truncate px-4 pt-2 text-xs text-cream/40">{admin.email}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100 lg:flex">
      <Helmet><title>Admin | Frame Shop</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-charcoal p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div><p className="mb-6 px-4 pt-2 font-serif text-xl text-cream">Admin Panel</p>{nav}</div>
        {footer}
      </aside>

      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-charcoal px-4 text-cream lg:hidden">
        <span className="font-serif text-lg">Admin Panel</span>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2"><Menu className="h-6 w-6" /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col justify-between bg-charcoal p-4">
            <div>
              <div className="mb-6 flex items-center justify-between px-2 pt-1"><span className="font-serif text-xl text-cream">Admin Panel</span><button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 text-cream"><X className="h-5 w-5" /></button></div>
              {nav}
            </div>
            {footer}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  );
}
