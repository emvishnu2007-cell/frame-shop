import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';

export default function FrameCard({ frame, index = 0 }) {
  const { money } = useSettings();
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.05 }}
      className="group"
    >
      <Link to={`/frames/${frame.id}`} className="block" aria-label={`${frame.name}, from ${money(frame.minPrice)}`}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-beige/70 bg-cream-200 shadow-card transition duration-300 group-hover:shadow-soft">
          {frame.image ? (
            <img src={frame.image} alt={`${frame.name} photo frame`} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-charcoal-400">No image</div>
          )}
          {frame.categoryName && (
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-charcoal-600 backdrop-blur">{frame.categoryName}</span>
          )}
          {!frame.inStock && (
            <span className="absolute right-3 top-3 rounded-full bg-charcoal px-3 py-1 text-[11px] font-semibold text-cream">Out of stock</span>
          )}
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-charcoal/80 to-transparent p-4 text-sm font-semibold text-white transition duration-300 group-hover:translate-y-0">
            Customise &amp; book →
          </div>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-lg font-semibold">{frame.name}</h3>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-charcoal-500">
              <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: frame.colorHex }} aria-hidden />
              {frame.color || frame.material}
            </p>
          </div>
          <p className="shrink-0 text-right text-sm">
            <span className="block text-[11px] text-charcoal-400">from</span>
            <span className="font-semibold text-bronze-600">{money(frame.minPrice)}</span>
          </p>
        </div>
      </Link>
    </motion.article>
  );
}
