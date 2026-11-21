import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { accentClass, topicIcon } from '../utils/topicMeta.js';

function countKnown(questions) {
  return questions.reduce((n, q) => n + (q.known ? 1 : 0), 0);
}

function TopicBlock({
  topic,
  expanded,
  selection,
  onToggleTopic,
  onSelectSubtopic,
  onAddSubtopic,
  onDeleteTopic,
  onDeleteSubtopic,
  reduced,
}) {
  const Icon = topicIcon(topic.icon);
  const total = topic.subtopics.reduce((n, s) => n + s.questions.length, 0);
  const known = topic.subtopics.reduce((n, s) => n + countKnown(s.questions), 0);
  const isActiveTopic = selection.topicId === topic.id;

  return (
    <li className={accentClass(topic.color)}>
      <div className="group/topic flex items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleTopic(topic.id)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
        >
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg"
            style={{ background: 'var(--topic-soft)', color: 'var(--topic)' }}
          >
            <Icon size={16} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block truncate text-[0.8125rem] font-semibold"
              style={{ color: isActiveTopic ? 'var(--text)' : 'var(--text-secondary)' }}
            >
              {topic.name}
            </span>
            <span className="block text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {known}/{total} known
            </span>
          </span>
          <motion.span
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronRight size={15} aria-hidden="true" />
          </motion.span>
        </button>
        <button
          type="button"
          onClick={() => onDeleteTopic(topic)}
          aria-label={`Delete topic ${topic.name}`}
          title="Delete topic"
          className="shrink-0 cursor-pointer rounded-lg p-1.5 opacity-0 transition-all group-hover/topic:opacity-100 focus-visible:opacity-100 hover:bg-[var(--hard-bg)] hover:text-[var(--hard-fg)]"
          style={{ color: 'var(--text-muted)' }}
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="subtopics"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.26, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.18 } }}
            className="overflow-hidden"
          >
            <ul className="mt-0.5 ml-4 space-y-0.5 border-l pl-2" style={{ borderColor: 'var(--border)' }}>
              {topic.subtopics.map((sub) => {
                const active = selection.topicId === topic.id && selection.subtopicId === sub.id;
                const subKnown = countKnown(sub.questions);
                const pct = sub.questions.length ? (subKnown / sub.questions.length) * 100 : 0;
                return (
                  <li key={sub.id} className="group/sub relative flex items-center">
                    {active ? (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                        className="absolute inset-0 rounded-lg"
                        style={{ background: 'var(--accent-soft)' }}
                      />
                    ) : null}
                    <motion.button
                      type="button"
                      whileHover={reduced ? undefined : { x: 2 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => onSelectSubtopic(topic.id, sub.id)}
                      aria-current={active ? 'page' : undefined}
                      className="relative min-w-0 flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="min-w-0 flex-1 truncate text-[0.8125rem]"
                          style={{
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: active ? 600 : 450,
                          }}
                        >
                          {sub.name}
                        </span>
                        <span
                          className="shrink-0 font-mono text-[10px] tabular-nums"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {subKnown}/{sub.questions.length}
                        </span>
                      </span>
                      <span
                        className="mt-1 block h-[3px] overflow-hidden rounded-full"
                        style={{ background: 'var(--surface-2)' }}
                      >
                        <motion.span
                          className="block h-full rounded-full brand-gradient"
                          initial={false}
                          animate={{ width: `${pct}%` }}
                          transition={{ type: 'spring', stiffness: 220, damping: 30 }}
                        />
                      </span>
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => onDeleteSubtopic(topic, sub)}
                      aria-label={`Delete subtopic ${sub.name}`}
                      title="Delete subtopic"
                      className="relative shrink-0 cursor-pointer rounded-lg p-1.5 opacity-0 transition-all group-hover/sub:opacity-100 focus-visible:opacity-100 hover:bg-[var(--hard-bg)] hover:text-[var(--hard-fg)]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}

              <li>
                <button
                  type="button"
                  onClick={() => onAddSubtopic(topic)}
                  className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.8125rem] font-medium transition-colors hover:bg-[var(--surface-hover)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Plus size={13} aria-hidden="true" />
                  Add subtopic
                </button>
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

/**
 * Topic / subtopic navigation. Rendered either as the fixed desktop column or
 * inside the mobile drawer (App decides which, never both).
 */
export default function Sidebar({
  topics,
  selection,
  expanded,
  onToggleTopic,
  onSelectSubtopic,
  onAddTopic,
  onAddSubtopic,
  onDeleteTopic,
  onDeleteSubtopic,
  onClose,
  animateIn = false,
}) {
  const reduced = useReducedMotion();

  return (
    <motion.nav
      aria-label="Topics"
      initial={animateIn && !reduced ? { x: -24, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className="glass flex h-full flex-col border-r"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="brand-gradient grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-sm">
          <Sparkles size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="brand-text block text-base leading-tight font-bold tracking-tight">
            InterviewPrep
          </span>
          <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Offline Q&amp;A practice
          </span>
        </span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="btn btn-icon shrink-0 lg:hidden"
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="scroll-area min-h-0 flex-1 px-2 pb-2">
        <ul className="space-y-1">
          {topics.map((topic) => (
            <TopicBlock
              key={topic.id}
              topic={topic}
              expanded={expanded.includes(topic.id)}
              selection={selection}
              onToggleTopic={onToggleTopic}
              onSelectSubtopic={onSelectSubtopic}
              onAddSubtopic={onAddSubtopic}
              onDeleteTopic={onDeleteTopic}
              onDeleteSubtopic={onDeleteSubtopic}
              reduced={reduced}
            />
          ))}
        </ul>
      </div>

      <div className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onAddTopic}
          className="btn w-full"
        >
          <Plus size={15} aria-hidden="true" />
          Add topic
        </motion.button>
      </div>
    </motion.nav>
  );
}
