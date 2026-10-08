import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
let nextId = 1;

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const COLORS = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-beige-300 bg-white text-charcoal',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message, ms = 4500) => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const value = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m, 6500),
    info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:left-auto sm:right-4 sm:top-20 sm:items-end" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-soft ${COLORS[t.type]}`}
                role="status"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">{t.message}</span>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
