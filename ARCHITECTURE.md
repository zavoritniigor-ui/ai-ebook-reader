# AI Ebook Reader — Architecture

A map for finding the code behind a feature. It states the **current** shape only; the long history and every past
decision are in `docs/archive/ARCHITECTURE-detailed-2026-11-14.md` (the previous version of this file) and
`docs/archive/MIGRATION_STATUS.md`. Keep this file short: one line per module, no change logs — those belong in the
commit message and the PR.

## Shape

- **No build step.** `index.html` (markup + CSS) loads the vendor scripts and ~58 classic `<script src="js/…?v=hash">`
  files in a fixed order. Static hosting on Cloudflare Pages; a few Pages Functions in `functions/api/`.
- **Classic scripts, shared globals.** Every module declares top-level functions and `let`/`const` as globals; there
  are no ES modules (PDF.js is the only `type="module"` script). A top-level statement may only call names from files
  loaded *earlier*; calls inside functions and handlers may reach any module ("deferred references").
- **One state object.** `state` and `els` (cached elements) live in `core-state.js`; persistence is `localStorage`
  (`reader_*` keys, via `core.js` helpers) and IndexedDB for books, handwriting and audio.
- **Offline.** `sw.js` precaches the app shell under a content-derived cache name and serves navigations network-first.

## Load order (index.html)

Vendor: `jszip`, `mammoth`, `marked`, `pdf.mjs` (module) + `js/pdf-worker-setup.js`. Then, in this order:

`welcome` → `core` → `core-text-layout` → `core-languages` → `core-state` → `core-voices` → `core-i18n` →
`core-text` → `lang-detect` → `local-speech` → `tts` → `selection` → `selection-pdf-order` → `selection-highlight` →
`selection-drag` → `cefr-lexicon-data` → `learning-stats` →
`reading-ribbon` → `book-marks` → `navigation` → `pdf-zoom-pan` → `ui-tooltip` → `translation` → `dictionaries` →
`sentence-structure` → `grammar-svo` → `grammar-analysis` → `grammar-prompts` → `grammar-panel` → `grammar-lookup` →
`grammar-run` → `grammar-rules-data-fr/en` → `grammar-rules-details-fr/en` → `grammar-rules` →
`ai-client` → `practice-session` → `practice-worksheet` → `dictation` → `offline-catalog` → `offline-dict-catalog` →
`offline-translate` → `offline-dict` → `device-llm-catalog` → `device-llm` → `pdf-ink` → `text-ink` → `pdf-crop` →
`pdf-outline` → `pdf-thumbnails` → `pdf-continuous` → `pdf-contrast` → `publication-files` → `pdf-render` →
`book-audio` → `book-speech` → `formats` → `comics` → `onboarding` → `library-queue` → `library` → `book-shelf` →
`scanner` → `sync` → `quick-wheel` → `developer` → `main` → `demo-textbook` → `pwa-lifecycle` → `i18n-es`

`tests/migration_audit_browser.py` pins this list. Load-bearing positions:
- the one inline line after `lang-detect.js` (`if (ttsSynth) { ttsSynth.onvoiceschanged = loadVoices; loadVoices(); }`)
  must stay there: `loadVoices()` (core-voices) reaches `pageLang()` (lang-detect);
- `core*.js`, `selection*.js` and `grammar-svo.js` … `grammar-run.js` each load together, in the order above: each group
  was one file, cut into consecutive pieces (2026-11-14);
- `main.js` near the end: its startup calls into tts/navigation/dictation;
- `pwa-lifecycle.js` after `pdf-crop.js` (top-level reference to `cropDialog`); it lifts `document.body.inert` on `load`;
- `i18n-es.js` last: it covers every `I18N` key added by the other files.

A new module: add its `<script>` in `index.html`, its path to `sw.js` `APP_SHELL`, the test's pinned list, and a line below.

## Modules

**Foundation**
| File | Responsibility |
|---|---|
| `core.js` | safe localStorage, `safeHtml` (allow-list sanitizer for all book HTML), async task epochs, network helpers |
| `core-state.js` | `state`, `els`, contents sidebar toggling |
| `core-i18n.js` | `I18N`, `t()`, `applyI18n`, small menu/panel UI helpers |
| `core-languages.js` | `LANGUAGE_CONFIG`, grammar language config, tolerant JSON parsing of AI replies, language choice |
| `core-voices.js`, `core-text-layout.js`, `core-text.js` | voices and `loadVoices`; text look settings; `escapeHtml`, sentence boundaries |
| `lang-detect.js` | language of a text fragment (bilingual books, mixed sentences), `pageLang()` |
| `main.js` | settings wiring and app bootstrap not owned by a feature module |
| `pwa-lifecycle.js` | background activity switch-off, overlay/back-button stack, update banner, toasts, install button |
| `i18n-es.js` | Spanish UI strings |
| `welcome.js`, `onboarding.js`, `developer.js`, `demo-textbook.js` | welcome video, first-use hints, «from the developer» dialog, guided demo tour |

**Reading and selection**
| File | Responsibility |
|---|---|
| `navigation.js` | pagination of text books (CSS columns), page turns, progress |
| `selection.js` | caret and paragraph under a point |
| `selection-pdf-order.js` | PDF text in visual order (columns, rotation, word joining), `resolveCanonicalPdfSelection`, `sentenceRangeAt` |
| `selection-highlight.js` | highlight of the selected fragment, PDF selection anchors, `selectWordAtPoint`, `selectRangeAndTranslate` |
| `selection-drag.js` | drag selection by words (finger, stylus, mouse), `handleReadingClick` |
| `ui-tooltip.js` | translation popup and footer submenu, «tap elsewhere» dismissal |
| `reading-ribbon.js`, `book-marks.js` | reading-place ribbon; highlights and notes in text books |
| `learning-stats.js`, `cefr-lexicon-data.js` | page understanding statistics; CEFR word levels (generated) |
| `quick-wheel.js` | the ✦ quick wheel (14 actions) |

**Formats and PDF**
| File | Responsibility |
|---|---|
| `formats.js` | loaders: EPUB (TOC, notes, book CSS subset), DOCX (Mammoth), FB2, TXT, MD, HTML, RTF; `runArchiveGuard` worker check of ZIPs |
| `comics.js` | CBZ |
| `pdf-render.js` | `initPdf`, rendering, text layer |
| `pdf-continuous.js`, `pdf-thumbnails.js`, `pdf-outline.js` | continuous scroll, thumbnails, outline/page labels/links |
| `pdf-zoom-pan.js` | zoom, pinch, pan |
| `pdf-contrast.js` | automatic contrast for faded scans |
| `pdf-ink.js`, `text-ink.js` | handwriting over PDF pages / text books (IndexedDB) |
| `pdf-crop.js` | region selection → AI vision, Gemini, text selection in text books |
| `publication-files.js` | bounded download/storage of large publications |

**Language, AI and speech**
| File | Responsibility |
|---|---|
| `translation.js` | word/fragment translation, alignment, popup content |
| `dictionaries.js` | Wiktionary/Wikipedia lookups |
| `offline-translate.js`, `offline-dict.js` (+ generated `*-catalog.js`) | translation without internet (Mozilla models), French→Ukrainian dictionary |
| `device-llm.js` (+ `device-llm-catalog.js`) | on-device AI model |
| `ai-client.js` | provider routing (Groq first, OpenAI backup), streaming, quotas, request log |
| `grammar-svo.js` | Ask AI / Language level tasks, `startAiTask`, `flattenRange` |
| `grammar-analysis.js`, `grammar-prompts.js` | Grammar analysis (prompt, `normalizeGrammarAnalysis`, verb endings); Ask AI and level prompts |
| `grammar-panel.js`, `grammar-lookup.js`, `grammar-run.js` | Grammar panel rendering and `focusGrammarItem`; «your own word» lookup; `runGrammarAnalysis`, Practice button |
| `sentence-structure.js` | sentence parts coloured in the text |
| `grammar-rules.js` (+ `grammar-rules-data-*`, `grammar-rules-details-*`) | Rules panel: catalog and rules found on the page |
| `practice-session.js`, `practice-worksheet.js` | Practice: generated readings and the workspace |
| `tts.js`, `local-speech.js` | read aloud (browser voices; local Kokoro server for en/fr) |
| `dictation.js` | microphone input for Ask AI, sound/mic diagnostics |
| `book-audio.js`, `book-speech.js` | a book's own audio tracks; offline-generated narration |

**Library and devices**
| File | Responsibility |
|---|---|
| `library.js` | free library: Gutenberg (local `library-catalog.json`), Wikisource→EPUB, Internet Archive, Library of Congress, newspapers & magazines, BNR, Standard Ebooks; author/years search |
| `library-queue.js` | one download at a time, retries |
| `book-shelf.js` | «My books»: opened books kept in IndexedDB, start-screen drum |
| `scanner.js` | document scanner: photos → frame (whole photo, editable) → filters → PDF/JPG/PNG, N pages per sheet, OCR (Tesseract) |
| `sync.js` | sync between devices by code |

## Server (`functions/api/`, Cloudflare Pages Functions)

| File | Does |
|---|---|
| `ai.js` | shared-key AI proxy (Groq/OpenAI), passes streams through |
| `library.js` | proxy to fixed library hosts only (Gutenberg, Wikisource, Internet Archive, BNR, SE); ids/paths validated; same-origin requests only |
| `offline-model.js`, `device-llm.js` | model file downloads from allow-listed sources, size/SHA-256 checked |
| `speech/[[path]].js` | proxy to the owner's local speech server (tunnel and token in Cloudflare secrets) |
| `sync.js` | device sync storage (KV; the server sees only the encrypted blob) |
| `../share-target.js` | «Share → AI Reader» before the service worker controls the page |

## Security model

- CSP in `_headers`: `script-src 'self'` (+ `wasm-unsafe-eval`), no inline scripts or handlers (CI checks `index.html`).
- All book HTML goes through `safeHtml` (tags, attributes and a short list of style properties; ids/links rewritten to
  `book-…`). Do not widen it without a test.
- Every place that puts HTML into the page (36 `innerHTML`/`insertAdjacentHTML` sites, reviewed 2026-11-14) takes either
  constant markup, `escapeHtml`'d text, or `safeHtml` output; parsing of untrusted markup happens only in inert
  `<template>`/`DOMParser` documents. `tests/hostile_book_browser.py` opens a hostile book in EPUB/FB2/HTML/MD/TXT/RTF
  and fails if anything runs, survives, leaves the app or trips the CSP (it fails when `safeHtml` is disabled).
- ZIP-based formats pass `archive-guard.worker.js` (size, ratio, paths) before JSZip/Mammoth.
- Functions never act as open proxies: they build upstream URLs themselves from validated parameters.
- Maintenance tools fetch only through `tools/safe_http.py` (HTTPS only, no `file://`; local checks via `http.client`);
  caches are JSON, never pickle. The Security Gate (`.github/workflows/security-gate.yml`: gitleaks, Semgrep pinned,
  Trivy, OSV) must be green on every PR; fix a finding in the code rather than silencing it.

## Versioning

After changing any `js/*.js`, `index.html` or app-shell file run `python3 tools/version_app_shell.py`; it rewrites the
`?v=` hashes in `index.html` and `sw.js` and the cache name. `tests/app_shell_versions.py` checks them. On a merge
conflict in those hashes take either side and re-run the tool.

## Tests

- Browser suites: `tests/*_browser.py` (Chrome over CDP, `tests/browser_cdp.py`); listed in `tests/ci_browser_suites.txt`
  and run by CI in 6 parallel shards (`tests/ci_run_browser.sh`). Each suite's docstring says what it covers.
- Unit tests: `tests/*_test.mjs` (Pages Functions with mocked upstreams), `tests/*.py` without `_browser`.
- `tools/module_graph.mjs` (run by `tests/module_graph_browser.py`) fails on a top-level name declared twice or a
  top-level use of a later-loading file; `node tools/module_graph.mjs --report` prints sizes and dependencies.
- Find the suite for a feature: `grep -l "<function or element id>" tests/*_browser.py`.
- How to test and deliver: `docs/agents/testing_and_versioning.md`, `docs/agents/delivery_lifecycle.md`.

## Other docs

`AGENTS.md` (rules for agents) · `HANDOFF.md` (who works on what now) · `FORMAT_SUPPORT.md` · `QUICK_WHEEL.md` ·
`docs/agents/` (coordination, debugging, book-audio and narration rules) · `docs/archive/` (history, not needed for work).
