import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, MessageCircle, Phone, Palette, Ruler, Upload, PackageCheck, Gem, Heart, Hammer } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { whatsappLink } from '../utils/format';
import { Reveal, SEO, SectionHeading } from '../components/ui';

function PageHero({ eyebrow, title, text }) {
  return (
    <section className="border-b border-beige/70 bg-beige-100">
      <div className="container-x py-12 text-center sm:py-16">
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">{title}</h1>
        {text && <p className="mx-auto mt-4 max-w-xl text-charcoal-500">{text}</p>}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: Palette, title: 'Choose your design', text: 'Browse our collection by style, colour and material, or start from the frame builder.' },
    { icon: Ruler, title: 'Select a size', text: 'Pick from 4×6 up to 20×30 inches. The price updates instantly with every choice.' },
    { icon: Upload, title: 'Upload your photo', text: 'Add a JPG, PNG or WebP and see it inside your frame before you book.' },
    { icon: PackageCheck, title: 'Book & track', text: 'Confirm your booking, receive an emailed PDF receipt, and track progress any time.' },
  ];
  return (
    <>
      <SEO title="How It Works" description="Choose a frame, pick a size, upload your photo and book online. Here is how our custom framing works." />
      <PageHero eyebrow="Simple process" title="How it works" text="From idea to doorstep in four easy steps." />
      <div className="container-x section-y">
        <ol className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <li className="card flex h-full gap-5 p-6">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-beige/70 text-bronze-600"><s.icon className="h-7 w-7" /></span>
                <div><p className="font-serif text-sm text-bronze">Step {i + 1}</p><h2 className="font-serif text-xl font-semibold">{s.title}</h2><p className="mt-2 text-sm text-charcoal-500">{s.text}</p></div>
              </li>
            </Reveal>
          ))}
        </ol>
        <div className="mt-12 text-center"><Link to="/create" className="btn-gold">Start your frame</Link></div>
      </div>
    </>
  );
}

export function About() {
  const { settings } = useSettings();
  const values = [
    { icon: Hammer, title: 'Craft first', text: 'Every frame is measured, cut and finished by hand in our workshop.' },
    { icon: Gem, title: 'Honest materials', text: 'Solid wood, real metal and conservation-grade glass. No shortcuts.' },
    { icon: Heart, title: 'Made for memories', text: 'We treat every photograph as if it were our own.' },
  ];
  return (
    <>
      <SEO title="About Us" description={`About ${settings.shop_name}: a family frame shop devoted to preserving your memories beautifully.`} />
      <PageHero eyebrow="Our story" title={`About ${settings.shop_name}`} text="A frame shop devoted to the quiet art of preserving moments." />
      <div className="container-x section-y">
        <div className="mx-auto max-w-2xl space-y-5 text-center text-lg leading-relaxed text-charcoal-600">
          <p>We started with a simple belief: a photograph that matters deserves a frame that matters just as much.</p>
          <p>Today we combine traditional framing craftsmanship with a simple online experience, so you can choose, preview and book your frame from anywhere, then collect it from our store or have it delivered to your door.</p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-3">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.08}>
              <div className="card h-full p-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-beige/70 text-bronze-600"><v.icon className="h-6 w-6" /></span>
                <h3 className="mt-4 font-serif text-xl font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-charcoal-500">{v.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </>
  );
}

export function Contact() {
  const { settings } = useSettings();
  const wa = whatsappLink(settings.whatsapp_number, `Hello ${settings.shop_name}, I would like to enquire about a frame.`);
  const items = [
    { icon: Phone, label: 'Phone', value: settings.shop_phone, href: `tel:${settings.shop_phone}` },
    { icon: Mail, label: 'Email', value: settings.shop_email, href: `mailto:${settings.shop_email}` },
    { icon: MapPin, label: 'Address', value: settings.shop_address },
  ];
  return (
    <>
      <SEO title="Contact" description={`Visit, call or message ${settings.shop_name}. Find our address, phone number and business hours.`} />
      <PageHero eyebrow="Get in touch" title="Contact us" text="We would love to help you choose the perfect frame." />
      <div className="container-x section-y grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.label} className="card flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-beige/70 text-bronze-600"><it.icon className="h-5 w-5" /></span>
              <div className="min-w-0"><p className="label !mb-0.5">{it.label}</p>{it.href ? <a href={it.href} className="break-words font-medium hover:text-bronze-600">{it.value}</a> : <p className="font-medium">{it.value}</p>}</div>
            </div>
          ))}
          <div className="card flex items-start gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-beige/70 text-bronze-600"><Clock className="h-5 w-5" /></span>
            <div><p className="label !mb-0.5">Business hours</p><p className="whitespace-pre-line font-medium">{settings.business_hours}</p></div>
          </div>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#25D366] py-4 text-white hover:bg-[#1fb857]"><MessageCircle className="h-5 w-5" /> Chat on WhatsApp</a>}
        </div>
        <div className="min-h-[320px] overflow-hidden rounded-2xl border border-beige/70 bg-beige-100">
          {settings.maps_embed_url ? (
            <iframe title="Shop location map" src={settings.maps_embed_url} className="h-full min-h-[320px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
              <MapPin className="h-10 w-10 text-bronze" />
              <p className="font-serif text-xl">Map placeholder</p>
              <p className="max-w-xs text-sm text-charcoal-500">Add your Google Maps embed link in Admin → Settings and the map will appear here.</p>
              <a className="btn-outline btn-sm" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.shop_address)}`}>Open in Google Maps</a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <SEO title="Page not found" />
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-4xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-charcoal-500">The page may have moved or never existed.</p>
      <Link to="/" className="btn-primary mt-8">Back to home</Link>
    </div>
  );
}
