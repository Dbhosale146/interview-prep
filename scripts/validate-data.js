#!/usr/bin/env node
/**
 * Seed data linter.
 *
 * Run with `npm run validate-data`. Errors fail the run (exit code 1);
 * warnings are advisory and still exit 0.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'src', 'data');
const FILES = ['python.json', 'ml.json', 'dl.json', 'genai.json', 'agentic.json'];

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MIN_PER_SUBTOPIC = 10;
const MAX_PROSE_WORDS = 40;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}$/;

const errors = [];
const warnings = [];

const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

/** Prose word count with fenced blocks, inline code and formulas removed. */
function proseWords(answer) {
  return answer
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const allQuestionIds = new Map(); // id -> location
const allQuestionText = new Map(); // normalized q -> location
const allTopicIds = new Map();
const difficultyTally = { easy: 0, medium: 0, hard: 0 };
let totalQuestions = 0;
let totalSubtopics = 0;

for (const file of FILES) {
  const path = join(DATA_DIR, file);
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    err(`${file}: cannot be read (${e.code || e.message}).`);
    continue;
  }

  let topic;
  try {
    topic = JSON.parse(raw);
  } catch (e) {
    err(`${file}: invalid JSON - ${e.message}`);
    continue;
  }

  if (!topic || typeof topic !== 'object' || Array.isArray(topic)) {
    err(`${file}: the top level must be a topic object.`);
    continue;
  }

  for (const key of ['id', 'name', 'icon', 'color']) {
    if (typeof topic[key] !== 'string' || topic[key].trim() === '') {
      err(`${file}: "${key}" must be a non-empty string.`);
    }
  }
  if (!Array.isArray(topic.subtopics)) {
    err(`${file}: "subtopics" must be an array.`);
    continue;
  }
  if (topic.subtopics.length === 0) {
    err(`${file}: has no subtopics.`);
  }

  if (allTopicIds.has(topic.id)) {
    err(`Duplicate topic id "${topic.id}" in ${file} and ${allTopicIds.get(topic.id)}.`);
  }
  allTopicIds.set(topic.id, file);

  const subtopicIds = new Set();

  topic.subtopics.forEach((sub, si) => {
    const at = `${file} > subtopics[${si}]`;
    if (!sub || typeof sub !== 'object') {
      err(`${at}: not an object.`);
      return;
    }
    for (const key of ['id', 'name']) {
      if (typeof sub[key] !== 'string' || sub[key].trim() === '') {
        err(`${at}: "${key}" must be a non-empty string.`);
      }
    }
    if (subtopicIds.has(sub.id)) {
      err(`${at}: duplicate subtopic id "${sub.id}" inside "${topic.id}".`);
    }
    subtopicIds.add(sub.id);

    if (!Array.isArray(sub.questions)) {
      err(`${at} ("${sub.id}"): "questions" must be an array.`);
      return;
    }
    totalSubtopics += 1;

    if (sub.questions.length < MIN_PER_SUBTOPIC) {
      err(
        `${topic.id}/${sub.id}: only ${sub.questions.length} question${sub.questions.length === 1 ? '' : 's'}; at least ${MIN_PER_SUBTOPIC} required.`,
      );
    }

    sub.questions.forEach((q, qi) => {
      const where = `${topic.id}/${sub.id}[${qi}]`;
      if (!q || typeof q !== 'object') {
        err(`${where}: not an object.`);
        return;
      }
      totalQuestions += 1;

      if (typeof q.id !== 'string' || q.id.trim() === '') {
        err(`${where}: missing "id".`);
      } else {
        if (allQuestionIds.has(q.id)) {
          err(`Duplicate question id "${q.id}" (${where} and ${allQuestionIds.get(q.id)}).`);
        }
        allQuestionIds.set(q.id, where);

        const expectedPrefix = `${topic.id}-${sub.id}-`;
        if (!ID_PATTERN.test(q.id)) {
          err(`${where}: id "${q.id}" must look like <topic>-<subtopic>-001.`);
        } else if (!q.id.startsWith(expectedPrefix)) {
          err(`${where}: id "${q.id}" should start with "${expectedPrefix}".`);
        }
      }

      if (typeof q.q !== 'string' || q.q.trim() === '') {
        err(`${where} ("${q.id}"): empty question text.`);
      } else {
        const key = normalizeText(q.q);
        if (allQuestionText.has(key)) {
          err(`Duplicate question text at ${where} and ${allQuestionText.get(key)}: "${q.q}"`);
        }
        allQuestionText.set(key, where);
      }

      if (typeof q.a !== 'string' || q.a.trim() === '') {
        err(`${where} ("${q.id}"): empty answer text.`);
      } else {
        const words = proseWords(q.a);
        if (words > MAX_PROSE_WORDS) {
          warn(`${where} ("${q.id}"): ${words} words of prose (target <= ${MAX_PROSE_WORDS}).`);
        }
        const fences = (q.a.match(/```/g) || []).length;
        if (fences % 2 !== 0) {
          err(`${where} ("${q.id}"): unbalanced \`\`\` code fence.`);
        }
        if (/<\s*(script|iframe|img|svg|style)\b/i.test(q.a)) {
          warn(`${where} ("${q.id}"): contains raw HTML, which is not rendered.`);
        }
      }

      if (!DIFFICULTIES.includes(q.difficulty)) {
        err(`${where} ("${q.id}"): difficulty "${q.difficulty}" is not easy, medium or hard.`);
      } else {
        difficultyTally[q.difficulty] += 1;
      }

      if (q.known !== undefined && typeof q.known !== 'boolean') {
        err(`${where} ("${q.id}"): "known" must be a boolean.`);
      }
      if (q.known === true) {
        warn(`${where} ("${q.id}"): seeded with known=true; seeds should start unknown.`);
      }
    });
  });
}

/* --------------------------- report --------------------------- */

const pct = (n) => (totalQuestions ? `${Math.round((n / totalQuestions) * 100)}%` : '0%');

console.log('InterviewPrep seed data check');
console.log('-----------------------------');
console.log(`Topics      : ${allTopicIds.size}`);
console.log(`Subtopics   : ${totalSubtopics}`);
console.log(`Questions   : ${totalQuestions}`);
console.log(
  `Difficulty  : easy ${difficultyTally.easy} (${pct(difficultyTally.easy)}), ` +
    `medium ${difficultyTally.medium} (${pct(difficultyTally.medium)}), ` +
    `hard ${difficultyTally.hard} (${pct(difficultyTally.hard)})`,
);
console.log('');

if (warnings.length > 0) {
  console.log(`Warnings (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  ! ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.log(`Errors (${errors.length}):`);
  errors.forEach((e) => console.log(`  x ${e}`));
  console.log('');
  console.log('validate-data FAILED');
  process.exit(1);
}

console.log('validate-data passed with no errors.');
