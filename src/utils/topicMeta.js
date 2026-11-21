import { Bot, Brain, Code2, Folder, LineChart, Sparkles } from 'lucide-react';

/**
 * Icons a topic file may name. Kept as an explicit map so the bundler only
 * pulls in these icons instead of all of lucide-react.
 */
export const TOPIC_ICONS = { Code2, LineChart, Brain, Sparkles, Bot, Folder };

/** Accent classes defined in index.css (they set --topic / --topic-soft). */
export const TOPIC_COLORS = ['amber', 'emerald', 'violet', 'rose', 'sky', 'indigo'];

export function topicIcon(name) {
  return TOPIC_ICONS[name] || Folder;
}

export function accentClass(color) {
  return TOPIC_COLORS.includes(color) ? `accent-${color}` : 'accent-indigo';
}

/** Colour for a brand-new topic: the first accent not already in use. */
export function nextTopicColor(usedColors = []) {
  return TOPIC_COLORS.find((c) => !usedColors.includes(c)) || 'indigo';
}

export const DIFFICULTY_STYLES = {
  easy: { label: 'Easy', bg: 'var(--easy-bg)', fg: 'var(--easy-fg)' },
  medium: { label: 'Medium', bg: 'var(--medium-bg)', fg: 'var(--medium-fg)' },
  hard: { label: 'Hard', bg: 'var(--hard-bg)', fg: 'var(--hard-fg)' },
};
