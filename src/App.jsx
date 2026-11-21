import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileQuestion, Inbox, Layers, SearchX } from 'lucide-react';

import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import SubtopicHeader from './components/SubtopicHeader.jsx';
import QuestionCard from './components/QuestionCard.jsx';
import QuestionModal from './components/QuestionModal.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import NameModal from './components/NameModal.jsx';
import Modal from './components/Modal.jsx';
import Toast from './components/Toast.jsx';
import EmptyState from './components/EmptyState.jsx';
import BackgroundBlobs from './components/BackgroundBlobs.jsx';

import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { useTheme } from './hooks/useTheme.js';
import { newContainerId, newQuestionId } from './utils/ids.js';
import { nextTopicColor } from './utils/topicMeta.js';
import {
  addTombstone,
  DEFAULT_SETTINGS,
  exportDataset,
  loadDataset,
  mergeImport,
  parseImport,
  resetToSeed,
  saveDataset,
  SETTINGS_KEY,
} from './utils/storage.js';

const STAGGER = 0.04;
const MAX_STAGGERED = 8;

function CardSkeleton({ lines = 2 }) {
  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="skeleton size-7 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2.5">
          <div className="skeleton h-4 w-3/4" />
          {lines > 1 ? <div className="skeleton h-4 w-1/2" /> : null}
          <div className="flex gap-2">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-5 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [dataset, setDataset] = useState(null);
  const [booting, setBooting] = useState(true);
  const [settings, setSettings] = useLocalStorage(SETTINGS_KEY, DEFAULT_SETTINGS);

  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState(() => new Set());
  const [pulseId, setPulseId] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [questionModal, setQuestionModal] = useState(null);
  const [nameModal, setNameModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [importChoice, setImportChoice] = useState(null);

  const searchRef = useRef(null);
  const mainRef = useRef(null);
  const toastTimers = useRef(new Map());

  /* ----------------------------------------------------------- *
   * Toasts
   * ----------------------------------------------------------- */
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (type, title, message) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
      const timer = setTimeout(() => dismissToast(id), type === 'error' ? 7000 : 3200);
      toastTimers.current.set(id, timer);
    },
    [dismissToast],
  );

  useEffect(() => {
    const timers = toastTimers.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  /* ----------------------------------------------------------- *
   * First load: seed or merge, with a brief skeleton on a cold start
   * ----------------------------------------------------------- */
  useEffect(() => {
    const result = loadDataset();
    setDataset(result.dataset);

    const settle = setTimeout(() => setBooting(false), result.status === 'seeded' ? 420 : 0);

    if (result.status === 'recovered') {
      toast('error', 'Stored data was unreadable', 'Loaded the bundled questions instead.');
    } else if (result.status === 'upgraded' && result.added > 0) {
      toast('success', 'New questions added', `${result.added} new seed question${result.added === 1 ? '' : 's'} merged in. Your edits were kept.`);
    }

    return () => clearTimeout(settle);
  }, [toast]);

  /* ----------------------------------------------------------- *
   * Dataset mutation (always persisted)
   * ----------------------------------------------------------- */
  const mutate = useCallback((updater) => {
    setDataset((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (next === prev) return prev;
      if (!saveDataset(next)) {
        // Keep the change in memory but let the user know it will not survive.
        window.setTimeout(
          () => setToasts((t) => [...t, { id: `s-${Date.now()}`, type: 'error', title: 'Could not save', message: 'Browser storage is unavailable, so this change will be lost on refresh.' }]),
          0,
        );
      }
      return next;
    });
  }, []);

  const mapSubtopic = useCallback(
    (topicId, subtopicId, fn) =>
      mutate((prev) => ({
        ...prev,
        topics: prev.topics.map((topic) =>
          topic.id !== topicId
            ? topic
            : {
                ...topic,
                subtopics: topic.subtopics.map((sub) => (sub.id !== subtopicId ? sub : fn(sub))),
              },
        ),
      })),
    [mutate],
  );

  /* ----------------------------------------------------------- *
   * Selection
   * ----------------------------------------------------------- */
  const topics = dataset?.topics ?? [];

  const selection = useMemo(() => {
    if (topics.length === 0) return { topicId: null, subtopicId: null };
    const topic = topics.find((t) => t.id === settings.topicId) || topics[0];
    const sub = topic.subtopics.find((s) => s.id === settings.subtopicId) || topic.subtopics[0];
    return { topicId: topic.id, subtopicId: sub?.id ?? null };
  }, [topics, settings.topicId, settings.subtopicId]);

  const activeTopic = topics.find((t) => t.id === selection.topicId) || null;
  const activeSubtopic = activeTopic?.subtopics.find((s) => s.id === selection.subtopicId) || null;

  // Keep the active topic expanded in the sidebar.
  useEffect(() => {
    if (!selection.topicId) return;
    setSettings((prev) =>
      prev.expanded.includes(selection.topicId)
        ? prev
        : { ...prev, expanded: [...prev.expanded, selection.topicId] },
    );
  }, [selection.topicId, setSettings]);

  const selectSubtopic = useCallback(
    (topicId, subtopicId) => {
      setSettings((prev) => ({ ...prev, topicId, subtopicId }));
      setQuery('');
      setNavOpen(false);
    },
    [setSettings],
  );

  /* ----------------------------------------------------------- *
   * Visible questions (search across everything, or the subtopic)
   * ----------------------------------------------------------- */
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  const passesFilter = useCallback(
    (question) => {
      if (settings.filter === 'known') return question.known;
      if (settings.filter === 'revision') return !question.known;
      return true;
    },
    [settings.filter],
  );

  const visible = useMemo(() => {
    const needle = trimmedQuery.toLowerCase();
    const rows = [];

    const push = (topic, sub, question, withBreadcrumb) => {
      rows.push({
        question,
        topicId: topic.id,
        subtopicId: sub.id,
        breadcrumb: withBreadcrumb ? { topic: topic.name, subtopic: sub.name } : null,
      });
    };

    if (isSearching) {
      for (const topic of topics) {
        for (const sub of topic.subtopics) {
          for (const question of sub.questions) {
            const hit =
              question.q.toLowerCase().includes(needle) || question.a.toLowerCase().includes(needle);
            if (hit && passesFilter(question)) push(topic, sub, question, true);
          }
        }
      }
      return rows;
    }

    if (activeTopic && activeSubtopic) {
      for (const question of activeSubtopic.questions) {
        if (passesFilter(question)) push(activeTopic, activeSubtopic, question, false);
      }
    }
    return rows;
  }, [isSearching, trimmedQuery, topics, activeTopic, activeSubtopic, passesFilter]);

  const anyOpen = visible.some((row) => openIds.has(row.question.id));

  /* ----------------------------------------------------------- *
   * Reveal / hide answers
   * ----------------------------------------------------------- */
  const toggleOpen = useCallback((id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setOpenIds((prev) => {
      if (visible.some((row) => prev.has(row.question.id))) {
        const next = new Set(prev);
        visible.forEach((row) => next.delete(row.question.id));
        return next;
      }
      const next = new Set(prev);
      visible.forEach((row) => next.add(row.question.id));
      return next;
    });
  }, [visible]);

  /* ----------------------------------------------------------- *
   * Question CRUD
   * ----------------------------------------------------------- */
  const toggleKnown = useCallback(
    (topicId, subtopicId, questionId) => {
      mapSubtopic(topicId, subtopicId, (sub) => ({
        ...sub,
        questions: sub.questions.map((q) => (q.id === questionId ? { ...q, known: !q.known } : q)),
      }));
    },
    [mapSubtopic],
  );

  const saveQuestion = useCallback(
    (values) => {
      if (!questionModal) return;
      const { topicId, subtopicId, question } = questionModal;

      if (question) {
        mapSubtopic(topicId, subtopicId, (sub) => ({
          ...sub,
          questions: sub.questions.map((q) => (q.id === question.id ? { ...q, ...values } : q)),
        }));
        toast('success', 'Saved', 'Your changes are stored locally.');
      } else {
        const created = { id: newQuestionId(), ...values, known: false };
        mapSubtopic(topicId, subtopicId, (sub) => ({ ...sub, questions: [...sub.questions, created] }));
        toast('success', 'Added', 'New question added to this subtopic.');
      }
      setQuestionModal(null);
    },
    [questionModal, mapSubtopic, toast],
  );

  const requestDeleteQuestion = useCallback(
    (topicId, subtopicId, question) => {
      setConfirm({
        title: 'Delete this question?',
        message: `"${question.q.slice(0, 120)}${question.q.length > 120 ? '…' : ''}" will be removed. This cannot be undone.`,
        confirmLabel: 'Delete question',
        onConfirm: () => {
          mapSubtopic(topicId, subtopicId, (sub) => ({
            ...sub,
            questions: sub.questions.filter((q) => q.id !== question.id),
          }));
          addTombstone('questions', question.id);
          setOpenIds((prev) => {
            if (!prev.has(question.id)) return prev;
            const next = new Set(prev);
            next.delete(question.id);
            return next;
          });
          setConfirm(null);
          toast('success', 'Deleted', 'The question was removed.');
        },
      });
    },
    [mapSubtopic, toast],
  );

  /* ----------------------------------------------------------- *
   * Topic / subtopic CRUD
   * ----------------------------------------------------------- */
  const addTopic = useCallback(
    (name) => {
      const id = newContainerId(name, topics.map((t) => t.id));
      const color = nextTopicColor(topics.map((t) => t.color));
      mutate((prev) => ({
        ...prev,
        topics: [...prev.topics, { id, name, icon: 'Folder', color, subtopics: [] }],
      }));
      setSettings((prev) => ({ ...prev, expanded: [...prev.expanded, id] }));
      setNameModal(null);
      toast('success', 'Topic added', `Add a subtopic to "${name}" to start adding questions.`);
    },
    [topics, mutate, setSettings, toast],
  );

  const addSubtopic = useCallback(
    (topic, name) => {
      const id = newContainerId(name, topic.subtopics.map((s) => s.id));
      mutate((prev) => ({
        ...prev,
        topics: prev.topics.map((t) =>
          t.id !== topic.id ? t : { ...t, subtopics: [...t.subtopics, { id, name, questions: [] }] },
        ),
      }));
      setSettings((prev) => ({ ...prev, topicId: topic.id, subtopicId: id }));
      setNameModal(null);
      toast('success', 'Subtopic added', `"${name}" is ready for questions.`);
    },
    [mutate, setSettings, toast],
  );

  const requestDeleteTopic = useCallback(
    (topic) => {
      const count = topic.subtopics.reduce((n, s) => n + s.questions.length, 0);
      setConfirm({
        title: `Delete "${topic.name}"?`,
        message: `This removes ${topic.subtopics.length} subtopic${topic.subtopics.length === 1 ? '' : 's'} and ${count} question${count === 1 ? '' : 's'}. Export a backup first if you want to keep them.`,
        confirmLabel: 'Delete topic',
        onConfirm: () => {
          mutate((prev) => ({ ...prev, topics: prev.topics.filter((t) => t.id !== topic.id) }));
          addTombstone('topics', topic.id);
          setSettings((prev) => ({
            ...prev,
            topicId: prev.topicId === topic.id ? null : prev.topicId,
            subtopicId: prev.topicId === topic.id ? null : prev.subtopicId,
            expanded: prev.expanded.filter((id) => id !== topic.id),
          }));
          setConfirm(null);
          toast('success', 'Deleted', `"${topic.name}" was removed.`);
        },
      });
    },
    [mutate, setSettings, toast],
  );

  const requestDeleteSubtopic = useCallback(
    (topic, sub) => {
      setConfirm({
        title: `Delete "${sub.name}"?`,
        message: `This removes ${sub.questions.length} question${sub.questions.length === 1 ? '' : 's'} from "${topic.name}". This cannot be undone.`,
        confirmLabel: 'Delete subtopic',
        onConfirm: () => {
          mutate((prev) => ({
            ...prev,
            topics: prev.topics.map((t) =>
              t.id !== topic.id ? t : { ...t, subtopics: t.subtopics.filter((s) => s.id !== sub.id) },
            ),
          }));
          addTombstone('subtopics', `${topic.id}/${sub.id}`);
          setSettings((prev) =>
            prev.subtopicId === sub.id ? { ...prev, subtopicId: null } : prev,
          );
          setConfirm(null);
          toast('success', 'Deleted', `"${sub.name}" was removed.`);
        },
      });
    },
    [mutate, setSettings, toast],
  );

  /* ----------------------------------------------------------- *
   * Random question
   * ----------------------------------------------------------- */
  const focusQuestion = useCallback((id) => {
    setOpenIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setPulseId(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node = document.getElementById(`question-${id}`);
        node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setPulseId(id);
      });
    });
  }, []);

  const pickRandom = useCallback(() => {
    const pool = [];
    if (settings.randomFromAll) {
      topics.forEach((topic) =>
        topic.subtopics.forEach((sub) =>
          sub.questions.forEach((question) => pool.push({ topic, sub, question })),
        ),
      );
    } else if (activeTopic && activeSubtopic) {
      activeSubtopic.questions.forEach((question) =>
        pool.push({ topic: activeTopic, sub: activeSubtopic, question }),
      );
    }

    if (pool.length === 0) {
      toast('info', 'Nothing to pick', 'There are no questions in this scope yet.');
      return;
    }

    const unknown = pool.filter((row) => !row.question.known);
    const candidates = unknown.length > 0 ? unknown : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    setQuery('');
    setSettings((prev) => ({
      ...prev,
      topicId: chosen.topic.id,
      subtopicId: chosen.sub.id,
      filter: prev.filter === 'known' && !chosen.question.known ? 'all' : prev.filter,
      expanded: prev.expanded.includes(chosen.topic.id)
        ? prev.expanded
        : [...prev.expanded, chosen.topic.id],
    }));
    focusQuestion(chosen.question.id);
  }, [settings.randomFromAll, topics, activeTopic, activeSubtopic, setSettings, focusQuestion, toast]);

  /* ----------------------------------------------------------- *
   * Export / import / reset
   * ----------------------------------------------------------- */
  const handleExport = useCallback(() => {
    if (!dataset) return;
    try {
      const name = exportDataset(dataset);
      toast('success', 'Exported', name);
    } catch {
      toast('error', 'Export failed', 'The browser blocked the download.');
    }
  }, [dataset, toast]);

  const handleImportFile = useCallback(
    (file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = parseImport(String(reader.result ?? ''));
        if (!result.ok) {
          toast('error', 'Import failed', result.error);
          return;
        }
        const count = result.dataset.topics.reduce(
          (n, t) => n + t.subtopics.reduce((m, s) => m + s.questions.length, 0),
          0,
        );
        setImportChoice({ dataset: result.dataset, name: file.name, count });
      };
      reader.onerror = () => toast('error', 'Import failed', 'That file could not be read.');
      reader.readAsText(file);
    },
    [toast],
  );

  const applyImport = useCallback(
    (mode) => {
      if (!importChoice || !dataset) return;
      if (mode === 'replace') {
        mutate(() => importChoice.dataset);
        toast('success', 'Imported', `Replaced everything with ${importChoice.count} questions.`);
      } else {
        const { dataset: merged, addedQuestions, updatedQuestions } = mergeImport(dataset, importChoice.dataset);
        mutate(() => merged);
        toast('success', 'Imported', `${addedQuestions} added, ${updatedQuestions} updated.`);
      }
      setImportChoice(null);
      setOpenIds(new Set());
    },
    [importChoice, dataset, mutate, toast],
  );

  const handleReset = useCallback(() => {
    setConfirm({
      title: 'Reset to the bundled questions?',
      message:
        'Your edits, added questions and known progress will be deleted and the bundled seed content reloaded. Export a backup first if you want to keep them.',
      confirmLabel: 'Reset everything',
      onConfirm: () => {
        const fresh = resetToSeed();
        setDataset(fresh);
        setOpenIds(new Set());
        setQuery('');
        setSettings({ ...DEFAULT_SETTINGS, expanded: fresh.topics.slice(0, 1).map((t) => t.id) });
        setConfirm(null);
        toast('success', 'Reset', 'Bundled questions reloaded.');
      },
    });
  }, [setSettings, toast]);

  /* ----------------------------------------------------------- *
   * Global shortcuts - never while typing
   * ----------------------------------------------------------- */
  useEffect(() => {
    const onKeyDown = (event) => {
      const el = event.target;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

      if (typing) {
        if (event.key === 'Escape' && el === searchRef.current) setQuery('');
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // A dialog is open: let it own the keyboard.
      if (questionModal || nameModal || confirm || importChoice) return;

      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        pickRandom();
      } else if (event.key === 't' || event.key === 'T') {
        event.preventDefault();
        toggleTheme();
      } else if (event.key === 'Escape' && query) {
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pickRandom, toggleTheme, query, questionModal, nameModal, confirm, importChoice]);

  /* ----------------------------------------------------------- *
   * Render
   * ----------------------------------------------------------- */
  const sidebarProps = {
    topics,
    selection,
    expanded: settings.expanded,
    onToggleTopic: (topicId) =>
      setSettings((prev) => ({
        ...prev,
        expanded: prev.expanded.includes(topicId)
          ? prev.expanded.filter((id) => id !== topicId)
          : [...prev.expanded, topicId],
      })),
    onSelectSubtopic: selectSubtopic,
    onAddTopic: () =>
      setNameModal({
        title: 'Add topic',
        label: 'Topic name',
        placeholder: 'System Design',
        onSubmit: addTopic,
      }),
    onAddSubtopic: (topic) =>
      setNameModal({
        title: 'Add subtopic',
        subtitle: topic.name,
        label: 'Subtopic name',
        placeholder: 'Caching strategies',
        onSubmit: (name) => addSubtopic(topic, name),
      }),
    onDeleteTopic: requestDeleteTopic,
    onDeleteSubtopic: requestDeleteSubtopic,
  };

  return (
    <div className="flex min-h-full">
      <BackgroundBlobs />

      {isDesktop ? (
        <aside className="sticky top-0 h-dvh w-64 shrink-0 xl:w-72">
          <Sidebar {...sidebarProps} animateIn />
        </aside>
      ) : (
        <AnimatePresence>
          {navOpen ? (
            <>
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setNavOpen(false)}
                className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px]"
              />
              <motion.div
                key="drawer"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                className="fixed inset-y-0 left-0 z-50 w-[17.5rem] max-w-[85vw]"
                style={{ background: 'var(--bg)' }}
              >
                <Sidebar {...sidebarProps} onClose={() => setNavOpen(false)} />
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          query={query}
          onQueryChange={setQuery}
          searchInputRef={searchRef}
          filter={settings.filter}
          onFilterChange={(filter) => setSettings((prev) => ({ ...prev, filter }))}
          anyOpen={anyOpen}
          onToggleAll={toggleAll}
          randomFromAll={settings.randomFromAll}
          onRandomFromAllChange={(randomFromAll) => setSettings((prev) => ({ ...prev, randomFromAll }))}
          onRandom={pickRandom}
          onExport={handleExport}
          onImportFile={handleImportFile}
          onReset={handleReset}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenNav={() => setNavOpen(true)}
        />

        <main ref={mainRef} className="mx-auto w-full max-w-4xl flex-1 px-3 py-5 sm:px-5 sm:py-6">
          {booting || !dataset ? (
            <div className="space-y-4">
              <div className="surface rounded-2xl p-5">
                <div className="skeleton h-3 w-32" />
                <div className="skeleton mt-3 h-8 w-64" />
                <div className="skeleton mt-4 h-2 w-full rounded-full" />
              </div>
              {[0, 1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {isSearching ? (
                <motion.section
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="surface mb-4 rounded-2xl px-4 py-3.5 sm:px-5"
                >
                  <h1 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {visible.length} result{visible.length === 1 ? '' : 's'} for{' '}
                    <span style={{ color: 'var(--accent)' }}>&ldquo;{trimmedQuery}&rdquo;</span>
                  </h1>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Searching questions and answers across all topics. Clear the search to go back to{' '}
                    {activeSubtopic ? activeSubtopic.name : 'your subtopic'}.
                  </p>
                </motion.section>
              ) : activeTopic && activeSubtopic ? (
                <div className="mb-4">
                  <SubtopicHeader
                    topic={activeTopic}
                    subtopic={activeSubtopic}
                    onAddQuestion={() =>
                      setQuestionModal({
                        topicId: activeTopic.id,
                        subtopicId: activeSubtopic.id,
                        question: null,
                        breadcrumb: `${activeTopic.name} › ${activeSubtopic.name}`,
                      })
                    }
                  />
                </div>
              ) : null}

              {visible.length === 0 ? (
                isSearching ? (
                  <EmptyState
                    icon={SearchX}
                    title="No matches"
                    message={`Nothing matches "${trimmedQuery}" with the current filter. Try a shorter phrase or switch the filter to All.`}
                  />
                ) : !activeTopic ? (
                  <EmptyState
                    icon={Layers}
                    title="No topics yet"
                    message="Add a topic in the sidebar to start building your question bank."
                  />
                ) : !activeSubtopic ? (
                  <EmptyState
                    icon={Inbox}
                    title={`"${activeTopic.name}" has no subtopics`}
                    message="Add a subtopic in the sidebar, then start adding questions to it."
                  />
                ) : settings.filter !== 'all' ? (
                  <EmptyState
                    icon={Inbox}
                    title="Nothing in this filter"
                    message={
                      settings.filter === 'known'
                        ? 'You have not marked anything here as known yet.'
                        : 'Everything in this subtopic is marked known. Nice work.'
                    }
                    action={
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setSettings((prev) => ({ ...prev, filter: 'all' }))}
                      >
                        Show all questions
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={FileQuestion}
                    title="No questions yet"
                    message={`"${activeSubtopic.name}" is empty. Add your first question to get started.`}
                    action={
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                          setQuestionModal({
                            topicId: activeTopic.id,
                            subtopicId: activeSubtopic.id,
                            question: null,
                            breadcrumb: `${activeTopic.name} › ${activeSubtopic.name}`,
                          })
                        }
                      >
                        Add question
                      </button>
                    }
                  />
                )
              ) : (
                <motion.div layout className="space-y-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {visible.map((row, index) => (
                      <QuestionCard
                        key={row.question.id}
                        question={row.question}
                        number={index + 1}
                        isOpen={openIds.has(row.question.id)}
                        onToggle={() => toggleOpen(row.question.id)}
                        onEdit={() =>
                          setQuestionModal({
                            topicId: row.topicId,
                            subtopicId: row.subtopicId,
                            question: row.question,
                            breadcrumb: row.breadcrumb
                              ? `${row.breadcrumb.topic} › ${row.breadcrumb.subtopic}`
                              : `${activeTopic?.name ?? ''} › ${activeSubtopic?.name ?? ''}`,
                          })
                        }
                        onDelete={() => requestDeleteQuestion(row.topicId, row.subtopicId, row.question)}
                        onToggleKnown={() => toggleKnown(row.topicId, row.subtopicId, row.question.id)}
                        breadcrumb={row.breadcrumb}
                        query={isSearching ? trimmedQuery : ''}
                        pulse={pulseId === row.question.id}
                        enterDelay={Math.min(index, MAX_STAGGERED) * STAGGER}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              <p className="mt-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Shortcuts: <kbd>/</kbd> search &middot; <kbd>R</kbd> random &middot; <kbd>T</kbd> theme &middot;{' '}
                <kbd>Enter</kbd>/<kbd>Space</kbd> reveal a focused card
              </p>
            </>
          )}
        </main>
      </div>

      {/* ---------------- dialogs ---------------- */}
      <QuestionModal
        open={Boolean(questionModal)}
        question={questionModal?.question ?? null}
        breadcrumb={questionModal?.breadcrumb}
        onSave={saveQuestion}
        onClose={() => setQuestionModal(null)}
      />

      <NameModal
        open={Boolean(nameModal)}
        title={nameModal?.title ?? ''}
        subtitle={nameModal?.subtitle}
        label={nameModal?.label ?? 'Name'}
        placeholder={nameModal?.placeholder}
        onSubmit={(name) => nameModal?.onSubmit(name)}
        onClose={() => setNameModal(null)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={() => confirm?.onConfirm()}
        onClose={() => setConfirm(null)}
      />

      <Modal
        open={Boolean(importChoice)}
        onClose={() => setImportChoice(null)}
        title="Import backup"
        subtitle={importChoice?.name}
        size="sm"
        labelId="import-modal-title"
        footer={
          <>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              className="btn"
              onClick={() => setImportChoice(null)}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              className="btn"
              onClick={() => applyImport('replace')}
            >
              Replace
            </motion.button>
            <motion.button
              type="button"
              data-autofocus
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary"
              onClick={() => applyImport('merge')}
            >
              Merge
            </motion.button>
          </>
        }
      >
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          That file is valid and holds <strong style={{ color: 'var(--text)' }}>{importChoice?.count}</strong>{' '}
          questions.
        </p>
        <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <li>
            <strong style={{ color: 'var(--text)' }}>Replace</strong> — throw away everything you have now and
            use the file as-is.
          </li>
          <li>
            <strong style={{ color: 'var(--text)' }}>Merge</strong> — keep what you have, add questions whose
            ids are new and update ones that already exist.
          </li>
        </ul>
      </Modal>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
