import { useEffect, useRef, useState } from 'react';
import { Mail, Plus, Save, Trash2, Upload } from 'lucide-react';
import { api } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { ErrorState, Field, PageLoader, Spinner } from '../../components/ui';

function Section({ title, note, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-serif text-xl">{title}</h2>
      {note && <p className="mb-4 mt-1 text-sm text-charcoal-500">{note}</p>}
      <div className={`grid gap-4 sm:grid-cols-2 ${note ? '' : 'mt-4'}`}>{children}</div>
    </section>
  );
}

function Coupons() {
  const toast = useToast();
  const { data, loading, reload } = useFetch(() => api.coupons());
  const [form, setForm] = useState({ code: '', percentOff: 10, minSubtotal: 0 });
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.saveCoupon(null, { code: form.code, percentOff: Number(form.percentOff), minSubtotal: Number(form.minSubtotal) || 0, isActive: true });
      toast.success('Coupon added.');
      setForm({ code: '', percentOff: 10, minSubtotal: 0 });
      reload();
    } catch (err) { toast.error(err.fields ? Object.values(err.fields)[0] : err.message); }
    setBusy(false);
  }
  async function toggle(c) { try { await api.saveCoupon(c.id, { code: c.code, percentOff: c.percentOff, minSubtotal: c.minSubtotal, isActive: !c.isActive }); reload(); } catch (e) { toast.error(e.message); } }
  async function del(c) { try { await api.deleteCoupon(c.id); reload(); } catch (e) { toast.error(e.message); } }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-serif text-xl">Discount coupons</h2>
      <p className="mb-4 mt-1 text-sm text-charcoal-500">Customers enter these in the cart. Discounts are validated on the server.</p>
      {loading ? <Spinner /> : (
        <ul className="mb-4 divide-y divide-beige/70">
          {data.coupons.length === 0 && <li className="py-2 text-sm text-charcoal-500">No coupons yet.</li>}
          {data.coupons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span><strong className="font-mono">{c.code}</strong> · {c.percentOff}% off{c.minSubtotal > 0 && ` · min ${c.minSubtotal}`}</span>
              <span className="flex gap-2"><button type="button" className="btn-outline btn-sm" onClick={() => toggle(c)}>{c.isActive ? 'Active' : 'Disabled'}</button><button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => del(c)} aria-label="Delete coupon"><Trash2 className="h-3.5 w-3.5" /></button></span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end">
        <Field label="Code"><input className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="FESTIVE15" /></Field>
        <Field label="Percent off"><input type="number" min="1" max="100" className="input" value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: e.target.value })} /></Field>
        <Field label="Minimum order"><input type="number" min="0" className="input" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} /></Field>
        <button className="btn-outline" disabled={busy}><Plus className="h-4 w-4" /> Add</button>
      </form>
    </section>
  );
}

function Reviews() {
  const toast = useToast();
  const { data, loading, reload } = useFetch(() => api.adminReviews());
  const [form, setForm] = useState({ author: '', location: '', rating: 5, body: '' });

  async function add(e) {
    e.preventDefault();
    try { await api.saveReview(null, { ...form, rating: Number(form.rating), isVisible: true }); toast.success('Review added.'); setForm({ author: '', location: '', rating: 5, body: '' }); reload(); }
    catch (err) { toast.error(err.fields ? Object.values(err.fields)[0] : err.message); }
  }
  async function toggle(r) { try { await api.saveReview(r.id, { author: r.author, location: r.location, rating: r.rating, body: r.body, isVisible: !r.isVisible }); reload(); } catch (e) { toast.error(e.message); } }
  async function del(r) { try { await api.deleteReview(r.id); reload(); } catch (e) { toast.error(e.message); } }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-serif text-xl">Customer reviews</h2>
      <p className="mb-4 mt-1 text-sm text-charcoal-500">Shown on the home page. The three starter reviews are placeholders: replace them with real customer feedback.</p>
      {loading ? <Spinner /> : (
        <ul className="mb-4 divide-y divide-beige/70">
          {data.reviews.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1"><p className="font-semibold">{r.author} <span className="font-normal text-charcoal-500">· {r.location} · {r.rating}★</span></p><p className="text-charcoal-600">{r.body}</p></div>
              <span className="flex gap-2"><button type="button" className="btn-outline btn-sm" onClick={() => toggle(r)}>{r.isVisible ? 'Visible' : 'Hidden'}</button><button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => del(r)} aria-label="Delete review"><Trash2 className="h-3.5 w-3.5" /></button></span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-3">
        <Field label="Name"><input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
        <Field label="City"><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        <Field label="Rating"><select className="input" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></Field>
        <div className="sm:col-span-3"><Field label="Review"><textarea rows={2} className="input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field></div>
        <button className="btn-outline sm:col-span-3 sm:w-fit"><Plus className="h-4 w-4" /> Add review</button>
      </form>
    </section>
  );
}

export default function Settings() {
  const toast = useToast();
  const { refresh } = useSettings();
  const { data, loading, error, reload } = useFetch(() => api.adminSettings());
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const logoRef = useRef(null);

  useEffect(() => { if (data) setForm({ ...data.settings, smtp_password: '' }); }, [data]);

  if (loading || !form) return error ? <ErrorState message={error.message} onRetry={reload} /> : <PageLoader />;
  const s = data.settings;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const text = (k, extra = {}) => <input className={`input ${errors[k] ? 'input-error' : ''}`} value={form[k] ?? ''} onChange={set(k)} {...extra} />;

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const { smtp_password_set, razorpay_configured, ...payload } = form;
    if (!payload.smtp_password) delete payload.smtp_password;
    try {
      await api.saveSettings(payload);
      toast.success('Settings saved.');
      refresh();
      reload();
    } catch (err) { setErrors(err.fields || {}); toast.error(err.message); }
    setBusy(false);
  }

  async function uploadLogo(file) {
    if (!file) return;
    setLogoBusy(true);
    try {
      const { path } = await api.uploadLogo(file);
      setForm((f) => ({ ...f, shop_logo: path }));
      toast.success('Logo uploaded. Click "Save settings" to apply it.');
    } catch (err) { toast.error(err.message); }
    setLogoBusy(false);
    if (logoRef.current) logoRef.current.value = '';
  }

  async function sendTest() {
    setTestBusy(true);
    try { const r = await api.testEmail(testTo.trim()); toast.success(r.message); } catch (err) { toast.error(err.fields ? Object.values(err.fields)[0] : err.message); }
    setTestBusy(false);
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-serif text-3xl font-semibold">Settings</h1><p className="text-sm text-charcoal-500">Shop details, charges and email.</p></div>

      <form onSubmit={save} className="space-y-6" noValidate>
        <Section title="Shop details">
          <Field label="Shop name" error={errors.shop_name}>{text('shop_name')}</Field>
          <Field label="Tagline" error={errors.shop_tagline}>{text('shop_tagline')}</Field>
          <div className="sm:col-span-2"><Field label="Address" error={errors.shop_address}><textarea rows={2} className="input" value={form.shop_address} onChange={set('shop_address')} /></Field></div>
          <Field label="Phone" error={errors.shop_phone}>{text('shop_phone')}</Field>
          <Field label="Shop email" error={errors.shop_email}>{text('shop_email', { type: 'email' })}</Field>
          <Field label="WhatsApp number" error={errors.whatsapp_number} hint="Digits only with country code, e.g. 919876543210">{text('whatsapp_number', { inputMode: 'numeric' })}</Field>
          <Field label="Instagram URL">{text('instagram_url')}</Field>
          <Field label="Facebook URL">{text('facebook_url')}</Field>
          <div className="sm:col-span-2"><Field label="Business hours" error={errors.business_hours}><textarea rows={2} className="input" value={form.business_hours} onChange={set('business_hours')} /></Field></div>
          <div className="sm:col-span-2"><Field label="Google Maps embed URL" error={errors.maps_embed_url} hint='In Google Maps: Share → Embed a map → copy only the src="https://…" link.'>{text('maps_embed_url')}</Field></div>
          <div className="sm:col-span-2">
            <p className="label">Shop logo</p>
            <div className="flex items-center gap-4">
              {form.shop_logo ? <img src={form.shop_logo} alt="Shop logo" className="h-16 w-16 rounded-xl border border-beige-300 bg-white object-contain p-1" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-beige-300 text-xs text-charcoal-400">None</div>}
              <label className="btn-outline btn-sm cursor-pointer">{logoBusy ? <Spinner className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />} Upload logo<input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => uploadLogo(e.target.files[0])} /></label>
              {form.shop_logo && <button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => setForm((f) => ({ ...f, shop_logo: '' }))}>Remove</button>}
            </div>
            <p className="mt-1 text-xs text-charcoal-400">PNG or JPG works best (it is also placed on the PDF invoice).</p>
          </div>
        </Section>

        <Section title="Pricing &amp; delivery" note="Applied to every order, calculated on the server.">
          <Field label="Delivery charge" error={errors.delivery_charge}>{text('delivery_charge', { type: 'number', min: 0 })}</Field>
          <Field label="Free delivery above (0 = never)" error={errors.free_delivery_above}>{text('free_delivery_above', { type: 'number', min: 0 })}</Field>
          <Field label="Tax percentage" error={errors.tax_percent}>{text('tax_percent', { type: 'number', min: 0, step: '0.01' })}</Field>
          <Field label="Tax label" error={errors.tax_label}>{text('tax_label')}</Field>
          <Field label="Currency code" error={errors.currency}>{text('currency', { maxLength: 3 })}</Field>
        </Section>

        <Section title="Email (SMTP)" note="Used to send booking confirmations with the PDF receipt. The password is stored on the server and never sent to the browser.">
          <Field label="SMTP host" error={errors.smtp_host}>{text('smtp_host', { placeholder: 'smtp.gmail.com' })}</Field>
          <Field label="SMTP port" error={errors.smtp_port}>{text('smtp_port', { type: 'number' })}</Field>
          <Field label="Connection" error={errors.smtp_secure}><select className="input" value={form.smtp_secure} onChange={set('smtp_secure')}><option value="false">STARTTLS (port 587)</option><option value="true">SSL/TLS (port 465)</option></select></Field>
          <Field label="SMTP username" error={errors.smtp_user}>{text('smtp_user', { autoComplete: 'off' })}</Field>
          <Field label="SMTP password" error={errors.smtp_password} hint={s.smtp_password_set ? 'A password is saved. Leave blank to keep it.' : 'No password saved yet.'}>{text('smtp_password', { type: 'password', autoComplete: 'new-password' })}</Field>
          <Field label="Sender name" error={errors.smtp_from_name}>{text('smtp_from_name')}</Field>
        </Section>

        <div className="flex items-center gap-3"><button className="btn-primary" disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save settings</button></div>
      </form>

      <section className="card p-5 sm:p-6">
        <h2 className="font-serif text-xl">Send a test email</h2>
        <p className="mb-4 mt-1 text-sm text-charcoal-500">Save your SMTP settings first, then send a test to confirm everything works.</p>
        <div className="flex flex-col gap-3 sm:flex-row"><input type="email" className="input sm:max-w-sm" placeholder="you@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} aria-label="Test email address" /><button className="btn-outline" onClick={sendTest} disabled={testBusy || !testTo}>{testBusy ? <Spinner className="h-4 w-4" /> : <Mail className="h-4 w-4" />} Send test</button></div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-serif text-xl">Online payments (Razorpay)</h2>
        <p className="mt-1 text-sm text-charcoal-500">Status: <strong className={s.razorpay_configured ? 'text-emerald-700' : 'text-amber-700'}>{s.razorpay_configured ? 'Configured. Customers can pay online.' : 'Not configured. Cash on Delivery and Pay at Store are active.'}</strong></p>
        <p className="mt-2 text-sm text-charcoal-500">API keys are secrets, so they are set in the server <code className="rounded bg-beige/60 px-1.5 py-0.5">.env</code> file (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET), then restart the server.</p>
      </section>

      <Coupons />
      <Reviews />
    </div>
  );
}
