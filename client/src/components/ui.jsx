import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Inbox, Loader2, Star, X, Minus, Plus } from 'lucide-react';
import { STATUS_STYLES } from '../utils/format';

export function SEO({ title, description, image }) {
  const full = title ? `${title} | Delight Digital Frames` : 'Delight Digital Frames | Premium Custom Photo Frames';
  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
    </Helmet>
  );
}

export function Reveal({ children, delay = 0, y = 24, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'center' }) {
  return (
    <div className={`mb-10 max-w-2xl sm:mb-14 ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-charcoal-500">{subtitle}</p>}
    </div>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-label="Loading" />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-charcoal-500">
      <Spinner /> <span className="text-sm">{label}</span>
    </div>
  );
}

export function FrameGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="skeleton aspect-[4/5]" />
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500" />
      <p className="text-sm text-red-800">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-outline btn-sm">Try again</button>}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-14 text-center">
      <Inbox className="h-10 w-10 text-beige-300" />
      <h3 className="text-xl font-semibold">{title}</h3>
      {message && <p className="text-sm text-charcoal-500">{message}</p>}
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}

export function Stars({ value = 5 }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= value ? 'fill-bronze text-bronze' : 'text-beige-300'}`} />
      ))}
    </div>
  );
}

export function QuantityInput({ value, onChange, min = 1, max = 50, size = 'md' }) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  return (
    <div className="inline-flex items-center rounded-full border border-beige-300 bg-white">
      <button type="button" className={`${dim} flex items-center justify-center rounded-full text-charcoal-600 hover:bg-beige/50 disabled:opacity-40`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="h-4 w-4" />
      </button>
      <span className={`min-w-8 text-center text-sm font-semibold ${size === 'sm' ? '' : 'min-w-10'}`} aria-live="polite">{value}</span>
      <button type="button" className={`${dim} flex items-center justify-center rounded-full text-charcoal-600 hover:bg-beige/50 disabled:opacity-40`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-soft sm:rounded-3xl sm:p-7 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-beige/60" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function Field({ label, error, children, hint }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-charcoal-400">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function useDocumentTitleScroll() {
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);
}
