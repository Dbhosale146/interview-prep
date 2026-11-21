import { getSeedDataset, SEED_VERSION } from '../data/index.js';

export const CONTENT_KEY = 'interviewprep.content.v1';
export const TOMBSTONE_KEY = 'interviewprep.tombstones.v1';
export const SETTINGS_KEY = 'interviewprep.settings.v1';

export const DIFFICULTIES = ['easy', 'medium', 'hard'];
const EMPTY_TOMBSTONES = { topics: [], subtopics: [], questions: [] };

/* ------------------------------------------------------------------ *
 * Raw localStorage access. Every call is guarded: a private window, a
 * blocked origin or a full quota must never take the app down.
 * ------------------------------------------------------------------ */

export function readJSON(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Checks a dataset against the on-disk schema. Returns a list of human
 * readable problems; an empty list means the data is usable.
 */
export function validateDataset(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['File is not a JSON object.'];
  }
  if (!Array.isArray(data.topics)) {
    return ['Missing a "topics" array.'];
  }
  if (data.version !== undefined && typeof data.version !== 'number') {
    errors.push('"version" must be a number.');
  }

  const topicIds = new Set();
  const questionIds = new Set();

  data.topics.forEach((topic, ti) => {
    const where = `topics[${ti}]`;
    if (!topic || typeof topic !== 'object') {
      errors.push(`${where} is not an object.`);
      return;
    }
    if (!isStr(topic.id)) errors.push(`${where} is missing a non-empty "id".`);
    if (!isStr(topic.name)) errors.push(`${where} is missing a non-empty "name".`);
    if (topicIds.has(topic.id)) errors.push(`Duplicate topic id "${topic.id}".`);
    topicIds.add(topic.id);
    if (!Array.isArray(topic.subtopics)) {
      errors.push(`${where} ("${topic.id}") is missing a "subtopics" array.`);
      return;
    }

    const subIds = new Set();
    topic.subtopics.forEach((sub, si) => {
      const subWhere = `${topic.id}.subtopics[${si}]`;
      if (!sub || typeof sub !== 'object') {
        errors.push(`${subWhere} is not an object.`);
        return;
      }
      if (!isStr(sub.id)) errors.push(`${subWhere} is missing a non-empty "id".`);
      if (!isStr(sub.name)) errors.push(`${subWhere} is missing a non-empty "name".`);
      if (subIds.has(sub.id)) errors.push(`Duplicate subtopic id "${sub.id}" in "${topic.id}".`);
      subIds.add(sub.id);
      if (!Array.isArray(sub.questions)) {
        errors.push(`${subWhere} ("${sub.id}") is missing a "questions" array.`);
        return;
      }

      sub.questions.forEach((q, qi) => {
        const qWhere = `${topic.id}/${sub.id}[${qi}]`;
        if (!q || typeof q !== 'object') {
          errors.push(`${qWhere} is not an object.`);
          return;
        }
        if (!isStr(q.id)) errors.push(`${qWhere} is missing a non-empty "id".`);
        if (!isStr(q.q)) errors.push(`${qWhere} ("${q.id}") has an empty question.`);
        if (!isStr(q.a)) errors.push(`${qWhere} ("${q.id}") has an empty answer.`);
        if (!DIFFICULTIES.includes(q.difficulty)) {
          errors.push(`${qWhere} ("${q.id}") has difficulty "${q.difficulty}"; expected easy, medium or hard.`);
        }
        if (q.known !== undefined && typeof q.known !== 'boolean') {
          errors.push(`${qWhere} ("${q.id}") has a non-boolean "known".`);
        }
        if (questionIds.has(q.id)) errors.push(`Duplicate question id "${q.id}".`);
        questionIds.add(q.id);
      });
    });
  });

  return errors;
}

/** Fills in optional fields so the rest of the app can assume they exist. */
export function normalizeDataset(data) {
  return {
    version: typeof data.version === 'number' ? data.version : 0,
    topics: (data.topics || []).map((topic) => ({
      id: topic.id,
      name: topic.name,
      icon: isStr(topic.icon) ? topic.icon : 'Folder',
      color: isStr(topic.color) ? topic.color : 'indigo',
      subtopics: (topic.subtopics || []).map((sub) => ({
        id: sub.id,
        name: sub.name,
        questions: (sub.questions || []).map((q) => ({
          id: q.id,
          q: q.q,
          a: q.a,
          difficulty: DIFFICULTIES.includes(q.difficulty) ? q.difficulty : 'medium',
          known: q.known === true,
        })),
      })),
    })),
  };
}

/* ------------------------------------------------------------------ *
 * Tombstones - ids the user deleted, so a seed merge cannot resurrect
 * them on the next version bump.
 * ------------------------------------------------------------------ */

export function readTombstones() {
  const stored = readJSON(TOMBSTONE_KEY, null);
  if (!stored || typeof stored !== 'object') return { ...EMPTY_TOMBSTONES };
  return {
    topics: Array.isArray(stored.topics) ? stored.topics : [],
    subtopics: Array.isArray(stored.subtopics) ? stored.subtopics : [],
    questions: Array.isArray(stored.questions) ? stored.questions : [],
  };
}

export function addTombstone(kind, id) {
  const current = readTombstones();
  if (!current[kind].includes(id)) {
    current[kind] = [...current[kind], id];
    writeJSON(TOMBSTONE_KEY, current);
  }
  return current;
}

export function clearTombstones() {
  writeJSON(TOMBSTONE_KEY, { ...EMPTY_TOMBSTONES });
}

/* ------------------------------------------------------------------ *
 * Seed merge
 * ------------------------------------------------------------------ */

/**
 * Additive merge of a newer bundled seed into the stored dataset.
 *
 * Adds topics, subtopics and questions whose ids are not stored yet and were
 * not deleted by the user. Never overwrites stored text, difficulty or
 * progress, and never removes anything.
 */
export function mergeSeed(stored, seed, tombstones = EMPTY_TOMBSTONES) {
  const deadTopics = new Set(tombstones.topics);
  const deadSubs = new Set(tombstones.subtopics);
  const deadQuestions = new Set(tombstones.questions);

  const topics = stored.topics.map((t) => ({ ...t, subtopics: t.subtopics.map((s) => ({ ...s, questions: [...s.questions] })) }));
  const byTopicId = new Map(topics.map((t) => [t.id, t]));
  let added = 0;

  const liveQuestions = (questions) => questions.filter((q) => !deadQuestions.has(q.id));

  for (const seedTopic of seed.topics) {
    if (deadTopics.has(seedTopic.id)) continue;

    const existingTopic = byTopicId.get(seedTopic.id);
    if (!existingTopic) {
      const subtopics = seedTopic.subtopics
        .filter((s) => !deadSubs.has(`${seedTopic.id}/${s.id}`))
        .map((s) => ({ ...s, questions: liveQuestions(s.questions) }));
      subtopics.forEach((s) => {
        added += s.questions.length;
      });
      const fresh = { ...seedTopic, subtopics };
      topics.push(fresh);
      byTopicId.set(fresh.id, fresh);
      continue;
    }

    const bySubId = new Map(existingTopic.subtopics.map((s) => [s.id, s]));
    for (const seedSub of seedTopic.subtopics) {
      if (deadSubs.has(`${seedTopic.id}/${seedSub.id}`)) continue;

      const existingSub = bySubId.get(seedSub.id);
      if (!existingSub) {
        const questions = liveQuestions(seedSub.questions);
        added += questions.length;
        const fresh = { ...seedSub, questions };
        existingTopic.subtopics.push(fresh);
        bySubId.set(fresh.id, fresh);
        continue;
      }

      const seen = new Set(existingSub.questions.map((q) => q.id));
      for (const seedQ of seedSub.questions) {
        if (seen.has(seedQ.id) || deadQuestions.has(seedQ.id)) continue;
        existingSub.questions.push({ ...seedQ });
        seen.add(seedQ.id);
        added += 1;
      }
    }
  }

  return { dataset: { version: seed.version, topics }, added };
}

/* ------------------------------------------------------------------ *
 * Load / save
 * ------------------------------------------------------------------ */

/**
 * Resolves the dataset the app should start from.
 *
 * Returns `{ dataset, status, added }` where status is one of
 * `seeded` (first run), `recovered` (stored data was corrupt),
 * `upgraded` (new seed version merged in) or `stored`.
 *
 * Async because the seed files are a lazily loaded chunk; on a normal start
 * with valid stored content they are never fetched at all.
 */
export async function loadDataset() {
  // "Nothing stored yet" and "stored but unreadable" need different handling:
  // the first is a normal first run, the second is worth telling the user about.
  let stored = null;
  let raw;
  let present = false;
  try {
    const text = window.localStorage.getItem(CONTENT_KEY);
    if (text !== null) {
      present = true;
      raw = JSON.parse(text);
    }
  } catch {
    raw = undefined;
  }

  const reseed = async (status, errors) => {
    const dataset = normalizeDataset(await getSeedDataset());
    writeJSON(CONTENT_KEY, dataset);
    return { dataset, status, added: 0, errors };
  };

  if (!present) return reseed('seeded');

  const errors = raw === undefined ? ['Stored JSON could not be parsed.'] : validateDataset(raw);
  if (errors.length > 0) return reseed('recovered', errors);

  stored = normalizeDataset(raw);

  if (stored.version < SEED_VERSION) {
    const seed = normalizeDataset(await getSeedDataset());
    const { dataset, added } = mergeSeed(stored, seed, readTombstones());
    writeJSON(CONTENT_KEY, dataset);
    return { dataset, status: 'upgraded', added };
  }

  return { dataset: stored, status: 'stored', added: 0 };
}

export function saveDataset(dataset) {
  return writeJSON(CONTENT_KEY, dataset);
}

/** Throws away stored content and progress, returning the bundled seed. */
export async function resetToSeed() {
  const dataset = normalizeDataset(await getSeedDataset());
  clearTombstones();
  writeJSON(CONTENT_KEY, dataset);
  return dataset;
}

/* ------------------------------------------------------------------ *
 * Export / import
 * ------------------------------------------------------------------ */

export function backupFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `interviewprep-backup-${stamp}.json`;
}

/** Triggers a download of the current dataset as pretty-printed JSON. */
export function exportDataset(dataset) {
  const name = backupFilename();
  const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

/** Parses and validates an uploaded backup. */
export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { ok: false, error: `That file is not valid JSON (${err.message}).` };
  }
  const errors = validateDataset(data);
  if (errors.length > 0) {
    const shown = errors.slice(0, 4).join(' ');
    const more = errors.length > 4 ? ` (+${errors.length - 4} more problems)` : '';
    return { ok: false, error: `${shown}${more}` };
  }
  return { ok: true, dataset: normalizeDataset(data) };
}

/**
 * Merge an imported dataset into the current one: existing ids are updated,
 * unknown ids are appended, nothing is removed.
 */
export function mergeImport(current, incoming) {
  const topics = current.topics.map((t) => ({
    ...t,
    subtopics: t.subtopics.map((s) => ({ ...s, questions: [...s.questions] })),
  }));
  const byTopicId = new Map(topics.map((t) => [t.id, t]));
  let addedQuestions = 0;
  let updatedQuestions = 0;

  for (const inTopic of incoming.topics) {
    let topic = byTopicId.get(inTopic.id);
    if (!topic) {
      topic = { ...inTopic, subtopics: [] };
      topics.push(topic);
      byTopicId.set(topic.id, topic);
    } else {
      topic.name = inTopic.name;
      topic.icon = inTopic.icon;
      topic.color = inTopic.color;
    }

    const bySubId = new Map(topic.subtopics.map((s) => [s.id, s]));
    for (const inSub of inTopic.subtopics) {
      let sub = bySubId.get(inSub.id);
      if (!sub) {
        sub = { ...inSub, questions: [] };
        topic.subtopics.push(sub);
        bySubId.set(sub.id, sub);
      } else {
        sub.name = inSub.name;
      }

      const index = new Map(sub.questions.map((q, i) => [q.id, i]));
      for (const inQ of inSub.questions) {
        if (index.has(inQ.id)) {
          sub.questions[index.get(inQ.id)] = { ...inQ };
          updatedQuestions += 1;
        } else {
          sub.questions.push({ ...inQ });
          index.set(inQ.id, sub.questions.length - 1);
          addedQuestions += 1;
        }
      }
    }
  }

  return {
    dataset: { version: Math.max(current.version, incoming.version || 0), topics },
    addedQuestions,
    updatedQuestions,
  };
}

/* ------------------------------------------------------------------ *
 * UI settings
 * ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS = {
  topicId: null,
  subtopicId: null,
  filter: 'all',
  expanded: [],
  randomFromAll: false,
};
