import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { EmptyState, ErrorState, Field, Modal, PageLoader, Spinner } from '../../components/ui';

const BLANK = { name: '', description: '', sortOrder: 0 };

export default function Categories() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.categories());
  const [editing, setEditing] = useState(null); // null | {id?, ...fields}
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  function open(cat) {
    setEditing(cat || {});
    setForm(cat ? { name: cat.name, description: cat.description, sortOrder: cat.sortOrder } : BLANK);
    setErrors({});
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api.saveCategory(editing.id, { name: form.name, description: form.description, sortOrder: Number(form.sortOrder) || 0 });
      toast.success(editing.id ? 'Category updated.' : 'Category added.');
      setEditing(null);
      reload();
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    }
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteCategory(confirm.id);
      toast.success('Category deleted.');
      setConfirm(null);
      reload();
    } catch (err) { toast.error(err.message); setConfirm(null); }
    setBusy(false);
  }

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  const cats = data.categories;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-3xl font-semibold">Categories</h1><p className="text-sm text-charcoal-500">Organise your frames into collections.</p></div>
        <button className="btn-primary" onClick={() => open()}><Plus className="h-4 w-4" /> Add category</button>
      </div>

      {cats.length === 0 ? <EmptyState title="No categories yet" message="Add your first category to organise frames." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cats.map((c) => (
            <div key={c.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="truncate font-serif text-lg font-semibold">{c.name}</h3><p className="text-xs text-charcoal-400">/{c.slug} · order {c.sortOrder}</p></div>
                <span className="badge shrink-0 bg-beige text-charcoal-600">{c.frameCount} {c.frameCount === 1 ? 'frame' : 'frames'}</span>
              </div>
              <p className="mt-3 line-clamp-3 flex-1 text-sm text-charcoal-500">{c.description || 'No description.'}</p>
              <div className="mt-4 flex gap-2">
                <button className="btn-outline btn-sm" onClick={() => open(c)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => setConfirm(c)}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing && editing.id ? 'Edit category' : 'Add category'}>
        <form onSubmit={save} className="space-y-4" noValidate>
          <Field label="Name" error={errors.name}><input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Description" error={errors.description}><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Display order" error={errors.sortOrder} hint="Lower numbers appear first."><input type="number" min="0" className="input" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>
          <div className="flex justify-end gap-3 pt-2"><button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Save</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Delete category?">
        <p className="text-sm text-charcoal-600">Delete <strong>{confirm && confirm.name}</strong>? A category that still contains frames cannot be deleted.</p>
        <div className="mt-6 flex justify-end gap-3"><button className="btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button className="btn-danger" onClick={remove} disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Delete</button></div>
      </Modal>
    </div>
  );
}
