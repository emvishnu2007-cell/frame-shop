import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Field, Spinner } from '../../components/ui';

export default function AdminLogin() {
  const { admin, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dest = (location.state && location.state.from) || '/admin';

  if (ready && admin) return <Navigate to={dest} replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.fields && (err.fields.email || err.fields.password) ? (err.fields.email || err.fields.password) : err.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cream to-beige-100 p-4">
      <Helmet><title>Admin Login | Frame Shop</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <form onSubmit={submit} className="card w-full max-w-md p-7 sm:p-9" noValidate>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-charcoal text-bronze-400"><Lock className="h-6 w-6" /></span>
        <h1 className="mt-5 text-center font-serif text-2xl font-semibold">Admin sign in</h1>
        <p className="mt-1 text-center text-sm text-charcoal-500">Authorised staff only.</p>
        <div className="mt-7 space-y-4">
          <Field label="Email"><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></Field>
          <Field label="Password"><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
        </div>
        {error && <p className="field-error mt-3" role="alert">{error}</p>}
        <button className="btn-primary mt-6 w-full py-3.5" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Sign in</button>
        <Link to="/" className="mt-4 block text-center text-sm text-charcoal-500 hover:underline">← Back to website</Link>
      </form>
    </div>
  );
}
