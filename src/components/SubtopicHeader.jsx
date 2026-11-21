import { motion } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';
import { accentClass, DIFFICULTY_STYLES, topicIcon } from '../utils/topicMeta.js';

/**
 * Header for the selected subtopic: breadcrumb, gradient title, the known
 * progress bar and per-difficulty counts.
 */
export default function SubtopicHeader({ topic, subtopic, onAddQuestion }) {
  const Icon = topicIcon(topic.icon);
  const questions = subtopic.questions;
  const total = questions.length;
  const known = questions.reduce((n, q) => n + (q.known ? 1 : 0), 0);
  const pct = total ? (known / total) * 100 : 0;

  const counts = { easy: 0, medium: 0, hard: 0 };
  questions.forEach((q) => {
    if (counts[q.difficulty] !== undefined) counts[q.difficulty] += 1;
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`${accentClass(topic.color)} surface rounded-2xl p-4 sm:p-5`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            <span
              className="grid size-5 place-items-center rounded-md"
              style={{ background: 'var(--topic-soft)', color: 'var(--topic)' }}
            >
              <Icon size={12} aria-hidden="true" />
            </span>
            <span style={{ color: 'var(--topic)' }}>{topic.name}</span>
            <ChevronRight size={12} aria-hidden="true" />
            <span>{subtopic.name}</span>
          </nav>

          <h1 className="brand-text mt-2 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
            {subtopic.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {['easy', 'medium', 'hard'].map((level) => {
              const style = DIFFICULTY_STYLES[level];
              return (
                <span key={level} className="pill" style={{ background: style.bg, color: style.fg }}>
                  {style.label} {counts[level]}
                </span>
              );
            })}
            <span className="pill" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              {total} total
            </span>
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onAddQuestion}
          className="btn btn-primary shrink-0"
        >
          <Plus size={15} aria-hidden="true" />
          Add question
        </motion.button>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {known}/{total} known
          </span>
          <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {Math.round(pct)}%
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full"
          style={{ background: 'var(--surface-2)' }}
          role="progressbar"
          aria-valuenow={known}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${known} of ${total} questions marked known`}
        >
          <motion.div
            className="brand-gradient h-full rounded-full"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 26 }}
          />
        </div>
      </div>
    </motion.section>
  );
}
