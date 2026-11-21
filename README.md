# InterviewPrep

An offline interview Q&A practice app for AI/ML engineers. All content lives in plain JSON
files in the repo, answers stay hidden until you click the eye icon, and every question is
editable from the UI. No backend, no API keys, no tokens burned per practice session.

**1095 questions across 90 subtopics:** Python · Machine Learning · Deep Learning ·
Generative AI · Agentic AI.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script                  | What it does                                           |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Dev server with hot reload                             |
| `npm run build`         | Production build into `dist/`                          |
| `npm run preview`       | Serve the production build locally                     |
| `npm run validate-data` | Lint every seed JSON file (schema, ids, answer length) |

Once built, the app is fully static and works with no network: fonts are bundled locally and
all data is in `localStorage`.

### Deploying to GitHub Pages

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds and publishes the app on
every push to `main`. To turn it on once the repo is on GitHub:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push to `main` (or run the workflow manually from the **Actions** tab).

The site lands at `https://<your-user>.github.io/<repo>/`. The workflow runs
`npm ci`, `npm run validate-data` and `npm run build`, so a schema error or a duplicate
question id fails the deploy instead of shipping broken data.

No path configuration is needed: `vite.config.js` sets `base: './'`, so the build works at any
sub-path. The app has no client-side router, so no SPA 404 fallback is required either.

> GitHub Pages on a free account only serves **public** repositories. A private repo needs
> GitHub Pro or an organisation plan.

### Stack

React 18 + Vite · Tailwind CSS v4 (`@tailwindcss/vite`) · framer-motion · lucide-react ·
react-markdown + remark-gfm · react-syntax-highlighter (Prism Light, 5 languages registered) ·
canvas-confetti · `@fontsource/inter` and `@fontsource/jetbrains-mono`.

---

## Using the app

| Action                | How                                                                     |
| --------------------- | ----------------------------------------------------------------------- |
| Reveal an answer      | Click the eye icon, or focus a card and press <kbd>Enter</kbd>/<kbd>Space</kbd> |
| Reveal/hide every one | **Show all / Hide all** in the top bar                                  |
| Edit                  | Pencil icon — question, answer (markdown, with a live preview tab) and difficulty |
| Delete                | Trash icon, then confirm                                                |
| Track progress        | **Mark known** on a card; feeds the progress bar and the filter         |
| Search                | Top bar — matches question *and* answer text across all topics          |
| Filter                | All / Need revision / Known                                             |
| Random question       | Shuffle button; the globe toggle beside it switches between this subtopic and all topics. Prefers questions not yet marked known |
| Add                   | **+ Add question**, **+ Add subtopic** (inside a topic), **+ Add topic** (sidebar bottom) |

**Keyboard shortcuts** (inactive while typing in a field): <kbd>/</kbd> focus search ·
<kbd>R</kbd> random question · <kbd>T</kbd> toggle theme · <kbd>Esc</kbd> clear search.
Inside a dialog: <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Enter</kbd> saves, <kbd>Esc</kbd> closes.

The theme follows your OS preference until you pick one explicitly. Reduced-motion users get
simple fades with no confetti and no background blobs.

---

## Adding questions through the JSON files

One file per main topic:

```
src/data/python.json    src/data/ml.json       src/data/dl.json
src/data/genai.json     src/data/agentic.json
```

To add a question, append an object to the right subtopic's `questions` array:

```json
{
  "id": "python-functions-015",
  "q": "What does `functools.lru_cache` do?",
  "a": "It memoises a function's return values keyed by its arguments, evicting least-recently-used entries past `maxsize`.\n\n```python\n@lru_cache(maxsize=128)\ndef fib(n): ...\n```",
  "difficulty": "medium",
  "known": false
}
```

Then bump `SEED_VERSION` in [src/data/index.js](src/data/index.js) and run
`npm run validate-data`. On the next load the app merges the new question in (see
[Seed versioning](#seed-versioning)).

To add a whole subtopic, append to the topic's `subtopics` array. To add a whole topic, create
a new file and register it in the `TOPIC_LOADERS` list in `src/data/index.js`.

> You can also add questions from the UI — those are stored only in your browser, so put
> anything you want in version control into the JSON files.

### Schema

```json
{
  "id": "python",
  "name": "Python",
  "icon": "Code2",
  "color": "amber",
  "subtopics": [
    {
      "id": "functions",
      "name": "Functions",
      "questions": [
        {
          "id": "python-functions-001",
          "q": "What are *args and **kwargs?",
          "a": "`*args` collects extra positional arguments into a tuple. `**kwargs` collects extra keyword arguments into a dict.",
          "difficulty": "easy",
          "known": false
        }
      ]
    }
  ]
}
```

| Field        | Rules                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| `id` (topic) | Lowercase slug, unique across all files. Matches the filename.                    |
| `icon`       | One of `Code2`, `LineChart`, `Brain`, `Sparkles`, `Bot`, `Folder`. See [src/utils/topicMeta.js](src/utils/topicMeta.js). |
| `color`      | One of `amber`, `emerald`, `violet`, `rose`, `sky`, `indigo`.                      |
| `id` (sub)   | Lowercase slug, unique within its topic.                                          |
| `id` (q)     | `<topic>-<subtopic>-<3-digit>`, unique across **every** file. Questions you add in the UI get `user-<timestamp>-<random>` instead. |
| `q`, `a`     | Non-empty. `a` is markdown (GFM tables and fenced code blocks; raw HTML is deliberately not rendered). |
| `difficulty` | `easy`, `medium` or `hard`.                                                       |
| `known`      | Always `false` in seed files — it is per-user progress.                           |

**Answer style.** Keep answers interview-short: 1-3 sentences, under 40 words of prose.
Lead with the direct answer, then one key point — a why, a trade-off, a formula or an example.
Code fences and formulas don't count toward the word limit. Tag code fences with a language;
`python`, `javascript`, `bash`, `json` and `sql` are syntax-highlighted and anything else
renders as plain monospace.

### `npm run validate-data`

Fails the run (exit 1) on: invalid JSON, schema violations, duplicate ids, duplicate question
text, a bad `difficulty`, empty `q`/`a`, an id that doesn't match `<topic>-<subtopic>-NNN`,
fewer than 10 questions in a subtopic, or an unbalanced code fence. Warns (exit 0) on answers
over 40 words of prose, raw HTML, and seeds shipped with `known: true`. It also prints the
topic/subtopic/question counts and the difficulty mix.

---

## How storage works

`localStorage` is the source of truth for content after the first load.

| Key                            | Holds                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| `interviewprep.content.v1`     | The whole dataset — your edits, additions and progress     |
| `interviewprep.tombstones.v1`  | Ids you deleted, so a seed merge can't bring them back     |
| `interviewprep.settings.v1`    | Last subtopic, filter, expanded sidebar topics, random scope |
| `interviewprep.theme.v1`       | `"light"` / `"dark"`, or absent to follow the OS           |

Every read and write is wrapped in `try/catch`. If stored content is missing the app seeds
from the JSON files; if it's corrupt or fails schema validation the app falls back to the
seed and tells you so in a toast. A private window or blocked storage degrades to
in-memory-only rather than breaking.

The seed files are loaded with dynamic `import()`, so on a normal start — valid stored
content, matching version — they are never downloaded at all.

### Seed versioning

`SEED_VERSION` in `src/data/index.js` is stored alongside your content. When the bundled
version is **newer** than the stored one, the app runs an **additive merge**:

- topics, subtopics and questions whose ids aren't stored yet are **added**
- anything you edited keeps your text, difficulty and `known` flag — seeds never overwrite
- nothing is ever deleted
- ids in the tombstone list are skipped, so questions you deleted stay deleted
- the stored version is updated and a toast reports how many questions were added

So the workflow for adding content is: edit the JSON, bump `SEED_VERSION`, reload. Your
practice progress survives.

### Export and import

- **Export** (download icon) saves the full current dataset as
  `interviewprep-backup-YYYY-MM-DD.json` — same schema as above, wrapped in
  `{ "version": n, "topics": [...] }`.
- **Import** (upload icon) validates the file first and shows a clear error if it's invalid.
  On a valid file it asks how to apply it:
  - **Replace** — discard everything you have and use the file as-is.
  - **Merge** — keep what you have, add questions whose ids are new, and update ones that
    already exist.
- **Reset** (circular-arrow icon) confirms, then reloads the bundled seed and clears all
  progress, edits and tombstones.

Export before Replace or Reset — neither is undoable.

---

## Project structure

```
src/
  components/
    Sidebar.jsx           topic/subtopic nav, desktop column and mobile drawer
    TopBar.jsx            search, filter, reveal-all, random, backup, theme
    SubtopicHeader.jsx    breadcrumb, gradient title, progress bar, stat chips
    QuestionCard.jsx      the eye reveal, known toggle, edit/delete actions
    QuestionModal.jsx     add + edit, markdown editor with a preview tab
    ConfirmDialog.jsx     custom confirm (never window.confirm)
    NameModal.jsx         add topic / add subtopic
    Modal.jsx             shared dialog shell: backdrop, focus trap, Esc, scroll lock
    MarkdownAnswer.jsx    markdown + syntax-highlighted code blocks with Copy
    Toast.jsx             notification stack
    EmptyState.jsx        no-results / empty-subtopic states
    BackgroundBlobs.jsx   decorative animated background
  data/
    python.json ml.json dl.json genai.json agentic.json
    index.js              SEED_VERSION + lazy seed loader
  hooks/
    useLocalStorage.js    guarded persisted state
    useTheme.js           light/dark with OS default
    useMediaQuery.js      picks desktop sidebar vs mobile drawer
  utils/
    storage.js            seed, version merge, validate, export, import, tombstones
    ids.js                slugs and generated ids
    topicMeta.js          icon and accent-colour maps
  App.jsx  main.jsx  index.css
scripts/
  validate-data.js
```

---

## Verification status

- `npm run build` — succeeds, no warnings.
- `npm run validate-data` — passes with 0 errors and 0 warnings: 5 topics, 90 subtopics,
  1095 questions, 11+ per subtopic, difficulty mix 40% easy / 40% medium / 20% hard.
- The UI was driven end to end in a jsdom harness (58 assertions: reveal, keyboard reveal,
  add/edit/delete, known toggle and persistence, search, filter, random, export, import
  replace/merge, reset, theme, seed-version merge, tombstones, corrupt-storage recovery)
  with zero React console errors or warnings. That harness is a dev-time scratch script and
  is not part of the repo.
