import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { api } from '../services/api';
import { Spinner } from './ui';

export const MAX_PHOTO_MB = 8;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Uploads the chosen image to the server straight away (so the cart only ever holds a server path)
 * and gives the parent an instant local preview. value = { path, previewUrl, name } | null
 */
export default function PhotoUploader({ value, onChange, compact = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const localUrl = useRef(null);

  useEffect(() => () => { if (localUrl.current) URL.revokeObjectURL(localUrl.current); }, []);

  const handleFile = useCallback(async (file) => {
    setError('');
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      setError('Please upload a valid image (JPG, PNG or WebP).');
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(`That image is too large. Maximum size is ${MAX_PHOTO_MB} MB.`);
      return;
    }
    if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    const previewUrl = URL.createObjectURL(file);
    localUrl.current = previewUrl;

    setBusy(true);
    try {
      const { path } = await api.uploadPhoto(file);
      onChange({ path, previewUrl, name: file.name });
    } catch (e) {
      URL.revokeObjectURL(previewUrl);
      localUrl.current = null;
      setError(e.message || 'Please upload a valid image.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onChange]);

  const remove = () => {
    setError('');
    onChange(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="photo-input" onChange={(e) => handleFile(e.target.files[0])} />
      {value ? (
        <div className="flex items-center gap-4 rounded-2xl border border-beige-300 bg-white p-3">
          <img src={value.previewUrl || value.path} alt="Your uploaded photo" className="h-16 w-16 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{value.name || 'Your photo'}</p>
            <p className="text-xs text-emerald-700">Uploaded &amp; ready</p>
          </div>
          <label htmlFor="photo-input" className="btn-outline btn-sm cursor-pointer"><RefreshCw className="h-3.5 w-3.5" /> Change</label>
          <button type="button" onClick={remove} className="rounded-full p-2 text-red-600 hover:bg-red-50" aria-label="Remove photo"><Trash2 className="h-4 w-4" /></button>
        </div>
      ) : (
        <label
          htmlFor="photo-input"
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 text-center transition ${compact ? 'py-6' : 'py-10'} ${drag ? 'border-bronze bg-beige/40' : 'border-beige-300 bg-white hover:border-bronze hover:bg-cream-100'}`}
        >
          {busy ? <Spinner className="h-7 w-7 text-bronze" /> : drag ? <UploadCloud className="h-7 w-7 text-bronze" /> : <ImagePlus className="h-7 w-7 text-bronze" />}
          <span className="text-sm font-semibold">{busy ? 'Uploading your photo…' : 'Upload your photo'}</span>
          <span className="text-xs text-charcoal-500">Drag &amp; drop or click to browse · JPG, PNG or WebP · up to {MAX_PHOTO_MB} MB</span>
        </label>
      )}
      {busy && value && <p className="mt-2 flex items-center gap-2 text-xs text-charcoal-500"><Spinner className="h-3 w-3" /> Uploading…</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
