/**
 * Seed loader.
 *
 * The topic files total about a megabyte, so they are pulled in with dynamic
 * imports: each becomes its own chunk and none of it is downloaded on a normal
 * start, where localStorage already holds the content. The seed is only needed
 * on a first run, after corrupt storage, on a version upgrade, or on reset.
 */

/**
 * Bump this whenever seed questions are added. On the next load the app merges
 * in anything whose id is not already stored (and was not deleted), leaving the
 * user's own edits untouched. See utils/storage.js -> mergeSeed.
 */
export const SEED_VERSION = 1;

/** Topic files in sidebar order. */
const TOPIC_LOADERS = [
  () => import('./python.json'),
  () => import('./ml.json'),
  () => import('./dl.json'),
  () => import('./genai.json'),
  () => import('./agentic.json'),
];

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

/** A fresh, mutable copy of the bundled dataset. */
export async function getSeedDataset() {
  const modules = await Promise.all(TOPIC_LOADERS.map((load) => load()));
  return { version: SEED_VERSION, topics: modules.map((mod) => clone(mod.default)) };
}
