import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { whatsappLink } from '../utils/format';
import { Logo } from './Navbar';

export default function Footer() {
  const { settings } = useSettings();
  const [cats, setCats] = useState([]);
  useEffect(() => { api.categories().then((d) => setCats(d.categories.slice(0, 6))).catch(() => {}); }, []);
  const wa = whatsappLink(settings.whatsapp_number, `Hello ${settings.shop_name}, I have a question about frames.`);

  return (
    <footer className="mt-auto bg-charcoal text-cream/80">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-cream/60">{settings.shop_tagline}</p>
          <div className="flex gap-2">
            {settings.instagram_url && <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="rounded-full border border-cream/20 p-2.5 hover:border-bronze-400 hover:text-bronze-400"><Instagram className="h-4 w-4" /></a>}
            {settings.facebook_url && <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="rounded-full border border-cream/20 p-2.5 hover:border-bronze-400 hover:text-bronze-400"><Facebook className="h-4 w-4" /></a>}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="rounded-full border border-cream/20 p-2.5 hover:border-bronze-400 hover:text-bronze-400"><MessageCircle className="h-4 w-4" /></a>}
          </div>
        </div>
        <div>
          <h4 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-bronze-400">Quick Links</h4>
          <ul className="space-y-2.5 text-sm">
            {[['/frames', 'All Frames'], ['/create', 'Create Your Frame'], ['/how-it-works', 'How It Works'], ['/track-order', 'Track Order'], ['/about', 'About Us'], ['/contact', 'Contact']].map(([to, l]) => (
              <li key={to}><Link to={to} className="hover:text-bronze-400">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-bronze-400">Frame Categories</h4>
          <ul className="space-y-2.5 text-sm">
            {cats.map((c) => <li key={c.id}><Link to={`/frames?category=${c.slug}`} className="hover:text-bronze-400">{c.name}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-bronze-400">Visit &amp; Contact</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bronze-400" />{settings.shop_address}</li>
            <li className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-bronze-400" /><a href={`tel:${settings.shop_phone}`} className="hover:text-bronze-400">{settings.shop_phone}</a></li>
            <li className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-bronze-400" /><a href={`mailto:${settings.shop_email}`} className="break-all hover:text-bronze-400">{settings.shop_email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {settings.shop_name}. All rights reserved.
      </div>
    </footer>
  );
}
