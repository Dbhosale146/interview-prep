import { motion, useReducedMotion } from 'framer-motion';

/**
 * Friendly placeholder for "no search results" and "empty subtopic".
 * The icon floats gently unless the user prefers reduced motion.
 */
export default function EmptyState({ icon: Icon, title, message, action }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <motion.div
        animate={reduced ? undefined : { y: [0, -7, 0] }}
        transition={reduced ? undefined : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        className="grid size-16 place-items-center rounded-2xl"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
      >
        <Icon size={28} aria-hidden="true" />
      </motion.div>
      <h3 className="mt-5 text-base font-semibold" style={{ color: 'var(--text)' }}>
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </motion.div>
  );
}
