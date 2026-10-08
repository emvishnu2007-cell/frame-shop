import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Award, Brush, Camera, Truck, ShieldCheck, Sparkles, Upload, Ruler, PackageCheck, Palette } from 'lucide-react';
import { api } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useSettings } from '../context/SettingsContext';
import FrameCard from '../components/FrameCard';
import FramePreview from '../components/FramePreview';
import { FrameGridSkeleton, Reveal, SectionHeading, SEO, Stars } from '../components/ui';

const WHY = [
  { icon: Brush, title: 'Handcrafted finish', text: 'Every frame is cut, joined and finished by skilled craftsmen, not stamped out of a mould.' },
  { icon: ShieldCheck, title: 'Museum-grade protection', text: 'Choose UV-protect or anti-glare glass to keep your photographs vivid for decades.' },
  { icon: Camera, title: 'Preview before you book', text: 'Upload your photo and see it inside the frame, at your chosen size, before you pay.' },
  { icon: Truck, title: 'Safe doorstep delivery', text: 'Rigid corner-protected packaging and tracked delivery, or collect free from our store.' },
];

const STEPS = [
  { icon: Palette, title: 'Choose a design', text: 'Browse frames by style, colour and material.' },
  { icon: Ruler, title: 'Pick your size', text: 'From 4×6 to 20×30 inches, priced transparently.' },
  { icon: Upload, title: 'Upload your photo', text: 'See it inside your frame with a live preview.' },
  { icon: PackageCheck, title: 'Book & receive', text: 'Confirm online, get an email receipt, track your order.' },
];

function Hero() {
  const { settings } = useSettings();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-dusty-pink via-dusty-pink to-beige-100" />
      <div className="container-x grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:gap-6 lg:py-24">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <p className="eyebrow mb-5 flex items-center gap-2"><Sparkles className="h-4 w-4" /> {settings.shop_name}</p>
          <h1 className="text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
            Turn Your Memories Into Something <span className="italic text-bronze">Timeless.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-charcoal-500">Premium photo frames crafted to preserve your most beautiful moments.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/frames" className="btn-primary px-8 py-4 text-base">Explore Frames <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/create" className="btn-outline px-8 py-4 text-base">Create Your Frame</Link>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-beige-300 pt-6 text-center sm:text-left">
            {[['8', 'Sizes available'], ['100%', 'Preview before you pay'], ['Free', 'Store pickup']].map(([k, v]) => (
              <div key={v}><dt className="font-serif text-2xl font-semibold text-charcoal">{k}</dt><dd className="mt-1 text-xs text-charcoal-500">{v}</dd></div>
            ))}
          </dl>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.15 }} className="relative mx-auto h-[360px] w-full max-w-[520px] sm:h-[460px] lg:h-[540px]" aria-hidden="true">
          <div className="absolute left-[2%] top-[14%] w-[44%] animate-float" style={{ '--r': '-6deg' }}>
            <FramePreview colorHex="#5C3A21" matHex="#FBF8F2" borderStyle="classic" widthIn={5} heightIn={7} />
          </div>
          <div className="absolute right-[2%] top-0 w-[52%] animate-float" style={{ '--r': '3deg', animationDelay: '-2s' }}>
            <FramePreview colorHex="#B8903F" matHex="#F7F0E0" borderStyle="ornate" widthIn={8} heightIn={10} />
          </div>
          <div className="absolute bottom-0 left-[26%] w-[40%] animate-float" style={{ '--r': '-2deg', animationDelay: '-4s' }}>
            <FramePreview colorHex="#1A1A1A" matHex="#FFFFFF" borderStyle="thin" widthIn={4} heightIn={6} orientation="landscape" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Featured() {
  const { data, loading, error, reload } = useFetch(() => api.frames({ featured: 1 }));
  return (
    <section className="section-y">
      <div className="container-x">
        <SectionHeading eyebrow="Featured" title="Our most loved frames" subtitle="Hand-picked designs our customers choose again and again." />
        {loading ? <FrameGridSkeleton count={4} /> : error ? (
          <p className="text-center text-sm text-charcoal-500">We couldn&apos;t load the frames. <button className="underline" onClick={reload}>Try again</button></p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {data.frames.slice(0, 8).map((f, i) => <FrameCard key={f.id} frame={f} index={i} />)}
          </div>
        )}
        <div className="mt-12 text-center"><Link to="/frames" className="btn-outline">View all frames <ArrowRight className="h-4 w-4" /></Link></div>
      </div>
    </section>
  );
}

function Categories() {
  const { data } = useFetch(() => api.categories());
  const cats = data ? data.categories : [];
  if (!cats.length) return null;
  return (
    <section className="section-y bg-dusty-pink">
      <div className="container-x">
        <SectionHeading eyebrow="Collections" title="Shop by category" subtitle="Whatever the occasion, there is a frame for it." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
          {cats.map((c, i) => (
            <Reveal key={c.id} delay={Math.min(i, 5) * 0.05}>
              <Link to={`/frames?category=${c.slug}`} className="group flex h-full flex-col justify-between rounded-2xl border border-beige/80 bg-cream p-5 transition hover:-translate-y-1 hover:border-bronze hover:shadow-soft">
                <div>
                  <h3 className="font-serif text-lg font-semibold">{c.name}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-charcoal-500">{c.description}</p>
                </div>
                <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-bronze-600">{c.frameCount} {c.frameCount === 1 ? 'frame' : 'frames'} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section className="section-y">
      <div className="container-x">
        <SectionHeading eyebrow="Why choose us" title="Framing, done with care" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w, i) => (
            <Reveal key={w.title} delay={i * 0.08}>
              <div className="card h-full p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-beige/70 text-bronze-600"><w.icon className="h-6 w-6" /></span>
                <h3 className="mt-5 font-serif text-xl font-semibold">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{w.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="section-y bg-charcoal text-cream">
      <div className="container-x">
        <div className="mb-14 text-center">
          <p className="eyebrow mb-3 !text-bronze-400">How it works</p>
          <h2 className="text-3xl font-semibold sm:text-4xl">Four simple steps</h2>
        </div>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <li className="relative text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-bronze-400/60 text-bronze-400"><s.icon className="h-7 w-7" /></span>
                <span className="mt-4 block font-serif text-sm text-bronze-400">0{i + 1}</span>
                <h3 className="mt-1 font-serif text-xl">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-[220px] text-sm text-cream/60">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CustomPreview() {
  const { data } = useFetch(() => api.frames({ featured: 1 }));
  const frames = data ? data.frames.slice(0, 5) : [];
  const [idx, setIdx] = useState(0);
  const f = frames[idx];
  if (!f) return null;
  return (
    <section className="section-y">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <FramePreview colorHex={f.colorHex} matHex={f.matHex} borderStyle={f.borderStyle} widthIn={8} heightIn={10} maxHeight={480} />
        </Reveal>
        <Reveal delay={0.1}>
          <p className="eyebrow mb-3">Custom frame preview</p>
          <h2 className="text-3xl font-semibold sm:text-4xl">See it before you book it</h2>
          <p className="mt-4 max-w-md text-charcoal-500">Try a finish below, then upload your own photo to see exactly how it will look on your wall.</p>
          <div className="mt-7 flex flex-wrap gap-3" role="radiogroup" aria-label="Frame finish">
            {frames.map((fr, i) => (
              <button key={fr.id} role="radio" aria-checked={i === idx} onClick={() => setIdx(i)} aria-label={fr.name}
                className={`h-11 w-11 rounded-full border-2 transition ${i === idx ? 'scale-110 border-bronze ring-4 ring-bronze/20' : 'border-white shadow-card hover:scale-105'}`} style={{ background: fr.colorHex }} />
            ))}
          </div>
          <p className="mt-4 font-serif text-xl">{f.name} <span className="text-sm text-charcoal-500">· {f.color}</span></p>
          <Link to="/create" className="btn-gold mt-8">Open the frame builder <ArrowRight className="h-4 w-4" /></Link>
        </Reveal>
      </div>
    </section>
  );
}

function Reviews() {
  const { data } = useFetch(() => api.reviews());
  const reviews = data ? data.reviews : [];
  if (!reviews.length) return null;
  return (
    <section className="section-y bg-dusty-pink">
      <div className="container-x">
        <SectionHeading eyebrow="Reviews" title="Loved by our customers" />
        <div className="grid gap-5 md:grid-cols-3">
          {reviews.slice(0, 3).map((r, i) => (
            <Reveal key={r.id} delay={i * 0.1}>
              <figure className="card h-full p-7">
                <Stars value={r.rating} />
                <blockquote className="mt-4 text-[15px] leading-relaxed text-charcoal-600">&ldquo;{r.body}&rdquo;</blockquote>
                <figcaption className="mt-5 text-sm"><span className="font-semibold">{r.author}</span>{r.location && <span className="text-charcoal-500"> · {r.location}</span>}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="section-y">
      <div className="container-x">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-charcoal px-6 py-14 text-center text-cream sm:px-12 sm:py-20">
            <Award className="mx-auto h-10 w-10 text-bronze-400" />
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold sm:text-4xl">Your favourite photograph deserves a beautiful home.</h2>
            <p className="mx-auto mt-4 max-w-lg text-cream/70">Book online in minutes. Pay on delivery or at our store.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/create" className="btn-gold px-8 py-4">Create Your Frame</Link>
              <Link to="/frames" className="btn border border-cream/30 px-8 py-4 text-cream hover:bg-cream hover:text-charcoal">Browse Frames</Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <SEO description="Premium custom photo frames crafted to preserve your most beautiful moments. Choose a design, pick a size, upload your photo and book online." />
      <Hero />
      <Featured />
      <Categories />
      <Why />
      <HowItWorks />
      <CustomPreview />
      <Reviews />
      <CTA />
    </>
  );
}
