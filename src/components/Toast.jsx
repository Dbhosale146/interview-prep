import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const TINTS = {
  success: { fg: 'var(--known-fg)', bg: 'var(--known-bg)' },
  error: { fg: 'var(--hard-fg)', bg: 'var(--hard-bg)' },
  info: { fg: 'var(--accent)', bg: 'var(--accent-soft)' },
};

/**
 * Bottom-right toast stack. `toasts` is an array of
 * `{ id, type, title, message }`; each one auto-dismisses in App.
 */
export default function Toast({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          const tint = TINTS[toast.type] || TINTS.info;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 32, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 32, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="surface pointer-events-auto flex items-start gap-2.5 rounded-xl p-3"
              style={{ boxShadow: 'var(--shadow-pop)' }}
            >
              <span
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg"
                style={{ background: tint.bg, color: tint.fg }}
              >
                <Icon size={14} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] leading-snug font-semibold" style={{ color: 'var(--text)' }}>
                  {toast.title}
                </p>
                {toast.message ? (
                  <p className="mt-0.5 text-xs leading-snug break-words" style={{ color: 'var(--text-muted)' }}>
                    {toast.message}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="-m-1 cursor-pointer rounded-lg p-1 transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
