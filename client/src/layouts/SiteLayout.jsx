import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useSettings } from '../context/SettingsContext';
import { whatsappLink } from '../utils/format';

export default function SiteLayout() {
  const { pathname } = useLocation();
  const { settings } = useSettings();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  const wa = whatsappLink(settings.whatsapp_number, `Hello ${settings.shop_name}, I would like to know more about your frames.`);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-charcoal focus:px-4 focus:py-2 focus:text-cream">Skip to content</a>
      <Navbar />
      <motion.main key={pathname} id="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex-1">
        <Outlet />
      </motion.main>
      <Footer />
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-soft transition hover:scale-105">
          <MessageCircle className="h-7 w-7" />
        </a>
      )}
    </div>
  );
}
