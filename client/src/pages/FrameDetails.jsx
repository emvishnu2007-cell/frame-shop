import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight, Gem, RotateCw, ShieldCheck, ShoppingBag, Zap } from 'lucide-react';
import { api } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import FramePreview from '../components/FramePreview';
import PhotoUploader from '../components/PhotoUploader';
import { ErrorState, PageLoader, QuantityInput, SEO } from '../components/ui';
import { buildCartItem, detectOrientation } from '../utils/cart';
import { round2 } from '../utils/format';

export default function FrameDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const toast = useToast();
  const { money } = useSettings();
  const { data, loading, error, reload } = useFetch(() => api.frame(id), [id]);

  const [imgIdx, setImgIdx] = useState(0);
  const [sizeId, setSizeId] = useState(null);
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(null);
  const [orientation, setOrientation] = useState('portrait');
  const [view, setView] = useState('gallery');
  const [photoError, setPhotoError] = useState('');

  const frame = data && data.frame;

  useEffect(() => {
    if (frame) {
      setImgIdx(0);
      setSizeId((cur) => (frame.sizes.some((s) => s.id === cur) ? cur : (frame.sizes[0] || {}).id));
    }
  }, [frame]);

  async function onPhoto(p) {
    setPhoto(p);
    setPhotoError('');
    if (p) {
      setOrientation(await detectOrientation(p.previewUrl || p.path));
      setView('preview');
    } else {
      setView('gallery');
    }
  }

  if (loading) return <PageLoader label="Loading frame…" />;
  if (error) {
    return (
      <div className="container-x py-20">
        <ErrorState message={error.status === 404 ? 'This frame is no longer available.' : error.message} onRetry={error.status === 404 ? undefined : reload} />
        <p className="mt-6 text-center"><Link to="/frames" className="btn-outline btn-sm">Back to all frames</Link></p>
      </div>
    );
  }

  const size = frame.sizes.find((s) => s.id === sizeId) || frame.sizes[0];
  const unit = size ? round2(frame.basePrice + size.extraPrice) : frame.basePrice;
  const total = round2(unit * qty);
  const available = frame.inStock && size;
  const maxQty = Math.max(1, Math.min(50, frame.stock));

  function requirePhoto() {
    if (!photo) {
      setPhotoError('Please upload your photo to continue.');
      document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  function addToCart(goCheckout) {
    if (!requirePhoto()) return;
    cart.add(buildCartItem({ frame, size, quantity: qty, photo, orientation }));
    if (goCheckout) navigate('/checkout');
    else toast.success(`${frame.name} (${size.label}) added to your cart.`);
  }

  return (
    <>
      <SEO title={frame.name} description={frame.description.slice(0, 155)} image={frame.image} />
      <div className="container-x py-6 sm:py-10">
        <nav className="mb-6 flex items-center gap-1 text-xs text-charcoal-500" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-charcoal">Home</Link><ChevronRight className="h-3 w-3" />
          <Link to="/frames" className="hover:text-charcoal">Frames</Link><ChevronRight className="h-3 w-3" />
          <span className="text-charcoal">{frame.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          {/* ---------- Gallery / preview ---------- */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-4 inline-flex rounded-full bg-beige/60 p-1 text-sm" role="tablist">
              <button role="tab" aria-selected={view === 'gallery'} onClick={() => setView('gallery')} className={`rounded-full px-4 py-2 font-medium transition ${view === 'gallery' ? 'bg-white shadow-card' : 'text-charcoal-500'}`}>Frame photos</button>
              <button role="tab" aria-selected={view === 'preview'} onClick={() => setView('preview')} className={`rounded-full px-4 py-2 font-medium transition ${view === 'preview' ? 'bg-white shadow-card' : 'text-charcoal-500'}`}>Your photo preview</button>
            </div>

            {view === 'gallery' ? (
              <>
                <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-beige/70 bg-cream-200 shadow-card">
                  {frame.images[imgIdx] ? <img src={frame.images[imgIdx].path} alt={`${frame.name} frame, view ${imgIdx + 1}`} className="h-full w-full object-cover transition duration-500 hover:scale-105" /> : <div className="flex h-full items-center justify-center text-charcoal-400">No image</div>}
                </div>
                {frame.images.length > 1 && (
                  <div className="mt-3 flex gap-3">
                    {frame.images.map((im, i) => (
                      <button key={im.id} onClick={() => setImgIdx(i)} aria-label={`Show image ${i + 1}`} className={`h-20 w-16 overflow-hidden rounded-xl border-2 transition ${i === imgIdx ? 'border-bronze' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                        <img src={im.path} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-3xl border border-beige/70 bg-gradient-to-b from-beige-100 to-cream-200 p-6 sm:p-10">
                <h2 className="mb-5 text-center font-serif text-xl">{photo ? 'Your Photo Preview' : 'Preview (sample image)'}</h2>
                <FramePreview colorHex={frame.colorHex} matHex={frame.matHex} borderStyle={frame.borderStyle} photoUrl={photo && (photo.previewUrl || photo.path)}
                  widthIn={size ? size.widthIn : 8} heightIn={size ? size.heightIn : 10} orientation={orientation} alt="Your photo inside the selected frame" maxHeight={460} />
                <div className="mt-6 flex items-center justify-center gap-3 text-sm text-charcoal-500">
                  <span>{size ? size.label : ''} · {orientation}</span>
                  <button className="btn-outline btn-sm" onClick={() => setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait'))}><RotateCw className="h-3.5 w-3.5" /> Rotate</button>
                </div>
                {!photo && <p className="mt-4 text-center text-xs text-charcoal-400">Upload your photo to see it here.</p>}
              </div>
            )}
          </div>

          {/* ---------- Details / purchase ---------- */}
          <div>
            {frame.categoryName && <Link to={`/frames?category=${frame.categorySlug}`} className="eyebrow hover:underline">{frame.categoryName}</Link>}
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{frame.name}</h1>
            <p className="mt-1 text-xs text-charcoal-400">Frame ID: {frame.code}</p>
            <p className="mt-5 leading-relaxed text-charcoal-600">{frame.description}</p>

            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {[['Material', frame.material], ['Colour', frame.color], ['Glass', frame.glassType], ['Availability', frame.inStock ? (frame.stock <= 5 ? `Only ${frame.stock} left` : 'In stock') : 'Out of stock']].map(([k, v]) => v ? (
                <div key={k} className="rounded-xl border border-beige/70 bg-white px-4 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-400">{k}</dt>
                  <dd className="mt-0.5 flex items-center gap-2 font-medium">{k === 'Colour' && <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: frame.colorHex }} />}{v}</dd>
                </div>
              ) : null)}
            </dl>

            <div className="mt-8">
              <p className="label">Select size</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Frame size">
                {frame.sizes.map((s) => (
                  <button key={s.id} role="radio" aria-checked={s.id === sizeId} onClick={() => setSizeId(s.id)}
                    className={`relative rounded-xl border px-3 py-3 text-left transition ${s.id === sizeId ? 'border-bronze bg-beige/40 ring-2 ring-bronze/20' : 'border-beige-300 bg-white hover:border-charcoal'}`}>
                    {s.id === sizeId && <Check className="absolute right-2 top-2 h-4 w-4 text-bronze" />}
                    <span className="block text-sm font-semibold">{s.label}</span>
                    <span className="block text-xs text-charcoal-500">{money(s.price)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8" id="upload-section">
              <p className="label">Your photo</p>
              <PhotoUploader value={photo} onChange={onPhoto} compact />
              {photoError && <p className="field-error" role="alert">{photoError}</p>}
            </div>

            <div className="mt-8 rounded-2xl border border-beige-300 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="label !mb-0">Quantity</p>
                <QuantityInput value={qty} onChange={setQty} max={maxQty} />
              </div>
              <dl className="mt-5 space-y-2 border-t border-beige/70 pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-charcoal-500">Frame price</dt><dd>{money(frame.basePrice)}</dd></div>
                <div className="flex justify-between"><dt className="text-charcoal-500">Size price ({size ? size.label : '-'})</dt><dd>{size && size.extraPrice > 0 ? `+ ${money(size.extraPrice)}` : 'Included'}</dd></div>
                <div className="flex justify-between"><dt className="text-charcoal-500">Price per frame</dt><dd>{money(unit)}</dd></div>
                <div className="flex justify-between border-t border-beige/70 pt-3 text-base font-semibold"><dt>Total</dt><dd className="text-bronze-600" aria-live="polite">{money(total)}</dd></div>
              </dl>
              <p className="mt-2 text-[11px] text-charcoal-400">Delivery and any discounts are calculated at checkout.</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="btn-outline flex-1 py-4" disabled={!available} onClick={() => addToCart(false)}><ShoppingBag className="h-4 w-4" /> Add to Cart</button>
              <button className="btn-primary flex-1 py-4" disabled={!available} onClick={() => addToCart(true)}><Zap className="h-4 w-4" /> Book Now</button>
            </div>
            {!frame.inStock && <p className="mt-3 text-sm text-red-600">This frame is currently out of stock.</p>}

            <ul className="mt-8 grid gap-3 text-sm text-charcoal-500 sm:grid-cols-2">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-bronze" /> Secure packaging &amp; tracked delivery</li>
              <li className="flex items-center gap-2"><Gem className="h-4 w-4 text-bronze" /> Handcrafted, quality checked</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
