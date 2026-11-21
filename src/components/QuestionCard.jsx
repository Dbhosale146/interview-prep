import { forwardRef, memo, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import MarkdownAnswer from './MarkdownAnswer.jsx';
import { DIFFICULTY_STYLES } from '../utils/topicMeta.js';

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Splits `text` on `query` and wraps the hits in <mark>. */
function highlightText(text, query) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  if (parts.length === 1) return text;
  const lower = query.toLowerCase();
  return parts.map((part, i) =>
    part.toLowerCase() === lower ? (
      <mark key={i} className="ip-mark">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** A short plain-text window around the first answer match. */
function answerExcerpt(answer, query) {
  const plain = answer
    .replace(/```[\s\S]*?```/g, ' [code] ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const at = plain.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return null;
  const start = Math.max(0, at - 48);
  const end = Math.min(plain.length, at + query.length + 72);
  return `${start > 0 ? '…' : ''}${plain.slice(start, end)}${end < plain.length ? '…' : ''}`;
}

/** Small celebratory burst anchored to the element that was clicked. */
function celebrate(element) {
  const rect = element?.getBoundingClientRect();
  confetti({
    particleCount: 46,
    spread: 62,
    startVelocity: 26,
    gravity: 0.9,
    ticks: 150,
    scalar: 0.78,
    disableForReducedMotion: true,
    colors: ['#6366f1', '#22d3ee', '#34d399', '#a855f7'],
    origin: rect
      ? {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        }
      : { x: 0.5, y: 0.6 },
  });
}

const EASE_OUT = [0.16, 1, 0.3, 1];

const QuestionCard = forwardRef(function QuestionCard(
  {
    question,
    number,
    isOpen,
    onToggle,
    onEdit,
    onDelete,
    onToggleKnown,
    breadcrumb,
    query = '',
    pulse = false,
    enterDelay = 0,
  },
  ref,
) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const knownButtonRef = useRef(null);
  const difficulty = DIFFICULTY_STYLES[question.difficulty] || DIFFICULTY_STYLES.medium;
  const excerpt = query ? answerExcerpt(question.a, query) : null;

  // One attention pulse when the random-question button lands on this card.
  useEffect(() => {
    if (!pulse) return;
    if (reduced) return;
    controls.start({
      boxShadow: [
        'var(--shadow-card)',
        '0 0 0 3px var(--accent-soft), 0 12px 32px rgb(99 102 241 / 0.28)',
        'var(--shadow-card)',
      ],
      scale: [1, 1.012, 1],
      transition: { duration: 0.85, ease: 'easeOut' },
    });
  }, [pulse, reduced, controls]);

  const onKeyDown = (event) => {
    // Only the card itself responds, never a keystroke aimed at a button.
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      onToggle();
    }
  };

  const handleKnown = (event) => {
    if (!question.known) celebrate(event.currentTarget);
    onToggleKnown();
  };

  return (
    <motion.article
      ref={ref}
      id={`question-${question.id}`}
      layout="position"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.985 }}
      transition={{ duration: 0.28, ease: EASE_OUT, delay: enterDelay }}
      className="group/card scroll-mt-28 rounded-2xl"
    >
      <motion.div
        animate={controls}
        whileHover={reduced ? undefined : { y: -2, boxShadow: 'var(--shadow-card-hover)' }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        tabIndex={0}
        role="group"
        aria-label={`Question ${number}`}
        onKeyDown={onKeyDown}
        className="rounded-2xl p-4 sm:p-5"
        style={{
          background: question.known ? 'var(--known-bg)' : 'var(--surface)',
          border: `1px solid ${
            isOpen ? 'var(--accent-ring)' : question.known ? 'var(--known-border)' : 'var(--border)'
          }`,
          boxShadow: isOpen ? '0 0 0 3px var(--accent-soft), var(--shadow-card)' : 'var(--shadow-card)',
          transition: 'border-color 0.22s ease-out, background-color 0.28s ease-out',
        }}
      >
        {breadcrumb ? (
          <div
            className="mb-2 flex items-center gap-1 text-[11px] font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{breadcrumb.topic}</span>
            <ChevronRight size={11} aria-hidden="true" />
            <span>{breadcrumb.subtopic}</span>
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-semibold tabular-nums"
            style={{
              background: question.known ? 'var(--known-border)' : 'var(--surface-2)',
              color: question.known ? 'var(--known-fg)' : 'var(--text-muted)',
            }}
          >
            {number}
          </span>

          <div className="min-w-0 flex-1">
            <h3
              className="text-[0.9375rem] leading-snug font-semibold sm:text-base"
              style={{ color: 'var(--text)' }}
            >
              {highlightText(question.q, query)}
            </h3>

            {excerpt && !isOpen ? (
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {highlightText(excerpt, query)}
              </p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="pill" style={{ background: difficulty.bg, color: difficulty.fg }}>
                {difficulty.label}
              </span>

              <motion.button
                ref={knownButtonRef}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleKnown}
                aria-pressed={question.known}
                className="pill cursor-pointer transition-colors"
                style={
                  question.known
                    ? { background: 'var(--known-border)', color: 'var(--known-fg)' }
                    : { background: 'var(--surface-2)', color: 'var(--text-muted)' }
                }
              >
                <motion.span
                  key={question.known ? 'on' : 'off'}
                  initial={reduced ? false : { scale: 0.4, rotate: -25 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 620, damping: 18 }}
                  className="grid place-items-center"
                >
                  <Check size={11} aria-hidden="true" strokeWidth={3} />
                </motion.span>
                {question.known ? 'Known' : 'Mark known'}
              </motion.button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={onEdit}
              aria-label="Edit question"
              title="Edit question"
              className="btn btn-icon"
            >
              <Pencil size={15} aria-hidden="true" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={onDelete}
              aria-label="Delete question"
              title="Delete question"
              className="btn btn-icon"
            >
              <Trash2 size={15} aria-hidden="true" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={onToggle}
              aria-expanded={isOpen}
              aria-controls={`answer-${question.id}`}
              aria-label={isOpen ? 'Hide answer' : 'Show answer'}
              title={isOpen ? 'Hide answer' : 'Show answer'}
              className={`btn btn-icon ${isOpen ? 'btn-primary' : ''}`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isOpen ? 'open' : 'closed'}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, rotate: -70, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, rotate: 70, scale: 0.6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="grid place-items-center"
                >
                  {isOpen ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isOpen ? (
            <motion.div
              key="answer"
              id={`answer-${question.id}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: { duration: 0.3, ease: EASE_OUT }, opacity: { duration: 0.2 } }}
              className="overflow-hidden"
            >
              <motion.div
                initial={reduced ? { opacity: 0 } : { filter: 'blur(7px)', opacity: 0, y: 6 }}
                animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { filter: 'blur(5px)', opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.04 }}
                className="mt-4 border-t pt-3.5 pl-0 sm:pl-10"
                style={{ borderColor: 'var(--border)' }}
              >
                <MarkdownAnswer>{question.a}</MarkdownAnswer>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.article>
  );
});

export default memo(QuestionCard);
