# AI Ebook Reader — Architecture

This file exists so a future agent (or Codex, or a human) can locate the code responsible
for a given feature without scanning the entire application. It is the end result of the
19-step modularization migration tracked in `MIGRATION_STATUS.md` — read that file for the
full history and reasoning behind every decision mentioned here; this file states the
*current* shape only.

## The shape of the app

`index.html` is a thin shell: markup, `<style>`, the vendor `<script>` tags (JSZip, Mammoth,
PDF.js), and twenty ordered `<script src="js/...">` tags — one per module, in a fixed load
order that matters (see "Load order" below). Exactly one fragment of application code is
still inline in `index.html` rather than in a module, and it has to stay that way — see
"The one inline exception" below.

`sw.js` is a minimal service worker: it precaches the app shell (index.html, the application modules,
vendor files, icons) under a content-derived cache name and serves navigation requests
network-first with a fallback to cache. `tools/version_app_shell.py` and
`tests/app_shell_versions.py` keep the two files' version identifiers honest — see
"Content-hash versioning" below. Its `networkFirstForNavigation()` always passes the
Response it's about to hand to `respondWith()` through `stripRedirectHistory()` first —
required because Chrome refuses a `redirected:true` Response for a navigation and fails the
whole navigation with `net::ERR_FAILED` instead of displaying it; see "Known incidents"
below for why that matters here specifically.

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
core.js → lang-detect.js → tts.js → selection.js → learning-stats.js → navigation.js → pdf-zoom-pan.js →
ui-tooltip.js → translation.js → grammar-svo.js → ai-client.js → dictation.js →
pdf-ink.js → pdf-crop.js → pdf-render.js → formats.js → onboarding.js → quick-wheel.js → main.js →
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
| `core.js` | `state`/`els`, centralized language metadata (`LANGUAGE_CONFIG`) plus the data-driven `GRAMMAR_LANG_CONFIG` (one entry per supported language: Verbs/Adjectives labels in THAT language's own terms, the only verb/adjective feature dimensions allowed for it, verb tense/mood list, conjugation persons, adjective agreement forms) with `grammarConfigFor`/`normalizeGrammarFeatures`/`hasGrammarConfig` — adding a language (e.g. Polish, which is NOT currently a supported language and is deliberately not implemented) is one new object here. French and English additionally carry optional data-driven validation/prompt fields (`promptNote`, `lemmaRe`, `irregularRe`, `endings`, `auxiliaries`, `verifyForms`, and for French adjectives `paradigm`/`specialForms`/`ms_vowel`); no language is special-cased in code. Shared helpers: `normalizeGrammarText` (NFC + whitespace), `findSurfaceOccurrences` (whole-word occurrences; plain substring only for Han/Hangul), `parseAiJson`/`parseAiJsonObject` (string-aware extraction: tolerates a code fence, a preamble/postscript, trailing commas, comments and unescaped inner quotes; salvages a truncated reply only up to the last complete array element; never a bare array root — that is `array_root`, because the `language` echo is the wrong-language guard), `lemmaScriptMatchesSurface`, `languageEchoMatches`, i18n (`I18N`/`t`/`applyI18n`), storage helpers (`readStored`/`writeStored`/`readStoredNumber`), async-task bookkeeping (`beginAsyncTask`/`cancelAsyncTasks`), `fetchWithTimeout`/`aiText`/`waitForResult`, `readerEpoch`/`pdfTasks` state containers, `invalidateSelection`, `showReaderError`, sanitization (`safeHtml`/`escapeHtml`), and — deliberately, not moved to `tts.js` — the whole voice-selection cluster (`voiceQualityScore`/`pickBestVoice`/`pickVoicePair`/`loadVoices`/`saveVoiceChoices`, plus `ttsSynth`/`voices`). `safeHtml`'s `drop` set includes `title` — it's neither a content tag (allowed, rendered) nor previously dropped, so its text used to be silently kept as visible content by the "not a content tag, walk its children" fallback branch; defense-in-depth alongside `formats.js`'s own `DOMParser`-based fix for the HTML/HTM import path (see that file's row). |
| `lang-detect.js` | EN/FR language detection heuristics (`detectLang`, `pageLang`, `langForText`, `fragmentLangInContext`, `buildLanguageSegments`, `voiceForLangCode`/`voiceForText`) and their supporting tables. `isFrenchExerciseCue(inner, textBefore)` decides whether a parenthetical is a French fill-in-the-blank cue (`Ils (plaindre) la pauvre femme.` — NOT the opposite-language gloss `bonjour (hello)`) from STRUCTURE — a French subject pronoun right before it, a reflexive `se`/`s'`, or an ending no English word has — never from `-er/-re/-ir` shape alone (`père (father)`); it is shared by `buildLanguageSegments` and `selection.js`. `fragmentLangInContext(fragment, context)` finds a specific fragment's own language at its position within a larger (possibly bilingual) context, rather than detecting the context's "majority" language — `langForText` and `grammar-svo.js`'s `buildLanguageLevelPrompt` both use it so a fragment next to a longer inline translation doesn't inherit the translation's language. |
| `tts.js` | Tooltip speech (`stopTooltipSpeech`/`bindUtterance`/`speakText`/`speakInLang`), which side is spoken (`setSpeakSide`), and the sentence playback/highlight/control cluster (`buildSentenceRanges`, `startTTS`/`stopGlobalTTS`/`pauseTTS`/`resumeTTS`/`stepSentence`, the "two voices" toggle). Voice *selection* itself is in `core.js` (see above). `TTS_CANCEL_SPEAK_DELAY_MS`: every place that calls `speechSynthesis.speak()` right after `.cancel()` (`speakText`/`speakInLang`/`stepSentence`, plus the voice-preview sample in `js/main.js`) waits this many ms first, guarded by the `ttsGen` counter — on Android/Chrome an immediate `speak()` can overlap the just-cancelled utterance's audio tail, heard as the same voice playing twice a few ms apart; the `speakSegment`→`onend`→`speakSegment` chain inside `speakCurrentSentence()` is unaffected (no `cancel()` between those `speak()` calls, nothing to delay). `setUtteranceVoice(u, lang, voice)`: sets `u.lang` from the ACTUALLY SELECTED voice's own `.lang` (falling back to the given canonical `lang` only when no voice was resolved) instead of setting `u.lang`/`u.voice` independently — a mismatch between them (our canonical `'fr-FR'` vs. a real chosen voice's own `'fr-CA'`, say) is a separate, documented cause of the same "doubled voice" symptom on Android, and — unlike the cancel()-timing issue above — affects `speakCurrentSentence()`'s segment chain too, since it has nothing to do with `cancel()` timing. Used at all three real speak sites and the voice-preview sample. |
| `selection.js` | Caret/range geometry (`caretRangeAt`/`paragraphRangeAt`/`sentenceRangeAt`/`wrapRangeInSpans`), PDF text-layer span handling (`pdfTextSpans`/`pdfVisualGroup`/`buildSentenceRangesFromSpans`; the column-clustering itself lives in the shared `pdfComputeColumns`, called by `pdfVisualGroup` — one column around a tapped span, `pdfPartitionColumns` — EVERY column, and `resolveCanonicalPdfSelection` — canonical selection resolver for both single-column and multi-column drags; `pdfRangeText`/`pdfRangeSpans` turn an arbitrary drag Range into plain text/its intersected spans, since a bare `Range.toString()` over a PDF text layer has NO separator between items at all — unlike the sentence/tap paths above, which already special-case this), word/drag selection (`selectWordAtPoint`, `wordBoundsAt`/`rangeBetweenWords`), and the main tap/click listener that dispatches to translation. `resolveCanonicalPdfSelection(range, options)` produces a canonical structured object (`{ text, grammarText, sourceLanguage, targetLanguage, isCrossColumn, columns, studyColumnIndex, spans, range, rect, sourceType }`) consumed identically across Grammar, Practice, Quick Wheel, and Translation: for drags within the SAME visual column of a multi-column page, interleaved DOM spans from foreign columns are excluded, `range._pdfPieces` isolates the visual column for highlighting without DOM tree mutation, and `grammarText`/`cleanText` are pure single-column; for cross-column drags, combined text is retained for translation while the active study language (`pageLang()`) is isolated into `canonical.grammarText`/`state.lastGrammarSourceText`. `selectWordAtPoint`'s "already-highlighted word tapped again" fast path (for `.word-visited`, which is permanent — never removed when the popup closes) runs the same `isPointInRects()` distance check a fresh word gets, so a blank-space tap that merely resolves NEAREST to a previously-selected word (via `pdfNearestSpan`'s unbounded search) doesn't silently reactivate it — see `tests/pdf_hitbox_stateless_browser.py`. `anchorCaret()` re-finds `state.lastWordNode`'s first text descendant via `TreeWalker` rather than checking `firstChild` directly — required once the translation popup's "select" button can nest a `span.sel-word` highlight inside the pre-existing `span.word-visited` (see `tests/pdf_sentence_reselect_browser.py`). `pdfVisualGroup()`'s column detection clusters in two stages — Y-bands (which can span BOTH columns of a row-aligned bilingual layout) first, then within each band a right-edge-to-next-left-edge gap cuts it into per-column "segments" — because a same-line style break (an inline bold marker word, e.g. "Premièrement,"/"First,") creates a separate PDF text fragment whose own left edge is meaningless for column membership; only clustering by segment START-X (not every fragment's) keeps such fragments correctly attached to their real column (see `tests/pdf_bilingual_columns_browser.py`). `isExerciseBlankContinuation(left, right)` lets `pdfVisualGroup` bridge a fill-in-the-blank gap wider than the column threshold ONLY when the left fragment ends with an `isFrenchExerciseCue` parenthetical (or an explicit `____`/`....`/`…` blank) and the right one is not the next item marker — vocabulary tags `(m.)`, English glosses, wrapped numbered lists and two-column exercises stay separate columns. `buildSentenceRangesFromSpans` puts a separator between PDF text items EXCEPT when the next item merely continues the previous one's glyph run on the same line (`pdfSpansContinueWord`: gap ≤ 0.12× glyph height) — real PDFs split one word into several items (a detached first letter `a`+`ppliquer`, small-caps headings `Pr`,`ÉP`,`ar`,`E`,`r`), which used to reach Grammar/translation as `a ppliquer` / `Pr ÉP ar E r`; a word space, a bullet, another line or column still separates. |
| `learning-stats.js` | Compact current-page reading/vocabulary statistics: Unicode word segmentation, current-page visibility filtering, and the single `recordHelpForSpan` write path used by word taps, translated phrases/sentences/paragraphs, and Ask/Grammar help. A selected DOM/PDF span is mapped to stable page-scoped word-occurrence IDs; repeated and overlapping help is deduplicated by occurrence (never by spelling), persisted per book, and filtered back to the live page after navigation/reflow. It also owns conservative cached EN/FR CEFR lookup with an explicit unclassified bucket and the toolbar popover renderer. No network/AI request is made for statistics. `tokenIsOnCurrentPage()` decides "is this occurrence on the current page" via `pageIndexForRange()` (`js/tts.js`) — the SAME computed column index TTS auto-page-turn already trusts — compared against `state.pageInChapter`, NOT by testing each candidate's `getClientRects()` against `els.container`'s live `getBoundingClientRect()`; the latter is a genuinely observed, transient viewport snapshot, so both the page's total word count and which specific taps got attributed to it used to depend on incidental container/scroll geometry at the exact instant each check ran, rather than on the stable page-within-chapter identity the reader itself already tracks (see `tests/learning_stats_position_independence_browser.py`). |
| `navigation.js` | CSS-column pagination (`columnStep`/`paginateContainer`/`goToPageInChapter`), the bookmark (`saveBookmark`/`loadBookmark`), `goNext`/`goPrev`, touch/wheel page-turn gestures, the mixed-format `#reader-container` resize handler, and `buildToc` (shared by all three format loaders, folded in during Step 10). The resize handler is a `ResizeObserver` on `els.container` (`containerResizeObserver`), not a `window` `'resize'` listener: `#reader-pages` uses `height:100%`, so the browser's own CSS column layout silently re-flows whenever the CONTAINER's rendered box changes size — and several real triggers (immersive-mode toggle, a collapsing sidebar, a mobile browser's dynamic address bar) change that box through CSS classes alone, with no `window` `'resize'` event at all. `state.pageInChapter`/`totalPagesInChapter` used to silently desync from the actually-rendered column layout whenever that happened (documented in HANDOFF.md; fixed — see `tests/reader_resize_sync_browser.py`). `ResizeObserver` is a strict superset of the old trigger for this layout: a `window` resize that changes the container still fires it; one that doesn't (width growth past `#reader-container`'s 900px `max-width`) correctly repaginates nothing. A sub-pixel `lastContainerResizeSize` threshold guard and the pre-existing 250ms `resizeTimer` debounce (kept, same name — `tests/migration_audit_browser.py` references it directly) absorb the many intermediate box-size notifications a single CSS transition (`.workspace`'s `margin-top`/`height`, 0.3s) fires. The actual resync logic (`repaginateBook()`: capture `state.bookTextOffset`, re-measure, re-resolve that same offset to a page via `pageForBookTextOffset()`) was already correct and untouched — only the trigger was unreliable. Reading stats stay correct across a resize because they're keyed by an absolute chapter-text occurrence id (`learning-stats.js`), not by page; a page's word *composition* is allowed to change when reflow moves the page boundaries, but no existing help record is lost. `tests/pdf_ux_browser.py`'s pinch setup toggles `immersive-mode` directly (bypassing the app's own `openBookFile` flow) and now correctly triggers this resize response — the test waits for the resulting debounced render to settle before its render-counting checks begin, mirroring `tests/pdf_sentence_reselect_browser.py`'s existing pattern for the same reason. |
| `pdf-zoom-pan.js` | PDF mouse/touch zoom and pan: wheel+Ctrl zoom, pinch-to-zoom, drag-to-pan, `setPdfScale`/`applyPdfZoom`/`rerenderPdfAtCurrentZoom`, the `pdfPointers` gesture-owning Map, the `pdfBlockClick` click-suppressor, `#pdf-fit`'s handler. |
| `ui-tooltip.js` | The translation tooltip's position/lifecycle (`positionTooltip`/`repositionTooltip`/`scheduleTooltipHide`), the footer submenu (`openFooterMenu`/`closeFooterMenu`) kept *with* the tooltip rather than in `navigation.js` (see "Resolved plan deviations"), and the key-settings modal (`openKeySettings`/`closeKeySettings`/`saveApiKey`). |
| `translation.js` | Word/selection → translation: alignment highlighting (`validateAlignment`/`installAlignment`/`flashAlignment`), the core `handleWordOrSelection` tap handler, on-device translation via Chrome's Translator API (`translateLocally`, and `warmLocalTranslator` — proactively starts the language-pack download while online, from `lang-detect.js`'s `updateSourceLang()` and the target-language `<select>`'s change handler in `main.js`, so the pack is actually ready by the time the device goes offline; silent, unlike `translateLocally`'s own download which updates `els.progress` — see the file's own comment on `getLocalTranslator`'s `showProgress` parameter), English phrasal-verb detection (`detectPhrasalVerb`), and translating inside the AI panels (`translatePanelPoint`). |
| `grammar-svo.js` | The Grammar/Ask AI panels: `startAiTask` (Ask/Language-level still stream free text through `safeHtml`; `mode==='grammar'` early-dispatches to `runGrammarAnalysis`), SVO sentence-part analysis (`analyzeSVO`/`applySVOParts`), and the **contextual Verbs/Adjectives Grammar panel**. One structured-JSON AI call (`buildGrammarAnalysisPrompt`, task `grammar_analysis`) detects verbs AND adjectives together. The prompt is an explicit contract: the source language is stated by name AND code and must be echoed back as `language`; the analysed text is embedded as an escaped JSON string (quoted text cannot break out of its slot); every language-specific instruction comes from `GRAMMAR_LANG_CONFIG[lang].verb/adjective.promptNote`. `normalizeGrammarAnalysis(raw, lang, text, focusText)` is the single validation gate and returns `{language, items, ok, error, rejected, adjusted}`: `ok:false` + `error` (`malformed_json`, `missing_items`, `language_mismatch`, `unsupported_language`) means the RESPONSE was unusable — the caller shows a retryable `aiInvalidResponse` error and never caches it, distinct from `ok:true, items:[]` (a genuine "no verbs/adjectives"); `rejected` lists every dropped item with its reason and `adjusted` every field-level repair. Per item it enforces an EXACT OCCURRENCE — `surface` must be a whole-word occurrence (`findSurfaceOccurrences`, so "est" is never found inside "reste"), `sentence` must be a literal slice of the analysed text containing it, `occurrence` picks the nth match, and the kept `sentence`/`start`/`end` are slices of the SOURCE text, never the model's paraphrase — then rejects unsupported POS, a second claim on the same occurrence (one occurrence = one POS: `pos_conflict`), duplicates and lemmas past `grammarItemBudget` (now enforced), a verb lemma that is not an infinitive (`verb.lemmaRe`) and a lemma in another script than its surface. Features/forms/stem splits go through the language config: an irrelevant feature is stripped, and a `stemBreakdown` is kept only for a single-word regular form whose ending is a real ending of the language (`verb.endings`) and whose stem matches the lemma (`verb.irregularRe` forces null for irregular verbs, so there is no fake split for être/aller/venir…). `sanitizeGrammarForms` (shared with Practice) verifies a returned conjugation/agreement grid actually CONTAINS the analysed form (`verifyForms`; otherwise it is discarded), repairs a non-base adjective lemma from the grid's base cell, accepts a before-vowel slot only for the five real cases (`adjective.specialForms`: beau→bel, nouveau→nouvel, vieux→vieil, fou→fol, mou→mol) and derives each derived form's transformation from the grid (`petit`→`+e`, `heureux`→`−x +se`, flagged `irregularForms` when it departs from the regular French rules). `agreesWith` (noun an adjective modifies / subject of a verb) is kept only if it literally occurs in the sentence. The item for the tapped word is flagged `tapped` (overlap, so the compound group "a mangé" is flagged for a tap on "mangé") and sorted first. Sentence context: `runGrammarAnalysis` NFC/whitespace-normalises both the tapped text and its sentence before checking containment; when the supplied sentence does NOT contain the tapped text (selection.js can leave `state.lastWordNode` on the whole block, making `sentenceRangeAt` answer with the block's first sentence) `recoverSentenceFromTapPoint` re-derives it from the real caret at `state.lastTapPoint` (never touching PDF text layers), and Retry re-sends the already-resolved sentence, so a later tap cannot swap the context under it. The language of a tapped fragment inside a bilingual sentence comes from `fragmentLangInContext`. The result is cached (`grammarAnalysisCache`, bounded FIFO, keyed by book+source language+explanation language+text), so switching Verbs↔Adjectives (`switchGrammarMode`) or re-tapping the same passage never re-sends the source. `renderGrammarPanel` groups occurrences by lemma into cards; `focusGrammarItem(item, lang)` renders one occurrence's detail (badges, stem+ending only when validated, the agreement target, the paradigm/agreement grid with the row(s) matching THIS form highlighted and each derived form's transformation chip, the sentence with the exact occurrence — and its agreement target — highlighted by offset, "why this form") and is the SHARED entry point Practice calls when a highlighted word is clicked; its signature is `focusGrammarItem(item, lang, {reveal})`. After every analysis (fresh or cached) `presentGrammarAnalysis` opens the learner's OWN tapped occurrence — in the mode of ITS part of speech, so a tapped adjective never lands on a Verbs list that does not contain it — via `focusGrammarItem(item, lang, {reveal:false})` (the drawer stays closed until the learner opens it); when the tapped word maps to several items it only sets the mode (no guessed focus), and a sentence/paragraph selection has no tapped word so it just lists cards. `focusGrammarItem` always clears the lit tense chip (a chip belongs to the focus it was pressed on) and renders the lemma cards only when the item belongs to the CURRENT analysis — a Practice occurrence comes from the model's own passage, so the book selection's cards are not shown above it. Compound-tense chips are labelled from the optional per-language `verb.featureLabels` (French `auxiliaire: être` / `participe: allé`, English `auxiliary: has`). Tense/mood controls come from `GRAMMAR_LANG_CONFIG[lang].verb.tenses` and are cleared in Adjectives mode; `selectGrammarTense`→`fetchVerbParadigm` does a small cached per-lemma+tense lookup (task `grammar_paradigm`). Everything AI-supplied is inserted via `createElement`/`textContent` — never `innerHTML`. Stale protection: `beginAsyncTask('grammar')` plus a post-`await` `task.current()` check (deliberately tested with a mock that ignores the abort signal); a new request — INCLUDING one answered from the cache — cancels every in-flight `grammar`/`grammarParadigm` task, `focusGrammarItem`/`switchGrammarMode` cancel a pending conjugation lookup, and `fetchVerbParadigm` drops a reply whose verb is no longer focused. Switching mode clears a focused occurrence of the other part of speech. `resetGrammarState()` (called by `openBookFile`) clears analysis, focus and cache on book change. |
| `ai-client.js` | `callAI`/`callAIVision`, explicit OpenAI/Groq/Gemini selection for text and vision (no provider fallback), independent BYOK credentials, request cancellation, safe localized errors, `aiAvailable`, `sanitizeAI`, and `machineTranslate`/`aiTranslateText`. OpenAI uses the Responses endpoint. Every provider layer classifies its own envelope into a typed `AiRequestError` (`reason`: `network`, `timeout`, `http`, `envelope_invalid`, `empty_reply`, `blocked`, `provider_error`, `truncated`) — a reply cut off by the token cap (OpenAI `status:'incomplete'`/`max_output_tokens`, Gemini `MAX_TOKENS`, Groq `finish_reason:'length'`) is `truncated` and KEEPS its partial text on `err.partial`; `callAI(prompt, signal, task, onChunk, {maxOutputTokens, timeoutMs, meta})` reports provider/model/finish/usage through `meta`. A bounded in-memory diagnostics ring (`recordAiDiagnostic`/`readerAiDiagnostics()`, never a prompt or key) feeds the developer panel shown only with `?aiDebug=1` / `localStorage.reader_ai_debug='1'`; the learner always sees one short retryable message. See *The live-model AI contract* below. Does **not** contain `startAiTask` (see `grammar-svo.js`). |
| `dictation.js` | Speech-to-text for the Ask panel: `updateDictationUI`, `stopDictation` (finalizes interim text exactly once), `startDictationSession` (bounded auto-restart), `toggleDictation`. |
| `pdf-ink.js` | Writing over the PDF page: the canvas layer and per-page relative-coordinate stroke storage (`inkStrokes`/`saveInk`/`loadInk`/`redrawInk`), drawing/erasing input, pen tool controls. |
| `pdf-crop.js` | Page-region selection and crop: `exitRegionMode`/`cropPdfRegion`, the crop preview dialog (Save PNG/Share/Copy PNG), and `checkExerciseImage` (calls `ai-client.js`'s vision API, kept here since it's only ever invoked from the crop flow). |
| `pdf-render.js` | `initPdf` (opens a PDF.js document), `renderPdfPage` (canvas + text layer + ink layer render with epoch/render tokens against stale async responses), and the page scrubber. |
| `formats.js` | Book format loaders: `runArchiveGuard` (Worker-based ZIP-bomb/zip-slip check before JSZip/Mammoth ever see an EPUB/DOCX), `initEpub`/`initRichDoc` (Mammoth)/`initTxt`, `fb2ToHtml`, `rtfToHtml`. `initRichDoc`'s HTML/HTM branch parses the uploaded file with `DOMParser` and keeps only `.body.innerHTML` — a real-world `.html` upload is very often a FULL saved page (`<html><head><title>...` etc.), not a bare fragment, mirroring how `loadEpubChapter` already extracts just `.body.innerHTML` from real XHTML spine documents, and for the identical reason: passing the raw file text straight into `safeHtml()` left `<title>` (in neither `safeHtml`'s allowed `tags` nor its `drop` set, so it fell into the "not content, walk its children" branch) as silently-kept visible text ahead of the real content — see `tests/rich_text_formats_browser.py`. `splitIntoChapters` only starts a new chapter at a heading if some non-whitespace content has already accumulated (a lone `"\n"` text node between `<body>` and its first `<h1>` — common in hand-formatted/exported HTML — used to close out a spurious near-empty first "chapter" the reader then opened on). `initTxt` now throws `emptyDoc` for a blank file, matching every other format's guard (an empty `.txt` used to silently "succeed" into a blank single-page reader instead of the same clear error). |
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
- **Installed PWA shortcut opened a dead address** (user-reported). `manifest.webmanifest`'s
  `start_url` was `"./index.html"`, resolved against the manifest's own URL to
  `https://ai-ebook-reader.pages.dev/index.html` — exactly the URL Chrome bakes into the
  shortcut (`Page.getAppManifest` confirmed this with zero installability errors, so Chrome
  installs it without complaint). Cloudflare Pages 308-redirects any literal `/index.html`
  request to `/` (a platform default for files named `index.html`, not something this repo
  configures — confirmed via `curl -I`, no `_redirects`/`_headers` file exists here). Once the
  service worker took over navigation (i.e. on every launch after the very first), Chrome
  refuses to use a Response whose own `.redirected` flag is `true` to satisfy a navigation's
  `respondWith()` and fails the ENTIRE navigation with `net::ERR_FAILED` / "this page may have
  moved to a new address" — not a JS exception (`networkFirstForNavigation()` resolved cleanly
  with a normal 200 Response), a browser-level rule with no console error to point at it.
  Reproduced deterministically (see `tests/pwa_start_url_browser.py`'s own from-scratch local
  server, built specifically to mimic Cloudflare's one relevant redirect) both for a live
  network fetch (`event.request.redirect` is forced to `'manual'` for navigations, so a
  redirecting target resolves to an `opaqueredirect` Response) and — the actual persistent
  cause — the CACHED copy of `./index.html`, since `cache.addAll()` followed that same
  redirect at install time and Cache Storage preserves `redirected:true` on it forever. Fixed
  in two parts: `manifest.webmanifest`'s `start_url` is now `"./"` (Cloudflare never redirects
  that, so no future install ever enters this state; `id` stayed `"/"` so Chrome treats this as
  an update to the same installed app, not a new one), and `sw.js`'s
  `networkFirstForNavigation()` now reconstructs a plain, history-free Response
  (`stripRedirectHistory()`) before ever calling `respondWith()`. The second half is what lets
  an ALREADY-installed shortcut — still permanently pointed at the old `/index.html` — heal
  itself the moment the updated worker activates, online or offline, with no reinstall.

## Test coverage map

| Suite | Covers |
|---|---|
| `tests/pdf_ux_browser.py` | PDF-specific UX: zoom/pinch/pan, the ink layer, crop, the page scrubber, background-cancellation of in-flight PDF work. Its setup toggles `pdf-mode`/`immersive-mode` directly (not through `openBookFile`), which now correctly resizes `#reader-container` and triggers `navigation.js`'s `containerResizeObserver` — the test waits for that debounced render to settle (`__pendingRenders===0` for 400ms) before any render-counting check begins, the same pattern `tests/pdf_sentence_reselect_browser.py` already used for the same reason. |
| `tests/learning_ux_browser.py` | Translation/alignment, grammar/SVO analysis, dictation, onboarding cues — the non-PDF "learning" features. |
| `tests/learning_stats_languages_grammar_browser.py` | Current-page occurrence statistics and persistence isolation, including the fixed 100-word A–K coverage matrix (single/repeat taps, paragraph and overlapping spans, full coverage, mixed help, page leave/return), diagnostics, tokenizer/OCR/chrome exclusions, centralized selection and delayed Ask/Grammar routing, CEFR unknown handling, compact stats UI, language registry/detection/TTS/offline fallbacks, grammar-rule prompt contracts for French/English, and real Grammar/Ask panel response rendering. Its own A–K matrix uses a synthetic PDF-shaped stub, where `tokenIsOnCurrentPage()` always short-circuits true — it cannot exercise the reflow-format viewport-check path below. |
| `tests/learning_stats_position_independence_browser.py` | `learning-stats.js`'s `tokenIsOnCurrentPage()` fix (user-reported: statistics appeared to "reset" toward 100% independent after tapping words near a page's end and returning to its beginning) — audited and confirmed genuinely position-dependent logic for reflowable formats (PDF already always returned true). Uses a REAL multi-page markdown document with actual CSS-column pagination (`goToPageInChapter`), unlike the sibling suite's PDF-shaped stub. The definitive, isolated check freezes the actual rendered layout (`els.pages` keeps its real measured height) and shrinks only `els.container`'s reported rect — proving the total is unaffected when nothing about the real layout changed, and confirming (by temporarily reinstalling the old viewport-based implementation) that this specific manipulation is what the old code got wrong. Also covers the user's exact required reproduction (bottom/middle/top taps, scroll-to-bottom/top, navigate away and back, random vs. sequential tap order, 10 random-position taps with repeated scrolling, word taps combined with a paragraph translation, and out-of-order paragraph selection) — all against one persistent occurrence set. A SEPARATE, deeper, pre-existing issue was found during this audit and deliberately left untouched at the time (outside "page statistics logic"): `#reader-pages { height: 100% }` means the browser's own CSS column layout silently re-flows across columns whenever the container resizes (e.g. an immersive-mode toggle), independent of `state.pageInChapter`/`totalPagesInChapter` — a pagination/resize-sync issue, not a stats-computation one. Fixed separately — see `tests/reader_resize_sync_browser.py` and the `navigation.js` row above. |
| `tests/reader_resize_sync_browser.py` | The pagination/resize-sync bug flagged (and deliberately left unfixed) by the suite above: `navigation.js`'s `ResizeObserver`-based resize handler (`containerResizeObserver`), replacing the old `window` `'resize'`-only trigger. First proves the bug is real by disconnecting the observer (`containerResizeObserver.unobserve`) and showing an immersive-mode-toggle container resize goes completely undetected — zero `repaginateBook()` calls despite a real, measured height change — then reconnects it and shows the identical resize is correctly detected and resynced. Covers the full required matrix on a real multi-page markdown document with mixed paragraph lengths: viewport resize wider→narrower and narrower→wider, immersive-mode toggle on the first/middle/last page, repeated rapid toggling (debounce collapses the burst to one resync, not zero and not one-per-frame), an active word highlight (the `.word-visited` span and its text survive), previously-recorded help/translation occurrences (the specific occurrence records survive with their `normalized` word intact — the page-level `total`/`helped` AGGREGATE is explicitly allowed to change, since reflow can genuinely move words to a different page), and TTS staying active with a valid queue through a mid-read resize. Every scenario also asserts `state.pageInChapter` stays in-range and that `state.bookTextOffset` still resolves (via `pageForBookTextOffset`) back to the page actually shown, i.e. no silent drift between the logical reading position and what's on screen. |
| `tests/migration_audit_browser.py` | Cross-cutting correctness that the other two suites don't reach: classic script execution order, cold/hard reload behavior, sanitization, async task cancellation/epoch handling, AI provider fallback, real PDF cold-start rendering and multi-column sentence extraction, offline shell completeness, and genuine service-worker/offline behavior (the only suite that does **not** bypass the service worker). |
| `tests/pwa_start_url_browser.py` | The "installed PWA shortcut opens a dead address" bug (see "Known incidents"). Runs its OWN tiny local server (not the shared one on 8765, which doesn't redirect anything) that serves this repo's real files plus the one Cloudflare Pages behavior the bug depends on (a 308 for literal `/index.html` requests to `/`), so it exercises the actual shipped `manifest.webmanifest` and `sw.js`, not a stand-in. Traces the full chain via `Page.getAppManifest` (manifest → resolved `start_url`/`scope`/`id` → Chrome's own computed installable manifest, zero installability errors) and asserts the URL Chrome would bake into a NEW shortcut resolves with zero redirects. Separately proves an ALREADY-installed shortcut — still pointed at the old `/index.html` — self-heals under the fixed worker with no reinstall, online and offline, while the new `/` start_url keeps working too (no regression). Confirmed (by reverting `sw.js`/`manifest.webmanifest` locally and re-running) that the manifest check fails first without the fix. |
| `tests/rich_text_formats_browser.py` | A format compatibility audit found DOCX/TXT/HTML/HTM/RTF had ZERO automated coverage (only FB2/FB2.ZIP/EPUB/Markdown were covered by `tests/formats_browser.py`, PDF by the `pdf_*_browser.py` suites) — this suite closes that gap. Covers import/render/content (headings, bold/italic, links, embedded images, Ukrainian/Polish/mixed-language text, punctuation/quotes/apostrophes), TTS extraction order, reopen/persistence, a representative phone/tablet/portrait/landscape/immersive-mode viewport matrix (DOCX only — the shared pagination pipeline is already viewport-tested via EPUB/FB2/Markdown elsewhere), and error handling (empty/corrupted/extension-mismatched/unsupported files) across all four formats. Found and fixed two real bugs while writing it — see `formats.js`'s and `core.js`'s rows above (HTML `<title>` leak + the spurious blank-first-chapter it caused via `splitIntoChapters`) — plus a consistency fix (`initTxt` empty-file guard). DOCX fixtures are minimal hand-built OOXML (no `python-docx` available; matches this project's existing in-memory EPUB/FB2.ZIP fixture convention) — building one surfaced that mammoth.js's image reader needs a `wp:docPr` sibling of `pic:blipFill` (throws `Cannot read properties of undefined (reading 'attributes')` otherwise, a fixture-authoring pitfall worth remembering, not an app bug). |
| `tests/grammar_redesign_browser.py` | The contextual Grammar/Practice redesign: `GRAMMAR_LANG_CONFIG` for all 8 languages (labels in the source language's own terms; verb/adjective features that exist only where linguistically meaningful — e.g. English has no adjective gender, Chinese no person paradigm); `normalizeGrammarAnalysis` rejecting fabricated/duplicate/wrong-POS items; Verbs↔Adjectives switching, localized labels, tense controls shown only in Verbs mode; analysis-cache reuse (mode switch and identical re-analysis make ZERO AI calls); empty Verb/Adjective states; stale-response protection with a mock that ignores the abort signal; Practice reading validation and rendering; NO quiz/answer UI; and a highlighted-target click focusing Grammar on that exact occurrence with zero extra AI calls. |
| `tests/grammar_french_browser.py` | French-first (then English) acceptance of the Grammar/Practice engine with hand-authored GOLD model replies (no live AI in CI): every correct French verb detail (compound `a mangé`/`sont allés`, regular `-er`/`-ir`, irregular `rire`/`falloir`/`venir`, subjonctif, impératif) and adjective detail (regular, `heureux`→`heureuse`, `beau`→`belle`/`bel`, invariable `rouge`, agreement targets, derived transformations) survives the real gate, and each way a model goes wrong is rejected (substring-only match, invented/paraphrased sentence, wrong occurrence, finite form as lemma, foreign-script lemma, wrong POS, one occurrence as verb+adjective, budget overrun, fake stem splits, grids not containing the form, fake `bel`, malformed/wrong-language/unsupported-language replies). Also the injection-safe prompt contract; a REAL mouse tap → tooltip AI button → Grammar with the tapped word's own sentence (plus recovery when `lastWordNode` degrades, NFC/whitespace, Retry after a later tap); Verbs↔Adjectives switching with zero extra AI calls and cache reuse; stale-response races (slow reply vs cache hit, late conjugation table after re-focus); and Practice (whole-word targets, exact occurrence offsets, wrong language/POS rejected, click → exact Grammar occurrence with zero AI calls, no quiz controls). Also the tapped occurrence opening in its own part-of-speech mode (adjective tap → Adjectives), a tense chip not staying lit over another word, a Practice focus not showing the book selection's cards, and labelled compound-tense chips. |
| `tests/ai_contract_browser.py` (+ `tests/ai_contract_fixtures.py`, `tests/live_responses/`) | The REAL-model contract: only `fetch` is stubbed (documented OpenAI Responses / Gemini / Groq envelopes), so the real `callAI` → envelope classification → `parseAiJson` → `normalizeGrammarAnalysis` → panel path runs. Provider envelopes per failure class; JSON extraction (fences, prose, trailing commas, unescaped inner quotes, array root); schema tolerance vs genuine rejection (wrong language, finite lemma, bad occurrence, invented sentence, wrong POS, duplicates); a property test cutting a reply at EVERY character position (never crashes, never an unflagged cut, monotonic salvage); selection sizes A–E (one word … 70 sentences) incl. an over-large selection; diagnostics + developer panel (no prompt, no key); Practice; replay of every captured live reply in `tests/live_responses/*.json`; and SECTION 9, the reported HVAC page as a real PDF tapped through the real tooltip. The fixtures are hand-built to deviate as real models do — they are NOT a capture of a failing live reply (see the fixtures' docstring); use `tools/live_ai_probe.py` (BYOK env vars) for a real-provider run. |
| `tests/app_shell_versions.py` | Fails CI if `index.html`'s script query-string versions and `sw.js`'s `APP_SHELL` entries have drifted apart — see "Content-hash versioning" below. |
| `tests/language_paren_browser.py` | `lang-detect.js`'s parenthetical-translation-pair detection (`bonjour (hello)`, `hello (bonjour)`, nested parens) plus flat (non-parenthetical) mixed-language regression cases, so the paren-aware split can't silently break the plain sentence path. Also French fill-in-the-blank cues (`Ils (plaindre)…`) resolving to French through `fragmentLangInContext`/`grammarSourceLanguageFor`, English glosses ending `-er/-re/-ir` (`father`, `water`, `teacher`) staying English, and the `isFrenchExerciseCue` predicate table. |
| `tests/language_context_browser.py` | `lang-detect.js`'s context-aware clustering for local EN/FR phrases with **no** parentheses (`The French word maison means house.`, `Il est très important to pronounce it correctly.`), the test-only `debugLanguageSegments` inspection (token scores/tiers, segment boundaries, chosen TTS locale), a mixed EN/FR TTS voice-selection smoke test, and a guard that parenthesis segmentation stays unaffected. |
| `tests/ask_ai_language_browser.py` | "Запитай AI" → "Мовний розбір" (`grammar-svo.js`'s `buildLanguageLevelPrompt`, via `lang-detect.js`'s `fragmentLangInContext`): the tapped/selected fragment's own language must drive the A2/B1 simplification language, not the language of a nearby inline translation (a bilingual sentence's translation is often longer than the original, so whole-context "majority characters" detection picked the wrong side). Covers the prompt builder directly and the real tap → button → AI-call wiring. |
| `tests/local_translator_warmup_browser.py` | `translation.js`'s `warmLocalTranslator`: a silent background download of Chrome's on-device Translator language pack, triggered from `updateSourceLang()` and the target-language change handler, must not touch `els.progress` (also "page X of Y"), while a real foreground `translateLocally()` call still shows its download percentage there; warm-up is skipped offline or for a same-language "pair", and repeated calls for the same pair only start one download. The real Translator API is mocked. |
| `tests/tts_double_voice_browser.py` | `tts.js`'s `TTS_CANCEL_SPEAK_DELAY_MS` fix for the "same voice plays twice, milliseconds apart" bug (user-reported, most noticeable in French): `speakText`/`speakInLang`/`stepSentence` (and `js/main.js`'s voice-preview sample) used to call `speechSynthesis.speak()` immediately after `.cancel()` in the same tick, which on Android/Chrome can let the just-cancelled utterance's audio tail overlap the new one. Asserts `speak()` never fires synchronously with `cancel()`, fires exactly once after the delay, and — the actual regression guard — a second call before the delay elapses (rapid tap, fast double-step) discards the first scheduled `speak()` via the `ttsGen` guard instead of also firing it, so two utterances are never in flight together. `speechSynthesis` is mocked via `Object.defineProperty` (it's natively read-only, so a plain `window.speechSynthesis = ...` silently no-ops). |
| `tests/tts_lang_voice_mismatch_browser.py` | `tts.js`'s `setUtteranceVoice()` fix — a SEPARATE cause of the same "doubled/echoed voice" report, additional to the cancel()-timing fix above (which alone didn't fully resolve it, since this one also happens with no `cancel()` involved, e.g. the plain continuous-reading segment chain). Every real speak site used to set `utterance.lang` from our own hardcoded canonical string (`LANG_TAGS`/`voiceForLangCode`'s `fullLang`) while setting `utterance.voice` independently from whatever `pickBestVoice`/the user's saved choice resolved to — and that voice's own `.lang` can differ (voice selection only matches a 2-letter prefix, so a device's best French voice might genuinely be `fr-CA`, not `fr-FR`). A mismatched `lang`/`voice` pair on an utterance is a documented way to confuse Android's bridge to the system TTS engine into satisfying both signals at once, which can play the utterance twice. Mocks two voices whose own `.lang` deliberately differs from the canonical mapping to prove `utterance.lang` always ends up matching `utterance.voice.lang` at all three real speak sites (`speakText`, `speakInLang`, `speakCurrentSentence`'s per-segment loop) plus the settings voice-preview sample, which already did this correctly and now shares the same helper. |
| `tests/pdf_sentence_reselect_browser.py` | `selection.js`'s `anchorCaret()` fix (user-reported: tapping a PDF sentence's FIRST word, then pressing the translation popup's "select" button twice in a row, selected the wrong text the second time). Root cause: the first "select" press wraps the just-selected text in a new `span.sel-word` (`showSelectionHighlight`/`wrapRangeInSpans`, PDF path) — when the tapped word IS the sentence's first word, that new span lands INSIDE the pre-existing `span.word-visited` around the tapped word, replacing its `firstChild` with an element instead of a text node, so `anchorCaret`'s old direct `firstChild` check silently fell back from the reliable word anchor to raw-coordinate hit-testing on the second press. Uses the real PDF.js-rendered two-column synthetic fixture (`pdf_bytes(two_columns=True)`, the same "original beside its translation" layout the user described) to assert the 2nd press still selects exactly the same sentence as the 1st, and that no press ever bleeds text across the column boundary. |
| `tests/pdf_bilingual_columns_browser.py` | `selection.js`'s `pdfVisualGroup()` fix for a REAL text-based bilingual-textbook PDF (user-reported and reproduced from a screenshot): a sentence in a row-aligned two-column layout (original left, its own-language translation right) with an inline bold marker word mid-sentence ("Premièrement,"/"First," — real "Firstly/Secondly/..." bilingual-book style) — selecting grabbed text from BOTH columns at once, and some words on the tapped column were read/detected with the OTHER column's language. Uses `bilingual_pdf_bytes()` (an actual Helvetica→Helvetica-Bold font change with runs shown continuously, no repositioning between them, so fragment gaps come out realistically small within a line and large across the true column gutter — not hand-picked offsets that could pass for the wrong reason) to assert a tap on either side of the bold-marker line reconstructs its OWN complete sentence with zero words dropped and zero bleed from the other column, and that each column's whole `pdfVisualGroup` contains only its own language. Also fill-in-the-blank exercise lines with the real page-221 geometry (complete sentence, not `Ils (plaindre) 4.`) plus negative controls that must stay separate columns: `(m.)` vocabulary rows, English glosses, a wrapped numbered list, two-column exercises. |
| `tests/bilingual_selection_browser.py` | A real drag across a bilingual verb table (both PDF content-stream orders): the fused-text bug reproduced and fixed end to end (request -> validation -> rendering, all 8 French verbs, never English), an all-English or all-French selection still resolves as itself, single-word tap unaffected (one focused occurrence), a sentence/paragraph with several verbs (unfocused, several items), a selection over the item budget (deterministic, bounded, a visible note), focusing an already-analysed card/Practice target (zero AI calls), and the translation popup's own (documented, unfixed) behaviour for the same drag. |
| `tests/pdf_hitbox_stateless_browser.py` | `selection.js`'s `selectWordAtPoint()` fix for a state-dependent PDF hitbox bug (user-reported): blank space near a word was correctly inert BEFORE that word was ever tapped, but after tapping it once (and even after closing its popup) the SAME blank spot — and a wide radius around it, since `pdfNearestSpan()` has no maximum search distance by design — reopened its translation popup, because the "already-highlighted word tapped again" fast path returned `.word-visited` matches with no distance check at all, unlike a fresh word (which always goes through `isPointInRects()`). Confirmed the asymmetry directly via `caretRangeAt()` before vs. after selecting the same word at the same blank point, and confirmed the fix by reverting it locally and re-running (one check fails without it). Uses `edge_words_pdf_bytes()` (one word hard against each page margin, one isolated lower on the page) and real touch dispatch (exercising the actual mobile tap path, including the popup's own document-level close listener) to check blank-space taps at several margins (5/10/20/40/300px) on left-edge, right-edge, and multiply-selected words, plus a direct `selectWordAtPoint()` call for the touchstart/pointerdown-level hit-test itself. |
| `tests/browser_cdp.py` | Not a test suite itself — the shared minimal CDP client (`CDP`) and synthetic-PDF fixtures (`pdf_bytes`, `bilingual_pdf_bytes`, `edge_words_pdf_bytes`) other suites import. Its WebSocket frame reader was rewritten during Step 6 to reassemble fragmented frames (see below); a genuine bug, not the same thing as the CI-only Chrome-startup flake below. |

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

## Floating quick actions

`js/quick-wheel.js` owns the right-side launcher, eleven-action continuous rotary
renderer, requestAnimationFrame gesture/inertia/snap and entrance/exit animations,
printing, keyboard/pointer interactions and UI cleanup. It loads before `main.js`
so its translated labels exist before `applyI18n()`, and before the PWA overlay
stack. Existing controls own every action. See `QUICK_WHEEL.md` for the complete
menu action map, interaction details and regression coverage.

## Bilingual PDF selections: keeping Grammar to the study language

A drag that deliberately spans BOTH a bilingual textbook's original-language column and its translation
(e.g. a French grammar page's parallel English gloss) used to make Grammar analyse almost nothing: a plain
DOM `Range.toString()` over a PDF text layer inserts NO separator between text items at all — unlike the
tap/sentence paths, which already got this fix earlier — so a multi-row table read back fused
("...having seenayant compris having understood..."); the whole-word validator then correctly rejected
every French form with a letter glued to its left, and only the very first item in the drag survived.

Fix, `js/selection.js`'s `pointerup` drag-commit handler:
1. `pdfRangeText(range)` — the SAME separator rule as `buildSentenceRangesFromSpans` (`pdfSpansContinueWord`:
   join only when the next item is a genuine continuation of the same word), now also applied to a raw
   drag range, which had never gone through it.
2. When the drag's own spans (`pdfRangeSpans`) partition into MORE THAN ONE geometric column
   (`pdfPartitionColumns`, sharing `pdfComputeColumns` with `pdfVisualGroup`), each column's own text is
   classified with the EXISTING `detectLang`; the column whose language matches the book's own persisted
   `pageLang()` becomes `state.lastGrammarSourceText` — a ONE-SHOT value, read and cleared by the very next
   `handleWordOrSelection` (`js/translation.js`), so it can never leak into a later, unrelated tap. This is
   geometry-based, not lexical: many of the real forms here ("ayant vu", "étant parti"...) carry no
   individual FR/EN dictionary signal of their own, which a purely lexical re-split of the flattened text
   would misjudge (verified: it would flip the WHOLE selection's detected language, not just fail to split
   it — see `tests/bilingual_selection_browser.py`'s design note).
3. `js/translation.js`'s `handleWordOrSelection` consumes that override for the Grammar button ONLY — the
   tooltip/translation always still show the full raw (properly spaced) selection unchanged. A single
   column (the overwhelming majority of selections, including every existing tap/sentence/paragraph path)
   leaves it unset: zero behaviour change there.

`js/grammar-svo.js` itself needed NO changes for this: once `contextText` arrives already isolated, its
existing budget/bounding/validation treats it exactly like any other selection.

**Known, deliberate limitation**: the translation popup for the SAME bilingual drag is not made
column-aware by this fix — it still translates the whole (now correctly spaced) selection as one
fragment, so a `"French phrase. English phrase."`-shaped combined translation is expected, not a bug this
fix claims to solve (`tests/bilingual_selection_browser.py` Section 8 documents this rather than hiding it
inside Grammar's own code). Also unstyled: an unpunctuated multi-row run (this page's table has none) can
still make a single-word tap's "own sentence" sweep an entire visual column — pre-existing, unrelated to
bilingual isolation, and already covered by `grammarProfile`'s size-aware budget (below).

**Item budget, deterministic behaviour when a selection has more verbs than the limit** (`normalizeGrammarAnalysis`):
lemmas are kept in the order the MODEL's own reply lists them, up to `grammarItemBudget(text)`; the first
`budget` distinct lemmas survive, the rest are rejected as `'over_budget'` — reproducible for a given model
reply, though not resorted by the lemmas' own position in the source text (a deliberate, lower-risk choice:
the validator's single-pass, order-preserving design is exercised by many existing tests). The learner is
told when this happened (`analysis.notice.budgetLimited`, the `grammarBudgetLimited` string, alongside the
existing `partial`/`trimmed` notices) — see `tests/bilingual_selection_browser.py` Section 6.

## Practice workspace

Practice is a **reading / examples surface, never an exercise**. `js/practice-session.js`
turns the verbs (or adjectives) the Grammar panel detected into NEW natural material in the language
being studied (`generatePracticeReading`, task `practice_reading`): per-lemma **example sentences** shown
in useful grammatical variety (persons/tenses/moods from `GRAMMAR_LANG_CONFIG` for verbs; gender/number/
case agreement with different nouns for adjectives — never tenses) plus a few **connected paragraphs**,
enough to read for several minutes. Strict JSON contract (the only one):
`{title, language, mode, sections:[{heading, kind:'examples'|'story', items:[{text, targets:[{surface, lemma,
occurrence, features, explanation, forms}]}]}]}` — each target lives on the sentence it is in, so an
occurrence is unambiguous by construction. `validatePracticeReading(data, expected)` flattens it to
`{title, language, mode, sections:[{heading,kind,start,end}], paragraphs[], targets[]}` (`paragraphIndex` is
the flat index, so the renderer and the click path are unchanged). It throws on structural problems (missing
title/language, HTML/script injection, >`MAX_SECTIONS`, fewer than `MIN_ITEMS` / `MIN_READING_CHARS` — the floor
against "Je parle. Tu parles." or a truncated reply — fewer than `MIN_TARGETS`, a reply that is mostly exercises,
or, when `expected` `{language, mode}` is given, a passage in the WRONG language) but silently DROPS a bad ITEM
(an exercise artifact — blank/underscores/`....`, `3.` numbering, a parenthesised French cue verb via the shared
`isFrenchExerciseCue`, or a one-line drill under 4 words; `practiceLooksLikeExercise`) or a bad TARGET (not a
whole-word occurrence in its sentence — `findSurfaceOccurrences`, `occurrence` picks the nth; wrong part of speech
for the session mode; a verb lemma that is not an infinitive; unsafe text; a duplicate). Each kept target stores its
exact `start`/`end`; forms grids go through the shared `sanitizeGrammarForms`. The prompt (`buildPracticeReadingPrompt`)
uses only the lemmas + the forms the learner met: **a selection that is itself a book exercise is never shown to the
model**, so it cannot be imitated. A session stores its `mode` and `lemmas` (Retry/Regenerate rebuild the SAME kind
of reading — `practiceContextFromSession`). Long structured replies get their own budget: `practice_reading` has an
8000-token OpenAI profile and a 150s per-task timeout (`AI_TASK_TIMEOUT_MS` / `aiTaskTimeout`, used by all three
providers; the default stays 45s). There are no exercises, hints, answer inputs, Check button, grading or pagination,
and **no renderer for the retired exercise worksheet exists**. Storage is versioned (`PRACTICE_SCHEMA_VERSION`): at
startup `purgeLegacyPracticeStorage()` removes every `practice_*` entry that is not a valid, unexpired session of the
current schema (the old worksheet's sessions used these very keys and `status:'ready'`), `loadPracticeSession` refuses
the same, and `displayPracticeSession` shows a retryable error — never partial legacy content — for any invalid session.
`js/practice-worksheet.js` renders it with `createElement`/`textContent` only: per section a quiet heading (the lemma),
then one `.practice-sentence` per example line or one `.practice-paragraph` per story paragraph; each target's own
occurrence (stored offset) is a `.practice-target` button (bold + accent underline, same size), and clicking it calls
`focusGrammarItem` (`grammar-svo.js`) with the exact sentence and offsets, data already in hand —
zero extra AI calls, and Practice stays on screen. The header reserves the 60px the floating menu handle covers.
The separate, non-persisted
`practiceWorkspaceMode` (`expanded`, `collapsed-bottom`, `bookmark`) is unchanged.
UI transitions keep the DOM mounted and inert while concealed; only explicit Close
ends the session. A bounded `.practice-scroll` preserves scrolling across those
transitions. The workspace measures the main reading area, visual viewport,
navigation and open Grammar/Ask panels, and updates on layout changes. Where drawers
leave insufficient room, expanding Practice docks them into their existing tabs
without clearing content; opening a drawer then collapses Practice. The bookmark is
attached outside Grammar's left edge and follows its drawer motion; phones reserve a
44px rail to avoid covering Grammar content. `tests/practice_workspace_browser.py`
covers geometry, retained session/scroll, async rendering and narrow layouts;
`tests/practice_browser.py` covers the reading schema, persistence, stale-response
races and the explicit absence of quiz UI; `tests/practice_reading_browser.py` is the user-facing
acceptance through the real UI (natural sentences, no blanks/hints/answers/grading, highlighted clickable
verb/adjective targets, exact occurrence incl. repeated forms with zero AI calls, Verbs/Adjectives isolation,
Regenerate keeping mode+lemmas, legacy-storage purge, a real service-worker activation, all three provider paths,
touch layout); the shared gold readings live in `tests/practice_fixtures.py`.

## The live-model AI contract (Grammar + Practice)

Structured tasks (`grammar_analysis`, `practice_reading`) were validated only against hand-written replies, so a real model's
reply that differed from the ideal was reported to the learner as a generic "invalid or incomplete" with no way to tell WHY.
Six different code paths threw that one message (five in the provider layer, one in Grammar's `!analysis.ok`); OpenAI's
`status:'incomplete'` (its `max_output_tokens` includes the hidden reasoning tokens) was among them and discarded a usable partial
reply. The contract is now layered, and each layer has ONE exact failure reason:

1. **Provider envelope** (`ai-client.js`) → `AiRequestError.reason` as listed in the `ai-client.js` row. Truncation keeps `partial`.
2. **JSON extraction** (`core.js` `parseAiJson`) → a string-aware scanner: fences, preamble/postscript, trailing commas, comments,
   unescaped inner quotes are repaired and reported in `notes`; a truncated reply is salvaged only at an array-element boundary
   (`truncated:true`); nothing else is guessed. A bare array root is rejected (`array_root`).
3. **Schema/semantics** (`grammar-svo.js` `normalizeGrammarAnalysis`) → unchanged in strictness: whole-word occurrence, literal
   sentence slice, infinitive lemma, POS/features via `GRAMMAR_LANG_CONFIG`, forms verification, duplicates, budget. Only HARMLESS
   deviations are normalised (extra fields ignored, `features` shape/case, sentence taken from the source when the model dropped its
   final punctuation, French `lemmaCase:'lower'` for a capitalised lemma). Every rejected item keeps its reason (`rejected`).
4. **Diagnostics** (`recordAiDiagnostic`) → one entry per attempt with a category: `ok`, `ok_recovered` (formatting repaired), `partial`
   (cut off, complete leading items kept), `no_valid_items`; for a failure `network`, `timeout`, `http`, `blocked`, `provider_error`,
   `envelope_invalid`, `empty_reply`, `truncated`, `json_extraction_failed`, `schema_failure`, `language_mismatch`,
   `unsupported_language`. Item-level rejections are counted per reason and per category (`invalid_pos`, `invalid_lemma`,
   `invalid_occurrence`, `invalid_sentence`, `invalid_paradigm`, `invalid_features`, `filtered` = duplicate/conflict/over budget) in
   `counts` (`GRAMMAR_REASON_CATEGORY`). Prompts and keys are never recorded; the full raw reply + analysed text is captured **only**
   with the developer switch.

**Selection size.** `grammarProfile(text)` derives the request from the text: whole sentences only, ≤1400 chars (`boundGrammarText(text, cap, focus)` — for a TAP inside a longer text the kept part is the one AROUND the tapped word: its sentence plus neighbouring whole sentences, or a word-aligned window when that one sentence is itself an over-long unpunctuated PDF run, so the tapped word is never cut out of what the model is asked about; `halveGrammarText(text, focus)` likewise keeps the half that holds it; a selection without a tapped word is still cut from its start);
an output budget scaled to the expected item count (OpenAI needs reasoning headroom: `max(2500, min(9000, 2200 + 260·expected))`
tokens); and a **lite** contract for long selections (`forms`/`stemBreakdown` always null) so a large selection cannot exhaust the
budget on paradigm grids. Small selections are not failed by fields meant for bigger analyses (extra fields are ignored). A cut-off
reply shows its complete leading items with a visible "partial analysis" note (never cached); a cut-off reply with nothing usable does
ONE bounded retry on the first half of the text; a trimmed selection says so (`grammarTrimmed`). None of it is silent.
A PDF's unpunctuated headings/bullets merge into one long "sentence", so a single word tap can legitimately request a multi-item
analysis — the budget must be sized from the analysed text, not from the tap.

**Capturing a real failure.** Open the app with `?aiDebug=1`, reproduce, press **Copy** in the developer panel under the error, save it
as `tests/live_responses/<name>.json` (shape in that folder's README): `tests/ai_contract_browser.py` section 8 then replays it through
the real parse → validate pipeline in CI. `tools/live_ai_probe.py` runs the whole French A–E/PDF/Practice acceptance against a real
provider with the user's own key (environment variables only; a throw-away Chrome profile) and writes replay-ready files for failures.

