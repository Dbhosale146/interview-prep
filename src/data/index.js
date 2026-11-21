import python from './python.json';
import ml from './ml.json';
import dl from './dl.json';
import genai from './genai.json';
import agentic from './agentic.json';

/**
 * Bump this whenever new seed questions are added. On the next load the app
 * merges in anything whose id is not already stored (and was not deleted),
 * leaving the user's own edits untouched. See utils/storage.js -> mergeSeed.
 */
export const SEED_VERSION = 1;

/** Seed topics in sidebar order. */
const SEED_TOPICS = [python, ml, dl, genai, agentic];

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

/** A fresh, mutable copy of the bundled dataset. */
export function getSeedDataset() {
  return { version: SEED_VERSION, topics: clone(SEED_TOPICS) };
}

export { SEED_TOPICS };
