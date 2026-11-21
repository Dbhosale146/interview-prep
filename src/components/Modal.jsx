import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared shell for every dialog in the app: blurred backdrop, spring-scaled
 * panel, Esc to close, body scroll lock and a simple focus trap.
 *
 * Rendered into a portal so a motion transform on an ancestor can never
 * break the fixed positioning.
 */
export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', labelId }) {
  const panelRef = useRef(null);
  const restoreTo = useRef(null);

  // Esc closes; Tab cycles inside the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const list = Array.from(nodes);
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  // Lock page scroll and move focus into the panel.
  useEffect(() => {
    if (!open) return undefined;
    restoreTo.current = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const raf = requestAnimationFrame(() => {
      const target =
        panelRef.current?.querySelector('[data-autofocus]') ||
        panelRef.current?.querySelector(FOCUSABLE);
      target?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previous;
      if (restoreTo.current instanceof HTMLElement) restoreTo.current.focus();
    };
  }, [open]);

  const maxWidth = { sm: 'max-w-sm', md: 'max-w-xl', lg: 'max-w-3xl' }[size] || 'max-w-xl';

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/50"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 440, damping: 34 }}
            className={`relative flex max-h-[92dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl`}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-pop)',
            }}
          >
            <header
              className="flex items-start justify-between gap-4 border-b px-5 py-4"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="min-w-0">
                <h2 id={labelId} className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                  {title}
                </h2>
                {subtitle ? (
                  <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                aria-label="Close dialog"
                className="btn btn-icon shrink-0"
              >
                <X size={16} aria-hidden="true" />
              </motion.button>
            </header>

            <div className="scroll-area min-h-0 flex-1 px-5 py-4">{children}</div>

            {footer ? (
              <footer
                className="flex items-center justify-end gap-2 border-t px-5 py-3.5"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
              >
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
