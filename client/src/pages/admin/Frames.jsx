import { useRef, useState } from 'react';
import { ImagePlus, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { api } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import FramePreview from '../../components/FramePreview';
import { EmptyState, ErrorState, Field, Modal, PageLoader, Spinner } from '../../components/ui';

const DEFAULT_SIZES = [
  ['4 × 6 in', 4, 6, 0], ['5 × 7 in', 5, 7, 100], ['8 × 10 in', 8, 10, 300], ['10 × 12 in', 10, 12, 500],
  ['12 × 18 in', 12, 18, 1000], ['16 × 20 in', 16, 20, 1500], ['18 × 24 in', 18, 24, 2200], ['20 × 30 in', 20, 30, 3000],
].map(([label, widthIn, heightIn, extraPrice]) => ({ label, widthIn, heightIn, extraPrice }));

const BLANK = {
  name: '', categoryId: '', description: '', basePrice: 500, material: '', color: '', colorHex: '#1F1D1B', matHex: '#FFFFFF',
  borderStyle: 'classic', glassType: 'Clear Float Glass', stock: 20, isFeatured: false, isActive: true, images: [], sizes: DEFAULT_SIZES,
};

function toForm(f) {
  return {
    name: f.name, categoryId: f.categoryId || '', description: f.description, basePrice: f.basePrice, material: f.material, color: f.color,
    colorHex: f.colorHex, matHex: f.matHex, borderStyle: f.borderStyle, glassType: f.glassType, stock: f.stock, isFeatured: f.isFeatured,
    isActive: f.isActive, images: f.images.map((i) => i.path),
    sizes: f.sizes.map((s) => ({ label: s.label, widthIn: s.widthIn, heightIn: s.heightIn, extraPrice: s.extraPrice })),
  };
}

function FrameForm({ frame, categories, onClose, onSaved }) {
  const toast = useToast();
  const { money } = useSettings();
  const [form, setForm] = useState(frame ? toForm(frame) : BLANK);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setSize = (i, k, v) => setForm((f) => ({ ...f, sizes: f.sizes.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));

  async function addImages(files) {
    setUploading(true);
    for (const file of Array.from(files)) {
      if (form.images.length >= 8) { toast.error('You can add up to 8 images.'); break; }
      try {
        const { path } = await api.uploadFrameImage(file);
        setForm((f) => ({ ...f, images: [...f.images, path] }));
      } catch (e) { toast.error(`${file.name}: ${e.message}`); }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = {
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      basePrice: Number(form.basePrice),
      stock: Number(form.stock),
      sizes: form.sizes.map((s) => ({ label: String(s.label).trim(), widthIn: Number(s.widthIn), heightIn: Number(s.heightIn), extraPrice: Number(s.extraPrice) })),
    };
    try {
      await api.saveFrame(frame && frame.id, body);
      toast.success(frame ? 'Frame updated.' : 'Frame added.');
      onSaved();
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    }
    setBusy(false);
  }

  const err = (k) => errors[k];
  const firstSize = form.sizes[0] || { widthIn: 8, heightIn: 10 };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Frame name" error={err('name')}><input className={`input ${err('name') ? 'input-error' : ''}`} value={form.name} onChange={set('name')} /></Field></div>
        <Field label="Category" error={err('categoryId')}><select className="input" value={form.categoryId} onChange={set('categoryId')}><option value="">Uncategorised</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Base price" error={err('basePrice')}><input type="number" min="0" step="1" className="input" value={form.basePrice} onChange={set('basePrice')} /></Field>
        <div className="sm:col-span-2"><Field label="Description" error={err('description')}><textarea rows={3} className="input" value={form.description} onChange={set('description')} /></Field></div>
        <Field label="Material"><input className="input" value={form.material} onChange={set('material')} /></Field>
        <Field label="Colour name"><input className="input" value={form.color} onChange={set('color')} /></Field>
        <Field label="Glass type"><input className="input" value={form.glassType} onChange={set('glassType')} /></Field>
        <Field label="Stock" error={err('stock')}><input type="number" min="0" className="input" value={form.stock} onChange={set('stock')} /></Field>
        <Field label="Frame colour (preview)" error={err('colorHex')}><div className="flex gap-2"><input type="color" className="h-11 w-14 cursor-pointer rounded-lg border border-beige-300" value={form.colorHex} onChange={set('colorHex')} /><input className="input" value={form.colorHex} onChange={set('colorHex')} /></div></Field>
        <Field label="Mat colour (preview)" error={err('matHex')}><div className="flex gap-2"><input type="color" className="h-11 w-14 cursor-pointer rounded-lg border border-beige-300" value={form.matHex} onChange={set('matHex')} /><input className="input" value={form.matHex} onChange={set('matHex')} /></div></Field>
        <Field label="Border style"><select className="input" value={form.borderStyle} onChange={set('borderStyle')}><option value="thin">Slim</option><option value="classic">Classic</option><option value="wide">Gallery (wide mat)</option><option value="ornate">Ornate</option></select></Field>
        <div className="flex flex-col justify-end gap-2 pb-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#A8803F]" checked={form.isFeatured} onChange={set('isFeatured')} /> Featured on home page</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#A8803F]" checked={form.isActive} onChange={set('isActive')} /> Active (visible to customers)</label>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
        <div>
          <p className="label">Images (first is the main image)</p>
          <div className="flex flex-wrap gap-3">
            {form.images.map((p, i) => (
              <div key={p} className="relative">
                <img src={p} alt={`Frame ${i + 1}`} className="h-24 w-20 rounded-lg border border-beige-300 object-cover" />
                <button type="button" onClick={() => setForm((f) => ({ ...f, images: f.images.filter((x) => x !== p) }))} className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white" aria-label="Remove image"><X className="h-3 w-3" /></button>
                {i === 0 && <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-charcoal/70 text-center text-[10px] text-white">Main</span>}
              </div>
            ))}
            <label className="flex h-24 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-beige-300 text-xs text-charcoal-500 hover:border-bronze">
              {uploading ? <Spinner className="h-5 w-5 text-bronze" /> : <ImagePlus className="h-5 w-5 text-bronze" />}Add
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addImages(e.target.files)} />
            </label>
          </div>
          {err('images') && <p className="field-error">{err('images')}</p>}
        </div>
        <div><p className="label">Colour preview</p><FramePreview colorHex={form.colorHex} matHex={form.matHex} borderStyle={form.borderStyle} widthIn={firstSize.widthIn || 8} heightIn={firstSize.heightIn || 10} maxHeight={140} /></div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between"><p className="label !mb-0">Sizes &amp; pricing</p><button type="button" className="btn-outline btn-sm" onClick={() => setForm((f) => ({ ...f, sizes: [...f.sizes, { label: '', widthIn: 8, heightIn: 10, extraPrice: 0 }] }))}><Plus className="h-3.5 w-3.5" /> Add size</button></div>
        {err('sizes') && <p className="field-error mb-2">{err('sizes')}</p>}
        <div className="space-y-2">
          <div className="hidden grid-cols-[1.4fr_.7fr_.7fr_1fr_1fr_auto] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-charcoal-400 sm:grid"><span>Label</span><span>Width in</span><span>Height in</span><span>Extra price</span><span>Customer pays</span><span /></div>
          {form.sizes.map((s, i) => (
            <div key={i} className="grid grid-cols-2 items-center gap-2 rounded-xl border border-beige/70 p-2 sm:grid-cols-[1.4fr_.7fr_.7fr_1fr_1fr_auto] sm:border-0 sm:p-0">
              <input aria-label="Size label" className="input col-span-2 !py-2.5 sm:col-span-1" value={s.label} onChange={(e) => setSize(i, 'label', e.target.value)} placeholder="8 × 10 in" />
              <input aria-label="Width" type="number" min="1" step="0.5" className="input !py-2.5" value={s.widthIn} onChange={(e) => setSize(i, 'widthIn', e.target.value)} />
              <input aria-label="Height" type="number" min="1" step="0.5" className="input !py-2.5" value={s.heightIn} onChange={(e) => setSize(i, 'heightIn', e.target.value)} />
              <input aria-label="Extra price" type="number" min="0" className="input !py-2.5" value={s.extraPrice} onChange={(e) => setSize(i, 'extraPrice', e.target.value)} />
              <span className="text-sm font-semibold text-bronze-600">{money((Number(form.basePrice) || 0) + (Number(s.extraPrice) || 0))}</span>
              <button type="button" disabled={form.sizes.length <= 1} onClick={() => setForm((f) => ({ ...f, sizes: f.sizes.filter((_, j) => j !== i) }))} className="justify-self-end rounded-full p-2 text-red-600 hover:bg-red-50 disabled:opacity-30" aria-label="Remove size"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-charcoal-400">Customer price = base price + the size's extra price. These values drive every price on the website.</p>
      </div>

      <div className="flex justify-end gap-3 border-t border-beige/70 pt-4"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || uploading}>{busy && <Spinner className="h-4 w-4" />} {frame ? 'Save changes' : 'Add frame'}</button></div>
    </form>
  );
}

export default function Frames() {
  const toast = useToast();
  const { money } = useSettings();
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useFetch(() => api.adminFrames(), []);
  const cats = useFetch(() => api.categories());
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  async function openEdit(f) {
    try { const { frame } = await api.adminFrame(f.id); setEditing(frame); } catch (e) { toast.error(e.message); }
  }

  async function toggle(f, patch) {
    try {
      const { frame } = await api.adminFrame(f.id);
      await api.saveFrame(f.id, { ...toForm(frame), ...patch });
      reload();
    } catch (e) { toast.error(e.message); }
  }

  async function remove() {
    setBusy(true);
    try { await api.deleteFrame(del.id); toast.success('Frame deleted.'); setDel(null); reload(); } catch (e) { toast.error(e.message); setDel(null); }
    setBusy(false);
  }

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  const frames = data.frames.filter((f) => !q || `${f.name} ${f.code} ${f.categoryName || ''}`.toLowerCase().includes(q.toLowerCase()));
  const categories = cats.data ? cats.data.categories : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-3xl font-semibold">Frames</h1><p className="text-sm text-charcoal-500">Manage designs, sizes, prices and stock.</p></div>
        <button className="btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" /> Add frame</button>
      </div>
      <div className="relative max-w-sm"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" /><input className="input pl-11" placeholder="Search frames" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search frames" /></div>

      {frames.length === 0 ? <EmptyState title="No frames found" /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {frames.map((f) => (
            <div key={f.id} className={`card flex gap-4 p-4 ${f.isActive ? '' : 'opacity-70'}`}>
              {f.image ? <img src={f.image} alt={f.name} className="h-28 w-24 shrink-0 rounded-xl object-cover" /> : <div className="h-28 w-24 shrink-0 rounded-xl bg-beige" />}
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate font-serif text-lg font-semibold">{f.name}</p>
                <p className="text-xs text-charcoal-400">{f.code} · {f.categoryName || 'Uncategorised'}</p>
                <p className="mt-1 text-sm">from <strong className="text-bronze-600">{money(f.minPrice)}</strong> · {f.sizes.length} sizes</p>
                <p className={`text-xs ${f.stock <= 5 ? 'text-red-600' : 'text-charcoal-500'}`}>Stock: {f.stock}{!f.isActive && ' · Hidden'}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  <button className="btn-outline btn-sm" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button className={`btn-ghost btn-sm ${f.isFeatured ? 'text-bronze-600' : ''}`} onClick={() => toggle(f, { isFeatured: !f.isFeatured })} title="Toggle featured" aria-pressed={f.isFeatured}><Star className={`h-3.5 w-3.5 ${f.isFeatured ? 'fill-bronze' : ''}`} /></button>
                  <button className="btn-ghost btn-sm" onClick={() => toggle(f, { isActive: !f.isActive })}>{f.isActive ? 'Disable' : 'Enable'}</button>
                  <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setDel(f)} aria-label="Delete frame"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing && editing.id ? `Edit ${editing.name}` : 'Add frame'} wide>
        {editing && <FrameForm key={editing.id || 'new'} frame={editing.id ? editing : null} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); cats.reload(); }} />}
      </Modal>
      <Modal open={Boolean(del)} onClose={() => setDel(null)} title="Delete frame?">
        <p className="text-sm text-charcoal-600">Delete <strong>{del && del.name}</strong> permanently? Past orders keep their own record of this frame. To just hide it from customers, use Disable instead.</p>
        <div className="mt-6 flex justify-end gap-3"><button className="btn-ghost" onClick={() => setDel(null)}>Cancel</button><button className="btn-danger" onClick={remove} disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Delete</button></div>
      </Modal>
    </div>
  );
}
