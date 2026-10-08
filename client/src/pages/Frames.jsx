import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../services/api';
import useFetch from '../hooks/useFetch';
import FrameCard from '../components/FrameCard';
import { EmptyState, ErrorState, FrameGridSkeleton, SEO } from '../components/ui';

export default function Frames() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const color = params.get('color') || '';
  const sort = params.get('sort') || '';
  const q = params.get('q') || '';
  const [search, setSearch] = useState(q);
  const [showFilters, setShowFilters] = useState(false);

  const cats = useFetch(() => api.categories());
  const all = useFetch(() => api.frames());
  const { data, loading, error, reload } = useFetch(() => api.frames({ category, color, sort, q }), [category, color, sort, q]);

  // Debounce typing into the URL so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== q) update({ q: search });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function update(patch) {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  }

  const colors = all.data ? [...new Map(all.data.frames.filter((f) => f.color).map((f) => [f.color.toLowerCase(), f])).values()] : [];
  const hasFilters = category || color || q || sort;
  const activeCategory = cats.data && cats.data.categories.find((c) => c.slug === category);

  return (
    <>
      <SEO title={activeCategory ? activeCategory.name : 'Photo Frames'} description="Browse premium photo frames in classic, modern, wooden, wedding and family styles. Choose your size and book online." />
      <section className="border-b border-beige/70 bg-beige-100">
        <div className="container-x py-12 text-center sm:py-16">
          <p className="eyebrow mb-3">The Collection</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">{activeCategory ? activeCategory.name : 'All Photo Frames'}</h1>
          <p className="mx-auto mt-4 max-w-xl text-charcoal-500">{activeCategory ? activeCategory.description : 'Find the perfect frame for every photograph and every wall.'}</p>
        </div>
      </section>

      <div className="container-x py-8 sm:py-12">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search frames…" className="input pl-11" aria-label="Search frames" />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-outline btn-sm lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}><SlidersHorizontal className="h-4 w-4" /> Filters</button>
            <select value={sort} onChange={(e) => update({ sort: e.target.value })} className="input !w-auto !py-2.5" aria-label="Sort frames">
              <option value="">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        <div className={`${showFilters ? 'block' : 'hidden'} mb-8 space-y-4 lg:block`}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
            <button onClick={() => update({ category: '' })} className={`rounded-full border px-4 py-2 text-sm transition ${!category ? 'border-charcoal bg-charcoal text-cream' : 'border-beige-300 bg-white hover:border-charcoal'}`}>All</button>
            {(cats.data ? cats.data.categories : []).map((c) => (
              <button key={c.id} onClick={() => update({ category: c.slug })} className={`rounded-full border px-4 py-2 text-sm transition ${category === c.slug ? 'border-charcoal bg-charcoal text-cream' : 'border-beige-300 bg-white hover:border-charcoal'}`}>{c.name}</button>
            ))}
          </div>
          {colors.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">Colour</span>
              {colors.map((f) => (
                <button key={f.color} onClick={() => update({ color: color === f.color ? '' : f.color })} title={f.color} aria-label={`Colour ${f.color}`} aria-pressed={color.toLowerCase() === f.color.toLowerCase()}
                  className={`h-8 w-8 rounded-full border-2 transition ${color.toLowerCase() === f.color.toLowerCase() ? 'scale-110 border-bronze ring-4 ring-bronze/20' : 'border-white shadow-card hover:scale-105'}`} style={{ background: f.colorHex }} />
              ))}
            </div>
          )}
          {hasFilters && (
            <button onClick={() => { setSearch(''); setParams({}, { replace: true }); }} className="flex items-center gap-1 text-sm text-bronze-600 hover:underline"><X className="h-4 w-4" /> Clear all filters</button>
          )}
        </div>

        {loading ? <FrameGridSkeleton /> : error ? <ErrorState message={error.message} onRetry={reload} /> : data.frames.length === 0 ? (
          <EmptyState title="No frames found" message="Try a different search or clear your filters." action={<button className="btn-outline btn-sm" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>Clear filters</button>} />
        ) : (
          <>
            <p className="mb-5 text-sm text-charcoal-500" aria-live="polite">{data.frames.length} {data.frames.length === 1 ? 'frame' : 'frames'}</p>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {data.frames.map((f, i) => <FrameCard key={f.id} frame={f} index={i} />)}
            </div>
          </>
        )}
      </div>
    </>
  );
}
