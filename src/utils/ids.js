/** Characters that are safe inside a generated slug id. */
const SLUG_RE = /[^a-z0-9]+/g;

/** Turns a display name into a url-safe slug fragment. */
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(SLUG_RE, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** Random suffix with enough entropy to avoid collisions in one session. */
function rand() {
  return Math.random().toString(36).slice(2, 8);
}

/** Id for a question the user creates by hand. */
export function newQuestionId() {
  return `user-${Date.now().toString(36)}-${rand()}`;
}

/**
 * Id for a user-created topic or subtopic. Falls back to a random id when the
 * name has no usable characters, and appends a suffix when the slug is taken.
 */
export function newContainerId(name, taken = []) {
  const base = slugify(name) || `item-${rand()}`;
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
