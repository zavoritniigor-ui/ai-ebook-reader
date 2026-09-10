# AI Ebook Reader — Architecture

This file exists so a future agent (or Codex, or a human) can locate the code responsible
for a given feature without scanning the entire application. It is the end result of the
19-step modularization migration tracked in `MIGRATION_STATUS.md` — read that file for the
full history and reasoning behind every decision mentioned here; this file states the
*current* shape only.

## The shape of the app

`index.html` is a thin shell: markup, `<style>`, the vendor `<script>` tags (JSZip, Mammoth,
PDF.js), and eighteen ordered `<script src="js/...">` tags — one per module, in a fixed load
order that matters (see "Load order" below). Exactly one fragment of application code is
still inline in `index.html` rather than in a module, and it has to stay that way — see
"The one inline exception" below.

`sw.js` is a minimal service worker: it precaches the app shell (index.html, the 18 modules,
vendor files, icons) under a content-derived cache name and serves navigation requests
network-first with a fallback to cache. `tools/version_app_shell.py` and
`tests/app_shell_versions.py` keep the two files' version identifiers honest — see
"Content-hash versioning" below.

## Why every module is a classic `<script>`, not an ES module

Every `js/*.js` file is loaded as a plain classic script
(`<script src="js/x.js?v=hash"></script>` — no `type="module"`, no `defer`, no `async`), and
every one of them declares its top-level functions and `let`/`const` bindings as ordinary
globals, the same way the original single-file `index.html` always worked. This was a
deliberate correction made during Step 1, not the original migration plan (which assumed ES
modules with `import`/`export`) — the two vendor scripts (JSZip, Mammoth) are classic scripts; PDF.js and its inline
worker-configuration script use type="module" and deferred execution,
and if the extracted modules used `type="module"`, they would execute in *deferred* timing
(always after the document finishes parsing) while the rest of the classic scripts execute
*synchronously, in document order, as the parser reaches them* — meaning a classic script
appearing later in the document than a `type="module"` script one still runs *before* it in
practice. Splitting the app across the two mechanisms would have made execution order
backwards from what the code actually needs, and would have required exposing every function
the browser-based test harness calls (`initPdf`, `state`, `sentenceRangeAt`, etc.) as
`window.x = x` shims, since ES module scope doesn't leak into the global scope the way classic
scripts do.

**The practical consequence for anyone editing a module**: classic `<script>` tags share one
script *scope* for code that has already executed, but they do **not** hoist function
declarations *across* files — hoisting only happens within a single script tag's own text. If
a file contains a **top-level (not inside a function body) statement** that calls something
defined in a file loaded *later* in the document, it throws `ReferenceError` immediately on
page load. This exact mistake happened once in production (see "Known incidents" below) and
must be checked for before finishing any edit to a module: grep the file for top-level
non-declaration statements and verify every name they reference is either declared earlier in
the same file, declared in an earlier-loading module, or — the common and safe case — only
referenced from *inside* a function body or event-handler callback, where it's fine regardless
of file order because the callback won't run until long after every script has loaded (see
"Deferred references" below).

None of the modules use `'use strict'` — the original file never was strict mode, and adding
it during the migration would have been an unplanned behavior change.

## Load order (index.html)

```
core.js → lang-detect.js → tts.js → selection.js → navigation.js → pdf-zoom-pan.js →
ui-tooltip.js → translation.js → grammar-svo.js → ai-client.js → dictation.js →
pdf-ink.js → pdf-crop.js → pdf-render.js → formats.js → onboarding.js → main.js →
pwa-lifecycle.js
```

Three positions in this order are load-bearing, not arbitrary:

- **`lang-detect.js` must load before the one inline exception fires** (see below) — it's
  second in the list specifically so `pageLang()` exists before `loadVoices()` is first
  triggered.
- **`main.js` cannot load early.** Its startup bootstrap call `applyI18n()` makes top-level
  immediate calls into `updateAltVoicesBtn`/`updateTtsButtons` (`tts.js`), `updateProgressText`
  (`navigation.js`), and `updateDictationUI` (`dictation.js`). `main.js` loads second-to-last,
  after every module whose functions it calls immediately at startup.
- **`pwa-lifecycle.js` loads last.** Its overlay-history `MutationObserver` setup references
  `pdf-crop.js`'s `cropDialog` directly in a top-level array literal (not inside a callback),
  so `pdf-crop.js` must already have run. Loading this file last is what makes that safe.

Everything else in the order reflects where each module's content happened to sit in the
original monolithic file — there was rarely a hard requirement to load module A before module
B; most cross-module calls are "deferred references" (below) and don't care about order. Don't
assume the *current* order is the only correct one, but don't reorder it casually either — the
three constraints above are real, and reordering risks reintroducing the Step 1–3 incident.

## The one inline exception

Right after `lang-detect.js`'s `<script src>` tag, `index.html` still has one small inline
`<script>` block:

```js
if (ttsSynth) { ttsSynth.onvoiceschanged = loadVoices; loadVoices(); }
```

This is the **first call to `loadVoices()`** (defined in `core.js`), and it deliberately sits
here rather than inside `core.js` itself, because `loadVoices()` internally reaches
`pageLang()` (`lang-detect.js`) — which doesn't exist yet at the point `core.js` itself
executes. Moving this one line back into `core.js`, or moving it earlier than `lang-detect.js`,
reproduces the exact bug described below under "Known incidents". It is the **only** piece of
application logic left in `index.html` outside a `<script src>` tag.

## Deferred references (the pattern that makes cross-module calls safe)

A huge fraction of the calls between modules only work because they're **deferred** —
wrapped in a function body, event handler, or `async` callback — rather than executed
immediately at parse time. A reference to a name in a *later-loading* module is safe only after that module has
initialized. The body remains inert until load to prevent early user input; timers and
promise callbacks still require their dependencies to exist when they fire. This is the single mechanism that lets the module graph below
be far more circular than a traditional import graph would allow. Two examples worth knowing
by name, because they were specifically identified and verified during the migration rather
than assumed:

- **`pdf-render.js`'s `pdfAnchor`**: called only inside async callbacks in `pdf-render.js`,
  with `pdfAnchor` defined in `pdf-zoom-pan.js`, which currently loads *before*
  `pdf-render.js`. Verified safe because the call never happens at top level.
- **`selection.js` ↔ `translation.js`**: `selection.js` (loads earlier) forward-calls
  `handleWordOrSelection` (defined in `translation.js`, loads later) from inside its own
  tap/click event handlers — and, in the other direction, `translation.js`'s
  `handleWordOrSelection` calls into `grammar-svo.js`'s `analyzeSVO`/`startAiTask` (loads
  later still), also only from inside `onclick` closures set up when the tooltip is shown.

## Module map

One line each, in load order. "Owns" means this is where the function/feature actually lives
today; it does not always match the original `MODULARIZATION_PLAN.md` guess (see "Resolved
plan deviations" below for the two places the plan turned out to be wrong once the code was
actually read).

| Module | Owns |
|---|---|
| `core.js` | `state`/`els`, i18n (`I18N`/`t`/`applyI18n`), storage helpers (`readStored`/`writeStored`/`readStoredNumber`), async-task bookkeeping (`beginAsyncTask`/`cancelAsyncTasks`), `fetchWithTimeout`/`aiText`/`waitForResult`, `readerEpoch`/`pdfTasks` state containers, `invalidateSelection`, `showReaderError`, sanitization (`safeHtml`/`escapeHtml`), and — deliberately, not moved to `tts.js` — the whole voice-selection cluster (`voiceQualityScore`/`pickBestVoice`/`pickVoicePair`/`loadVoices`/`saveVoiceChoices`, plus `ttsSynth`/`voices`). |
| `lang-detect.js` | EN/FR language detection heuristics (`detectLang`, `pageLang`, `langForText`, `fragmentLangInContext`, `buildLanguageSegments`, `voiceForLangCode`/`voiceForText`) and their supporting tables. `fragmentLangInContext(fragment, context)` finds a specific fragment's own language at its position within a larger (possibly bilingual) context, rather than detecting the context's "majority" language — `langForText` and `grammar-svo.js`'s `buildLanguageLevelPrompt` both use it so a fragment next to a longer inline translation doesn't inherit the translation's language. |
| `tts.js` | Tooltip speech (`stopTooltipSpeech`/`bindUtterance`/`speakText`/`speakInLang`), which side is spoken (`setSpeakSide`), and the sentence playback/highlight/control cluster (`buildSentenceRanges`, `startTTS`/`stopGlobalTTS`/`pauseTTS`/`resumeTTS`/`stepSentence`, the "two voices" toggle). Voice *selection* itself is in `core.js` (see above). `TTS_CANCEL_SPEAK_DELAY_MS`: every place that calls `speechSynthesis.speak()` right after `.cancel()` (`speakText`/`speakInLang`/`stepSentence`, plus the voice-preview sample in `js/main.js`) waits this many ms first, guarded by the `ttsGen` counter — on Android/Chrome an immediate `speak()` can overlap the just-cancelled utterance's audio tail, heard as the same voice playing twice a few ms apart; the `speakSegment`→`onend`→`speakSegment` chain inside `speakCurrentSentence()` is unaffected (no `cancel()` between those `speak()` calls, nothing to delay). `setUtteranceVoice(u, lang, voice)`: sets `u.lang` from the ACTUALLY SELECTED voice's own `.lang` (falling back to the given canonical `lang` only when no voice was resolved) instead of setting `u.lang`/`u.voice` independently — a mismatch between them (our canonical `'fr-FR'` vs. a real chosen voice's own `'fr-CA'`, say) is a separate, documented cause of the same "doubled voice" symptom on Android, and — unlike the cancel()-timing issue above — affects `speakCurrentSentence()`'s segment chain too, since it has nothing to do with `cancel()` timing. Used at all three real speak sites and the voice-preview sample. |
| `selection.js` | Caret/range geometry (`caretRangeAt`/`paragraphRangeAt`/`sentenceRangeAt`/`wrapRangeInSpans`), PDF text-layer span handling (`pdfTextSpans`/`pdfVisualGroup`/`buildSentenceRangesFromSpans`), word/drag selection (`selectWordAtPoint`, `wordBoundsAt`/`rangeBetweenWords`), and the main tap/click listener that dispatches to translation. `anchorCaret()` re-finds `state.lastWordNode`'s first text descendant via `TreeWalker` rather than checking `firstChild` directly — required once the translation popup's "select" button can nest a `span.sel-word` highlight inside the pre-existing `span.word-visited` (see `tests/pdf_sentence_reselect_browser.py`). `pdfVisualGroup()`'s column detection clusters in two stages — Y-bands (which can span BOTH columns of a row-aligned bilingual layout) first, then within each band a right-edge-to-next-left-edge gap cuts it into per-column "segments" — because a same-line style break (an inline bold marker word, e.g. "Premièrement,"/"First,") creates a separate PDF text fragment whose own left edge is meaningless for column membership; only clustering by segment START-X (not every fragment's) keeps such fragments correctly attached to their real column (see `tests/pdf_bilingual_columns_browser.py`). |
| `navigation.js` | CSS-column pagination (`columnStep`/`paginateContainer`/`goToPageInChapter`), the bookmark (`saveBookmark`/`loadBookmark`), `goNext`/`goPrev`, touch/wheel page-turn gestures, the mixed-format window-resize handler, and `buildToc` (shared by all three format loaders, folded in during Step 10). |
| `pdf-zoom-pan.js` | PDF mouse/touch zoom and pan: wheel+Ctrl zoom, pinch-to-zoom, drag-to-pan, `setPdfScale`/`applyPdfZoom`/`rerenderPdfAtCurrentZoom`, the `pdfPointers` gesture-owning Map, the `pdfBlockClick` click-suppressor, `#pdf-fit`'s handler. |
| `ui-tooltip.js` | The translation tooltip's position/lifecycle (`positionTooltip`/`repositionTooltip`/`scheduleTooltipHide`), the footer submenu (`openFooterMenu`/`closeFooterMenu`) kept *with* the tooltip rather than in `navigation.js` (see "Resolved plan deviations"), and the key-settings modal (`openKeySettings`/`closeKeySettings`/`saveApiKey`). |
| `translation.js` | Word/selection → translation: alignment highlighting (`validateAlignment`/`installAlignment`/`flashAlignment`), the core `handleWordOrSelection` tap handler, on-device translation via Chrome's Translator API (`translateLocally`, and `warmLocalTranslator` — proactively starts the language-pack download while online, from `lang-detect.js`'s `updateSourceLang()` and the target-language `<select>`'s change handler in `main.js`, so the pack is actually ready by the time the device goes offline; silent, unlike `translateLocally`'s own download which updates `els.progress` — see the file's own comment on `getLocalTranslator`'s `showProgress` parameter), English phrasal-verb detection (`detectPhrasalVerb`), and translating inside the AI panels (`translatePanelPoint`). |
| `grammar-svo.js` | The Grammar/Ask AI panels: `startAiTask` (the actual AI request/response flow — deferred here from Step 3), the AI prompt builders, verb conjugation UI, and SVO sentence-part analysis (`analyzeSVO`/`applySVOParts`). |
| `ai-client.js` | `callAI`/`callAIVision`, the Gemini/Groq provider selection and vision fallback, `aiAvailable`, `sanitizeAI`. Does **not** contain `startAiTask` (see `grammar-svo.js`) or `machineTranslate`/`aiTranslateText` (see `translation.js`). |
| `dictation.js` | Speech-to-text for the Ask panel: `updateDictationUI`, `stopDictation` (finalizes interim text exactly once), `startDictationSession` (bounded auto-restart), `toggleDictation`. |
| `pdf-ink.js` | Writing over the PDF page: the canvas layer and per-page relative-coordinate stroke storage (`inkStrokes`/`saveInk`/`loadInk`/`redrawInk`), drawing/erasing input, pen tool controls. |
| `pdf-crop.js` | Page-region selection and crop: `exitRegionMode`/`cropPdfRegion`, the crop preview dialog (Save PNG/Share/Copy PNG), and `checkExerciseImage` (calls `ai-client.js`'s vision API, kept here since it's only ever invoked from the crop flow). |
| `pdf-render.js` | `initPdf` (opens a PDF.js document), `renderPdfPage` (canvas + text layer + ink layer render with epoch/render tokens against stale async responses), and the page scrubber. |
| `formats.js` | Book format loaders: `runArchiveGuard` (Worker-based ZIP-bomb/zip-slip check before JSZip/Mammoth ever see an EPUB/DOCX), `initEpub`/`initRichDoc` (Mammoth)/`initTxt`, `fb2ToHtml`, `rtfToHtml`. |
| `onboarding.js` | First-run discovery cues for the Ask/Grammar/TOC buttons (`scheduleReaderOnboarding`/`rememberOnboarding`/`stopOnboarding`), shown once per profile via `onboardingState`. |
| `main.js` | Cross-module bootstrap wiring that doesn't belong to any one feature: reader-settings restore (UI language/theme/target language/voice), the Learn-mode toggle, Ask-panel mic/send wiring, `openBookFile(file)` (the actual "open a book" entry point — resets all reader state, then dispatches to `formats.js`/`pdf-render.js` by file extension; called by the `<input type=file>` change handler), zoom/theme/nav button wiring, and the final `updateDictationUI()`/`applyI18n()` startup calls. |
| `pwa-lifecycle.js` | Everything about being an installed PWA: `stopBackgroundActivity` (the one switch for TTS/mic/AI-requests/PDF-render when backgrounded), `persistCriticalState`, the exit-app button, the Android-Back overlay stack (`OVERLAY_LAYERS`/`syncOverlayHistory`), the "update available" banner, service worker registration, and the `document.body.inert`-until-`load` gate (see "Known incidents"). |

## Resolved plan deviations

The original `MODULARIZATION_PLAN.md` was written by reading `index.html` once, before any
extraction happened, and guessed at file boundaries from line numbers and section-title
comments. Two guesses turned out to be wrong once the actual code was read carefully during
extraction — both are **settled**, not open questions:

- **`openFooterMenu`/`closeFooterMenu`/`enterMobileFullScreenIfNeeded`** were filed under
  `navigation.js` in the original plan. They live in `ui-tooltip.js` instead: the actual code
  has a single `pointerdown` listener that closes both the footer menu *and* the translation
  tooltip on an outside tap — they're the same kind of transient overlay with the same dismiss
  rule, and splitting one function across two files for the plan's sake wasn't worth it.
- Two pieces that Step 4's recon initially flagged as "mixed, needs a judgment call" (the
  touch-gesture section and the PDF-mouse-control section) turned out, once every listener
  body was actually read rather than just the section-title comment, to be 100%
  `navigation.js`/`pdf-zoom-pan.js` content with zero selection-related material. Lesson kept
  in `MIGRATION_STATUS.md`: section-title comments are not reliable classifiers on their own.

## Known incidents (why some of the above rules exist)

- **`ReferenceError: pageLang is not defined` in production (Steps 1–3).** `core.js`
  originally contained the *immediate* call `loadVoices()` at its own top level, which
  transitively calls `pageLang()` — moved to `lang-detect.js` in a later step, which hadn't
  loaded yet at the point `core.js` executed. Local test suites didn't catch this because
  headless Chrome's fresh profile returns an empty voice list, short-circuiting the code path
  that reaches the failing call — only a real production smoke test caught it. Fixed by moving
  only the one-line *invocation* to right after `lang-detect.js` loads (see "The one inline
  exception" above); the function *definitions* stayed in `core.js`. This is why a full
  production smoke test (not just the local suites) is mandatory after every module change,
  and why that one inline trigger line must never move.
- **Input reaching handlers before PDF.js's module finished loading (found during the
  retrospective audit, Steps 0–4).** On a slow cold start, classic scripts could expose their
  callbacks before the `type="module"` PDF.js script and its worker-configuration script had
  actually finished. Fixed by keeping `document.body.inert = true` until the `load` event
  fires (see `pwa-lifecycle.js`'s last line) — no user interaction is possible until every
  script, module or classic, has run.
- **`PDFDocumentProxy.destroy()` removed in PDF.js 6.3.289** (found during the same audit): a
  stale-completion cleanup path called `.destroy()` on a document proxy that no longer has
  that method. Fixed by destroying the owning `PDFDocumentLoadingTask` instead.

## Test coverage map

| Suite | Covers |
|---|---|
| `tests/pdf_ux_browser.py` | PDF-specific UX: zoom/pinch/pan, the ink layer, crop, the page scrubber, background-cancellation of in-flight PDF work. |
| `tests/learning_ux_browser.py` | Translation/alignment, grammar/SVO analysis, dictation, onboarding cues — the non-PDF "learning" features. |
| `tests/migration_audit_browser.py` | Cross-cutting correctness that the other two suites don't reach: classic script execution order, cold/hard reload behavior, sanitization, async task cancellation/epoch handling, AI provider fallback, real PDF cold-start rendering and multi-column sentence extraction, offline shell completeness, and genuine service-worker/offline behavior (the only suite that does **not** bypass the service worker). |
| `tests/app_shell_versions.py` | Fails CI if `index.html`'s script query-string versions and `sw.js`'s `APP_SHELL` entries have drifted apart — see "Content-hash versioning" below. |
| `tests/language_paren_browser.py` | `lang-detect.js`'s parenthetical-translation-pair detection (`bonjour (hello)`, `hello (bonjour)`, nested parens) plus flat (non-parenthetical) mixed-language regression cases, so the paren-aware split can't silently break the plain sentence path. |
| `tests/language_context_browser.py` | `lang-detect.js`'s context-aware clustering for local EN/FR phrases with **no** parentheses (`The French word maison means house.`, `Il est très important to pronounce it correctly.`), the test-only `debugLanguageSegments` inspection (token scores/tiers, segment boundaries, chosen TTS locale), a mixed EN/FR TTS voice-selection smoke test, and a guard that parenthesis segmentation stays unaffected. |
| `tests/ask_ai_language_browser.py` | "Запитай AI" → "Мовний розбір" (`grammar-svo.js`'s `buildLanguageLevelPrompt`, via `lang-detect.js`'s `fragmentLangInContext`): the tapped/selected fragment's own language must drive the A2/B1 simplification language, not the language of a nearby inline translation (a bilingual sentence's translation is often longer than the original, so whole-context "majority characters" detection picked the wrong side). Covers the prompt builder directly and the real tap → button → AI-call wiring. |
| `tests/local_translator_warmup_browser.py` | `translation.js`'s `warmLocalTranslator`: a silent background download of Chrome's on-device Translator language pack, triggered from `updateSourceLang()` and the target-language change handler, must not touch `els.progress` (also "page X of Y"), while a real foreground `translateLocally()` call still shows its download percentage there; warm-up is skipped offline or for a same-language "pair", and repeated calls for the same pair only start one download. The real Translator API is mocked. |
| `tests/tts_double_voice_browser.py` | `tts.js`'s `TTS_CANCEL_SPEAK_DELAY_MS` fix for the "same voice plays twice, milliseconds apart" bug (user-reported, most noticeable in French): `speakText`/`speakInLang`/`stepSentence` (and `js/main.js`'s voice-preview sample) used to call `speechSynthesis.speak()` immediately after `.cancel()` in the same tick, which on Android/Chrome can let the just-cancelled utterance's audio tail overlap the new one. Asserts `speak()` never fires synchronously with `cancel()`, fires exactly once after the delay, and — the actual regression guard — a second call before the delay elapses (rapid tap, fast double-step) discards the first scheduled `speak()` via the `ttsGen` guard instead of also firing it, so two utterances are never in flight together. `speechSynthesis` is mocked via `Object.defineProperty` (it's natively read-only, so a plain `window.speechSynthesis = ...` silently no-ops). |
| `tests/tts_lang_voice_mismatch_browser.py` | `tts.js`'s `setUtteranceVoice()` fix — a SEPARATE cause of the same "doubled/echoed voice" report, additional to the cancel()-timing fix above (which alone didn't fully resolve it, since this one also happens with no `cancel()` involved, e.g. the plain continuous-reading segment chain). Every real speak site used to set `utterance.lang` from our own hardcoded canonical string (`LANG_TAGS`/`voiceForLangCode`'s `fullLang`) while setting `utterance.voice` independently from whatever `pickBestVoice`/the user's saved choice resolved to — and that voice's own `.lang` can differ (voice selection only matches a 2-letter prefix, so a device's best French voice might genuinely be `fr-CA`, not `fr-FR`). A mismatched `lang`/`voice` pair on an utterance is a documented way to confuse Android's bridge to the system TTS engine into satisfying both signals at once, which can play the utterance twice. Mocks two voices whose own `.lang` deliberately differs from the canonical mapping to prove `utterance.lang` always ends up matching `utterance.voice.lang` at all three real speak sites (`speakText`, `speakInLang`, `speakCurrentSentence`'s per-segment loop) plus the settings voice-preview sample, which already did this correctly and now shares the same helper. |
| `tests/pdf_sentence_reselect_browser.py` | `selection.js`'s `anchorCaret()` fix (user-reported: tapping a PDF sentence's FIRST word, then pressing the translation popup's "select" button twice in a row, selected the wrong text the second time). Root cause: the first "select" press wraps the just-selected text in a new `span.sel-word` (`showSelectionHighlight`/`wrapRangeInSpans`, PDF path) — when the tapped word IS the sentence's first word, that new span lands INSIDE the pre-existing `span.word-visited` around the tapped word, replacing its `firstChild` with an element instead of a text node, so `anchorCaret`'s old direct `firstChild` check silently fell back from the reliable word anchor to raw-coordinate hit-testing on the second press. Uses the real PDF.js-rendered two-column synthetic fixture (`pdf_bytes(two_columns=True)`, the same "original beside its translation" layout the user described) to assert the 2nd press still selects exactly the same sentence as the 1st, and that no press ever bleeds text across the column boundary. |
| `tests/pdf_bilingual_columns_browser.py` | `selection.js`'s `pdfVisualGroup()` fix for a REAL text-based bilingual-textbook PDF (user-reported and reproduced from a screenshot): a sentence in a row-aligned two-column layout (original left, its own-language translation right) with an inline bold marker word mid-sentence ("Premièrement,"/"First," — real "Firstly/Secondly/..." bilingual-book style) — selecting grabbed text from BOTH columns at once, and some words on the tapped column were read/detected with the OTHER column's language. Uses `bilingual_pdf_bytes()` (an actual Helvetica→Helvetica-Bold font change with runs shown continuously, no repositioning between them, so fragment gaps come out realistically small within a line and large across the true column gutter — not hand-picked offsets that could pass for the wrong reason) to assert a tap on either side of the bold-marker line reconstructs its OWN complete sentence with zero words dropped and zero bleed from the other column, and that each column's whole `pdfVisualGroup` contains only its own language. |
| `tests/browser_cdp.py` | Not a test suite itself — the shared minimal CDP client (`CDP`) and synthetic-PDF fixtures (`pdf_bytes`, `bilingual_pdf_bytes`) other suites import. Its WebSocket frame reader was rewritten during Step 6 to reassemble fragmented frames (see below); a genuine bug, not the same thing as the CI-only Chrome-startup flake below. |

**Two known CI-only flakes**, both distinguished from real bugs and documented so a future
agent doesn't have to re-diagnose them:

- **Fixed, real bug**: `tests/browser_cdp.py`'s original WebSocket reader assumed one frame
  equals one complete message. Under `Network.enable`'s heavier event traffic on the GitHub
  runner (never reproduced locally), a fragmented frame desynced the byte stream and eventually
  crashed with `MemoryError`. Fixed during Step 6 by reassembling messages by the FIN bit and
  swallowing ping/pong/close control frames.
- **Ongoing, infra-only, not a bug**: a `timeout 15` wait for Chrome's CDP port to open
  sometimes expires before any test code even runs — pure GitHub-runner resource contention,
  seen on both docs-only and code-changing PRs, always resolved by a single `gh run rerun
  --failed`. Two-in-a-row on the *same* PR is worth investigating for real rather than
  rerunning blindly (that's exactly how the WebSocket bug above was originally caught).

## Content-hash versioning

`sw.js`'s cache-busting no longer relies on manually bumping `CACHE_NAME`. Instead:

- `tools/version_app_shell.py` computes a SHA-256-derived hash of every file in `js/*.js` and
  rewrites the `?v=<hash>` query string on that file's `<script src>` tag in `index.html` *and*
  its entry in `sw.js`'s `APP_SHELL` array, then derives `CACHE_NAME` itself from a hash of the
  resulting `index.html`.
- **Run this after touching any `js/*.js` file, before running the test suites** —
  `tests/app_shell_versions.py` fails CI if the two files' version strings don't match what the
  actual file contents hash to.
- The offline shell (service worker cache) and the live `index.html` are always paired as one
  version identity this way — a stale cached JS file can never run against a freshly-fetched
  `index.html` or vice versa, which was the root cause of one of the retrospective audit's
  findings (`RETRO_AUDIT.md` finding #1).

## Format expansion (maintenance)

See `FORMAT_SUPPORT.md` for implemented capabilities and explicit limits.
`formats.js` also handles guarded FB2.ZIP, XML encoding and binary images, pinned
Marked rendering, inert SVG rasterization and resource-aware reflow.
`navigation.js` stores character offsets alongside legacy page bookmarks;
`selection.js` indexes reflowable words across inline text nodes.
`tests/formats_browser.py` covers these paths with synthetic fixtures in CI.

`pdf_sentence_reselect_browser.py` waits for a quiet PDF render interval after
mobile viewport setup. The navigation resize debounce can otherwise invalidate
the test selection after `initPdf` resolves; this was reproduced during format
release CI, then isolated to test setup rather than sentence expansion.
