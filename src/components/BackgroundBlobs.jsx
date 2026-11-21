import { useReducedMotion } from 'framer-motion';

const BLOBS = [
  { color: 'var(--blob-1)', size: 520, top: '-12%', left: '-8%', duration: 26, delay: 0 },
  { color: 'var(--blob-2)', size: 440, top: '34%', left: '62%', duration: 32, delay: -8 },
  { color: 'var(--blob-3)', size: 380, top: '72%', left: '18%', duration: 38, delay: -16 },
];

/**
 * Slow, very low contrast gradient blobs behind the whole app. Purely
 * decorative, pointer-events none, and switched off for reduced motion.
 */
export default function BackgroundBlobs() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {BLOBS.map((blob, i) => (
        <span
          key={i}
          className="ip-blob"
          style={{
            width: blob.size,
            height: blob.size,
            top: blob.top,
            left: blob.left,
            background: blob.color,
            animationDuration: `${blob.duration}s`,
            animationDelay: `${blob.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
