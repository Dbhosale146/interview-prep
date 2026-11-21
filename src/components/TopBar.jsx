import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Download,
  Eye,
  EyeOff,
  Globe,
  Menu,
  Moon,
  RotateCcw,
  Search,
  Shuffle,
  Sun,
  Upload,
  X,
} from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'revision', label: 'Need revision' },
  { id: 'known', label: 'Known' },
];

/**
 * Sticky glass header: cross-topic search, progress filter, reveal toggle,
 * random question, backup actions and the theme switch.
 */
export default function TopBar({
  query,
  onQueryChange,
  searchInputRef,
  filter,
  onFilterChange,
  anyOpen,
  onToggleAll,
  randomFromAll,
  onRandomFromAllChange,
  onRandom,
  onExport,
  onImportFile,
  onReset,
  theme,
  onToggleTheme,
  onOpenNav,
}) {
  const reduced = useReducedMotion();
  const fileRef = useRef(null);
  const [spin, setSpin] = useState(0);

  const handleRandom = () => {
    setSpin((n) => n + 1);
    onRandom();
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (file) onImportFile(file);
    // Reset so picking the same file twice still fires a change event.
    event.target.value = '';
  };

  return (
    <header
      className="glass sticky top-0 z-30 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="btn btn-icon shrink-0 lg:hidden"
        >
          <Menu size={17} aria-hidden="true" />
        </button>

        {/* Search */}
        <div className="relative min-w-0 flex-1 basis-56">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search questions and answers..."
            aria-label="Search questions and answers across all topics"
            className="field pl-9"
            style={{ paddingRight: query ? '2.25rem' : undefined }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-lg p-1 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Filter */}
        <div
          role="group"
          aria-label="Filter questions"
          className="flex shrink-0 items-center gap-0.5 rounded-xl p-0.5"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange(item.id)}
                aria-pressed={active}
                className="relative cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
                style={{ color: active ? 'var(--text)' : 'var(--text-muted)' }}
              >
                {active ? (
                  <motion.span
                    layoutId="topbar-filter-pill"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    className="absolute inset-0 rounded-lg"
                    style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}
                  />
                ) : null}
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onToggleAll}
            title={anyOpen ? 'Hide all answers' : 'Show all answers'}
            className="btn"
          >
            {anyOpen ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
            <span className="hidden sm:inline">{anyOpen ? 'Hide all' : 'Show all'}</span>
          </motion.button>

          {/* Random question + scope toggle */}
          <div
            className="flex items-center overflow-hidden rounded-xl"
            style={{ border: '1px solid var(--border)' }}
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleRandom}
              title="Jump to a random question"
              className="inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-2 text-[0.8125rem] font-medium transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface)' }}
            >
              <motion.span
                animate={reduced ? undefined : { rotate: spin * 360 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="grid place-items-center"
              >
                <Shuffle size={15} aria-hidden="true" />
              </motion.span>
              <span className="hidden md:inline">Random</span>
            </motion.button>
            <button
              type="button"
              onClick={() => onRandomFromAllChange(!randomFromAll)}
              aria-pressed={randomFromAll}
              title={randomFromAll ? 'Random from all topics' : 'Random from this subtopic'}
              className="cursor-pointer border-l px-2 py-2 transition-colors hover:bg-[var(--surface-hover)]"
              style={{
                borderColor: 'var(--border)',
                background: randomFromAll ? 'var(--accent-soft)' : 'var(--surface)',
                color: randomFromAll ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <Globe size={14} aria-hidden="true" />
              <span className="sr-only">Use all topics for the random question</span>
            </button>
          </div>

          <span className="mx-0.5 hidden h-6 w-px sm:block" style={{ background: 'var(--border)' }} />

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onExport}
            title="Export all data as JSON"
            aria-label="Export all data as JSON"
            className="btn btn-icon"
          >
            <Download size={15} aria-hidden="true" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => fileRef.current?.click()}
            title="Import a JSON backup"
            aria-label="Import a JSON backup"
            className="btn btn-icon"
          >
            <Upload size={15} aria-hidden="true" />
          </motion.button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className="hidden"
            tabIndex={-1}
          />

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            title="Reset to the bundled questions"
            aria-label="Reset to the bundled questions"
            className="btn btn-icon"
          >
            <RotateCcw size={15} aria-hidden="true" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="btn btn-icon"
          >
            <motion.span
              key={theme}
              initial={reduced ? false : { rotate: -90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="grid place-items-center"
            >
              {theme === 'dark' ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            </motion.span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
