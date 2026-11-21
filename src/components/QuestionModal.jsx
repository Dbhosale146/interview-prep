import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Pencil } from 'lucide-react';
import Modal from './Modal.jsx';
import MarkdownAnswer from './MarkdownAnswer.jsx';
import { DIFFICULTIES } from '../utils/storage.js';
import { DIFFICULTY_STYLES } from '../utils/topicMeta.js';

const EMPTY = { q: '', a: '', difficulty: 'medium' };

/**
 * Add and edit dialog for a single question. Markdown is edited in a plain
 * textarea with a live preview tab; Ctrl/Cmd+Enter saves, Esc closes.
 */
export default function QuestionModal({ open, question, breadcrumb, onSave, onClose }) {
  const isEdit = Boolean(question);
  const [draft, setDraft] = useState(EMPTY);
  const [tab, setTab] = useState('write');
  const [errors, setErrors] = useState({});
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDraft(
      question
        ? { q: question.q, a: question.a, difficulty: question.difficulty }
        : { ...EMPTY },
    );
    setTab('write');
    setErrors({});
  }, [open, question]);

  const set = (key) => (event) => {
    setDraft((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const save = () => {
    const next = {};
    if (!draft.q.trim()) next.q = 'The question cannot be empty.';
    if (!draft.a.trim()) next.a = 'The answer cannot be empty.';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      if (next.q) textareaRef.current?.form?.querySelector('input,textarea')?.focus();
      return;
    }
    onSave({
      q: draft.q.trim(),
      a: draft.a.trim(),
      difficulty: DIFFICULTIES.includes(draft.difficulty) ? draft.difficulty : 'medium',
    });
  };

  // Ctrl/Cmd+Enter saves from anywhere inside the dialog.
  const onKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      save();
    }
  };

  const wordCount = useMemo(() => {
    const prose = draft.a.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
    return prose.split(/\s+/).filter(Boolean).length;
  }, [draft.a]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit question' : 'Add question'}
      subtitle={breadcrumb}
      size="lg"
      labelId="question-modal-title"
      footer={
        <>
          <span className="mr-auto hidden text-xs sm:block" style={{ color: 'var(--text-muted)' }}>
            Ctrl/Cmd + Enter to save &middot; Esc to cancel
          </span>
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={onClose} className="btn">
            Cancel
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={save} className="btn btn-primary">
            {isEdit ? 'Save changes' : 'Add question'}
          </motion.button>
        </>
      }
    >
      <div onKeyDown={onKeyDown} className="space-y-4">
        <div>
          <label
            htmlFor="qm-question"
            className="mb-1.5 block text-xs font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            Question
          </label>
          <textarea
            id="qm-question"
            data-autofocus
            className="field resize-y"
            rows={2}
            value={draft.q}
            placeholder="What is the difference between a list and a tuple?"
            onChange={set('q')}
          />
          {errors.q ? (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--hard-fg)' }}>
              {errors.q}
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-1.5 flex items-end justify-between gap-3">
            <label htmlFor="qm-answer" className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Answer <span style={{ color: 'var(--text-muted)' }}>(markdown)</span>
            </label>
            <div
              className="flex items-center gap-0.5 rounded-lg p-0.5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              {[
                { id: 'write', label: 'Write', icon: Pencil },
                { id: 'preview', label: 'Preview', icon: Eye },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-pressed={tab === id}
                  className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
                  style={{ color: tab === id ? 'var(--text)' : 'var(--text-muted)' }}
                >
                  {tab === id ? (
                    <motion.span
                      layoutId="qm-tab"
                      transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                      className="absolute inset-0 rounded-md"
                      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}
                    />
                  ) : null}
                  <Icon size={12} aria-hidden="true" className="relative" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {tab === 'write' ? (
              <motion.div
                key="write"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <textarea
                  id="qm-answer"
                  ref={textareaRef}
                  className="field resize-y font-mono text-[0.8125rem] leading-relaxed"
                  rows={10}
                  value={draft.a}
                  placeholder={'Short, direct answer.\n\n```python\nprint("code fences are supported")\n```'}
                  onChange={set('a')}
                  spellCheck="true"
                />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="scroll-area min-h-[13rem] rounded-xl p-3.5"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', maxHeight: '24rem' }}
              >
                {draft.a.trim() ? (
                  <MarkdownAnswer>{draft.a}</MarkdownAnswer>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Nothing to preview yet.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-1.5 flex items-center justify-between gap-3">
            {errors.a ? (
              <p className="text-xs" style={{ color: 'var(--hard-fg)' }}>
                {errors.a}
              </p>
            ) : (
              <span />
            )}
            <p
              className="text-xs tabular-nums"
              style={{ color: wordCount > 40 ? 'var(--medium-fg)' : 'var(--text-muted)' }}
            >
              {wordCount} words of prose{wordCount > 40 ? ' - aim for under 40' : ''}
            </p>
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Difficulty
          </legend>
          <div className="flex gap-2">
            {DIFFICULTIES.map((level) => {
              const style = DIFFICULTY_STYLES[level];
              const active = draft.difficulty === level;
              return (
                <motion.button
                  key={level}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDraft((prev) => ({ ...prev, difficulty: level }))}
                  aria-pressed={active}
                  className="cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={
                    active
                      ? { background: style.bg, color: style.fg, border: `1px solid ${style.fg}` }
                      : {
                          background: 'var(--surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }
                  }
                >
                  {style.label}
                </motion.button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
