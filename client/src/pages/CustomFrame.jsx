import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, RotateCw, ShoppingBag, Zap } from 'lucide-react';
import { api } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import FramePreview from '../components/FramePreview';
import PhotoUploader from '../components/PhotoUploader';
import { ErrorState, FrameGridSkeleton, QuantityInput, SEO } from '../components/ui';
import { buildCartItem, detectOrientation } from '../utils/cart';
import { round2 } from '../utils/format';

const STYLES = [
  { key: 'thin', label: 'Slim', note: 'Minimal, modern edge' },
  { key: 'classic', label: 'Classic', note: 'Timeless profile' },
  { key: 'wide', label: 'Gallery', note: 'Wide, generous mat' },
  { key: 'ornate', label: 'Ornate', note: 'Detailed, statement look' },
];

function Step({ n, title, done, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 font-serif text-xl">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-sans font-semibold ${done ? 'bg-bronze text-white' : 'bg-beige text-charcoal-600'}`}>{done ? <Check className="h-4 w-4" /> : n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function CustomFrame() {
  const navigate = useNavigate();
  const cart = useCart();
  const toast = useToast();
  const { money } = useSettings();
  const { data, loading, error, reload } = useFetch(() => api.frames());

  const [style, setStyle] = useState('classic');
  const [frameId, setFrameId] = useState(null);
  const [sizeId, setSizeId] = useState(null);
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(null);
  const [orientation, setOrientation] = useState('portrait');
  const [photoError, setPhotoError] = useState('');

  const frames = useMemo(() => (data ? data.frames.filter((f) => f.inStock) : []), [data]);
  const inStyle = frames.filter((f) => f.borderStyle === style);
  const frame = frames.find((f) => f.id === frameId) || null;
  const size = frame ? frame.sizes.find((s) => s.id === sizeId) || frame.sizes[0] : null;

  // Pick a sensible default frame when the style changes.
  useEffect(() => {
    if (!frames.length) return;
    if (!inStyle.some((f) => f.id === frameId)) setFrameId(inStyle[0] ? inStyle[0].id : null);
  }, [style, frames]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open on the first style that actually has frames.
  useEffect(() => {
    if (frames.length && !frames.some((f) => f.borderStyle === style)) setStyle(frames[0].borderStyle);
  }, [frames]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the chosen size when switching frames if the same size exists.
  useEffect(() => {
    if (!frame) return;
    setSizeId((cur) => {
      const current = frame.sizes.find((s) => s.id === cur);
      if (current) return cur;
      const same = size && frame.sizes.find((s) => s.label === size.label);
      return (same || frame.sizes[0] || {}).id;
    });
  }, [frameId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onPhoto(p) {
    setPhoto(p);
    setPhotoError('');
    if (p) setOrientation(await detectOrientation(p.previewUrl || p.path));
  }

  function submit(go) {
    if (!frame || !size) return;
    if (!photo) {
      setPhotoError('Please upload your photo to continue.');
      document.getElementById('step-photo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    cart.add(buildCartItem({ frame, size, quantity: qty, photo, orientation }));
    if (go) navigate('/checkout');
    else toast.success('Your custom frame was added to the cart.');
  }

  const unit = frame && size ? round2(frame.basePrice + size.extraPrice) : 0;
  const total = round2(unit * qty);

  return (
    <>
      <SEO title="Create Your Frame" description="Design your own custom photo frame: choose a style, colour, size and upload your photo with a live preview and instant pricing." />
      <section className="border-b border-beige/70 bg-beige-100">
        <div className="container-x py-12 text-center sm:py-14">
          <p className="eyebrow mb-3">Frame builder</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Create Your Frame</h1>
          <p className="mx-auto mt-4 max-w-xl text-charcoal-500">Choose, preview and price your frame in one place.</p>
        </div>
      </section>

      <div className="container-x py-8 sm:py-12">
        {loading ? <FrameGridSkeleton count={4} /> : error ? <ErrorState message={error.message} onRetry={reload} /> : frames.length === 0 ? (
          <p className="text-center text-charcoal-500">No frames are available to customise right now. Please check back soon.</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-12">
            <div className="order-2 space-y-5 lg:order-1">
              <Step n={1} title="Frame design" done>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Frame design">
                  {STYLES.map((s) => {
                    const count = frames.filter((f) => f.borderStyle === s.key).length;
                    return (
                      <button key={s.key} role="radio" aria-checked={style === s.key} disabled={!count} onClick={() => setStyle(s.key)}
                        className={`rounded-xl border p-3 text-left transition disabled:opacity-40 ${style === s.key ? 'border-bronze bg-beige/40 ring-2 ring-bronze/20' : 'border-beige-300 hover:border-charcoal'}`}>
                        <span className="block font-semibold">{s.label}</span>
                        <span className="block text-xs text-charcoal-500">{s.note}</span>
                      </button>
                    );
                  })}
                </div>
              </Step>

              <Step n={2} title="Frame colour" done={Boolean(frame)}>
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Frame colour">
                  {inStyle.map((f) => (
                    <button key={f.id} role="radio" aria-checked={f.id === frameId} onClick={() => setFrameId(f.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${f.id === frameId ? 'border-bronze bg-beige/40 ring-2 ring-bronze/20' : 'border-beige-300 hover:border-charcoal'}`}>
                      <span className="h-10 w-10 shrink-0 rounded-full border border-black/10 shadow-inner" style={{ background: f.colorHex }} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{f.name}</span>
                        <span className="block truncate text-xs text-charcoal-500">{f.color} · from {money(f.minPrice)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Step>

              <Step n={3} title="Size" done={Boolean(size)}>
                {frame && (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label="Frame size">
                    {frame.sizes.map((s) => (
                      <button key={s.id} role="radio" aria-checked={s.id === (size && size.id)} onClick={() => setSizeId(s.id)}
                        className={`rounded-xl border px-3 py-3 text-left transition ${size && s.id === size.id ? 'border-bronze bg-beige/40 ring-2 ring-bronze/20' : 'border-beige-300 hover:border-charcoal'}`}>
                        <span className="block text-sm font-semibold">{s.label}</span>
                        <span className="block text-xs text-charcoal-500">{money(s.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </Step>

              <div id="step-photo">
                <Step n={4} title="Your photo" done={Boolean(photo)}>
                  <PhotoUploader value={photo} onChange={onPhoto} compact />
                  {photoError && <p className="field-error" role="alert">{photoError}</p>}
                </Step>
              </div>

              <Step n={5} title="Quantity" done>
                <QuantityInput value={qty} onChange={setQty} max={Math.max(1, Math.min(50, frame ? frame.stock : 1))} />
              </Step>
            </div>

            <aside className="order-1 lg:order-2">
              <div className="rounded-3xl border border-beige/70 bg-gradient-to-b from-beige-100 to-cream-200 p-5 sm:p-8 lg:sticky lg:top-24">
                <p className="mb-4 text-center font-serif text-lg">{photo ? 'Your Photo Preview' : 'Live preview'}</p>
                {frame && size && (
                  <FramePreview colorHex={frame.colorHex} matHex={frame.matHex} borderStyle={frame.borderStyle} photoUrl={photo && (photo.previewUrl || photo.path)}
                    widthIn={size.widthIn} heightIn={size.heightIn} orientation={orientation} maxHeight={380} alt="Your custom frame preview" />
                )}
                <div className="mt-4 flex items-center justify-center gap-3 text-sm text-charcoal-500">
                  <span>{frame ? frame.name : ''} · {size ? size.label : ''}</span>
                  <button className="btn-outline btn-sm" onClick={() => setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait'))}><RotateCw className="h-3.5 w-3.5" /> Rotate</button>
                </div>

                <dl className="mt-6 space-y-2 rounded-2xl bg-white p-5 text-sm shadow-card">
                  <div className="flex justify-between"><dt className="text-charcoal-500">Frame price</dt><dd>{frame ? money(frame.basePrice) : '-'}</dd></div>
                  <div className="flex justify-between"><dt className="text-charcoal-500">Size price</dt><dd>{size ? (size.extraPrice > 0 ? `+ ${money(size.extraPrice)}` : 'Included') : '-'}</dd></div>
                  <div className="flex justify-between"><dt className="text-charcoal-500">Quantity</dt><dd>× {qty}</dd></div>
                  <div className="flex justify-between border-t border-beige/70 pt-3 text-lg font-semibold"><dt>Total</dt><dd className="text-bronze-600" aria-live="polite">{money(total)}</dd></div>
                </dl>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button className="btn-outline py-3.5" onClick={() => submit(false)} disabled={!frame}><ShoppingBag className="h-4 w-4" /> Add to Cart</button>
                  <button className="btn-primary py-3.5" onClick={() => submit(true)} disabled={!frame}><Zap className="h-4 w-4" /> Book Now</button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
