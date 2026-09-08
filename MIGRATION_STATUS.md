# AI Ebook Reader — Migration Status

**MIGRATION STATUS: COMPLETE**

This file is now a **historical record** of the 19-step modularization migration (Steps
0–19), not an active task tracker. The repository is in **normal maintenance mode** — see
`AGENTS.md`/`CLAUDE.md`'s mode-check section and `ARCHITECTURE.md` (the current, actively
maintained map of the codebase) for how work proceeds from here.

`AUTONOMOUS_MIGRATION.md` must not be read or executed while this file states COMPLETE — its
own gate clause enforces the same rule independently. Do not resume, restart, or re-run any
migration step based on this file; it is kept, unedited except for this notice, as the audit
trail of how the codebase reached its current modular shape.

Current phase: **Modularization COMPLETE** — all 19 steps done, ARCHITECTURE.md written,
production verified. See "Migration complete" section below for the final summary.

Step 0 — Prepare mutable state containers: DONE
Step 1 — core.js: DONE
Step 2 — lang-detect.js: DONE
Step 3 — ai-client.js: DONE (startAiTask deferred to Step 8, see MODULARIZATION_PLAN.md)
Step 4 — selection.js: DONE (all genuinely selection.js content extracted; see recon below —
  what looked like 2 more ambiguous pieces turned out to be 100% navigation.js/pdf-zoom-pan.js
  content on closer reading, correctly left in place for Steps 9/11)
Step 5 — pdf-render.js: DONE
Step 6 — tts.js: DONE
Step 7 — translation.js: DONE
Step 8 — grammar-svo.js: DONE (carried startAiTask, deferred from Step 3)
Step 9 — navigation.js: DONE
Step 10 — formats.js: DONE (also folded buildToc into js/navigation.js)
Step 11 — pdf-zoom-pan.js: DONE
Step 12 — pdf-ink.js: DONE
Step 13 — pdf-crop.js: DONE
Step 14 — dictation.js: DONE
Step 15 — ui-tooltip.js: DONE
Step 16 — onboarding.js: DONE
Step 17 — pwa-lifecycle.js: DONE
Step 18 — main.js + remove old inline code: DONE (index.html is now a thin shell)
Step 19 — final ARCHITECTURE.md: DONE

Last successful step: Step 19 — final ARCHITECTURE.md (migration complete)
Last successful PR: #47 (https://github.com/zavoritniigor-ui/ai-ebook-reader/pull/47)
Last successful commit: 8c0b986 (merged to main as 6e296db)
Last CI result: green (after one rerun for the documented Chrome-CDP-startup-timeout flake)
Last production deploy: verified live at https://ai-ebook-reader.pages.dev/ — fresh cache-disabled
  load (zero console errors), all 18 js/*.js scripts present in the correct classic-script order,
  a real synthetic PDF loaded and rendered (text extracted, 2 canvases), AND a genuine network-
  level offline reload (CDP Network.emulateNetworkConditions offline:true) that still loaded the
  full app correctly from cache (readyState complete, initPdf defined, correct title, all 18
  scripts present, service worker confirmed active).

## Migration complete

All 19 steps of the modularization migration are done. `index.html` went from a ~5600-line
monolith to a ~900-line thin shell (markup, styles, eighteen ordered `<script src="js/...">`
tags, and exactly one documented still-inline fragment) plus eighteen named,
independently-readable modules under `js/`. `ARCHITECTURE.md` now exists and documents the
module map, the classic-script mechanism, load order, cross-module dependencies, resolved
plan deviations, known incidents, test coverage, and the content-hash versioning scheme — see
that file for anything a future agent needs before touching this codebase again.

**Step-by-step summary** (PR numbers, in order): Step 0 mutable-state-containers prep → Step 1
core.js → Step 2 lang-detect.js → Step 3 ai-client.js → Step 4 selection.js (PRs #12/#14/#15)
→ Step 5 pdf-render.js → *retrospective audit of Steps 0-4, PR #19* → Step 6 tts.js (PR #21,
plus a real tests/browser_cdp.py WebSocket-reassembly bug fix) → Step 7 translation.js (PR
#23) → Step 8 grammar-svo.js (PR #25) → Step 9 navigation.js (PR #27) → Step 10 formats.js
(PR #29) → Step 11 pdf-zoom-pan.js (PR #31) → Step 12 pdf-ink.js (PR #33) → Step 13
pdf-crop.js (PR #35) → Step 14 dictation.js (PR #37) → Step 15 ui-tooltip.js (PR #39) → Step
16 onboarding.js (PR #41) → Step 17 pwa-lifecycle.js (PR #43, higher-risk step, extra
verification) → Step 18 main.js + remove old inline code (PR #45, the final assembly step) →
Step 19 ARCHITECTURE.md (PR #47). Every extraction step's own commit was accompanied by a
docs-update PR recording it (PRs #20/#22/#24/#26/#28/#30/#32/#34/#36/#38/#40/#42/#44/#46) —
see each step's own dedicated section above in this file for the full reasoning,
forward-reference analysis, and verification detail behind that step.

No functional behavior changed anywhere in this migration — every step was verified
line-for-line as a pure code-motion, with production smoke tests (including genuine
network-level offline reloads) after every single merge, and two genuine bugs found and
fixed along the way that were unrelated to the migration's own mechanics: the
`tests/browser_cdp.py` WebSocket frame-reassembly bug (Step 6) and everything in
`RETRO_AUDIT.md` (the retrospective audit between Steps 5 and 6).

**index.html is now a thin shell**: markup, styles, and eighteen ordered `<script src="js/...">`
tags, plus exactly one still-inline fragment (the documented lang-detect.js voice-loading
trigger, which must stay inline for the incident-fix reason recorded in the "Incident" section
below). Every other line of application logic now lives in a named module under js/.

## Step 6 — tts.js: DONE (PR #21)

Extracted stopTooltipSpeech/updateSpeakerIcons/bindUtterance/speakText/speakInLang (tooltip
speech), setSpeakSide/updateSpeakSideUI, and the sentence playback/highlight/control cluster
(buildSentenceRanges, ttsHighlightSupported/setTtsHighlight/clearTtsHighlight,
pageIndexForRange, updateTtsButtons, stopGlobalTTS, pauseTTS, resumeTTS, speakCurrentSentence,
stepSentence, startTTS, updateAltVoicesBtn, and the tts button/toggle onclick handlers) into
js/tts.js, loaded right after js/lang-detect.js (same position as the first of the three pieces
in the original file). Voice selection/quality (loadVoices, pickBestVoice, pickVoicePair,
voices, ttsSynth) stayed in js/core.js exactly as already decided during Step 1 — tts.js just
consumes those as globals.

Verified the only top-level immediate-execution statement in the moved range
(`updateAltVoicesBtn();`) only depends on core.js (els/state/t), so running it earlier in
document order than before is safe — same mechanism-lesson check as every prior step. Ran
`tools/version_app_shell.py` after creating js/tts.js to add its content hash to both
index.html and sw.js's APP_SHELL.

### CI flake found and fixed during Step 6

Both PR #20 (docs-only) and PR #21 (this step) hit `MemoryError` in `tests/browser_cdp.py`'s
`read()`, inside `migration_audit_browser.py`, on GitHub's runner only — never once locally
(ran the full suite 6+ times locally across both PRs, always green). Root cause: `call()`'s
read loop assumed one WebSocket frame == one complete message, with no FIN-bit or opcode check.
That silently works until the server fragments a message or interleaves a ping/pong control
frame between a request and its response — which `Network.*` events (only
migration_audit_browser.py enables the Network domain) apparently do more often under the
GitHub runner's load/timing than locally. A continuation frame's payload byte then gets
misread as a brand-new frame header, desyncing the stream, until a garbage 2-byte length
decodes to a huge number and `recv()` tries to allocate for it.

PR #20's docs-only rerun happened to pass clean (the fragmentation is timing-dependent, not
guaranteed every run). PR #21 failed the SAME way twice in a row — a real, reproducible-under-CI
bug, not a one-off — so a third blind rerun was not the right call. Fixed
`tests/browser_cdp.py` to reassemble messages by FIN bit (`_read_message()`), following
continuation frames and swallowing ping/pong/close control frames (replying pong) instead of
assuming single-frame messages. Verified with 4 consecutive local runs of
migration_audit_browser.py plus the other two suites, all green, then pushed straight to the
already-open PR #21 (no new PR needed) and it passed CI clean.

**Takeaway for future steps**: if `migration_audit_browser.py` (or any suite using
`Network.enable`) fails in CI with anything from `browser_cdp.py`'s socket layer, that's a
transport bug, not a test assertion failing — check whether it reproduces on rerun/locally
before assuming it's a flake, since this one didn't past the first look.

## Step 7 — translation.js: DONE (PR #23)

Extracted seven non-contiguous pieces (the material was interleaved with Step 8 grammar/AI
content throughout the selection.js- and ai-client.js-inline regions) into js/translation.js,
loaded right after js/selection.js:

- Alignment (original<->translation highlight, CSS Custom Highlight API): exactSpan,
  validateAlignment, rangeAtTextOffsets, clearAlignmentFlash/clearAlignment,
  sourceAlignmentRanges, installAlignment, flashAlignment, alignmentSourceAt, and their
  click/keydown/scroll/resize listeners.
- handleWordOrSelection: the core tap/selection -> translation flow. It also wires the
  tooltip's TTS/SVO/AI/Ask/expand buttons, but translation is its stated dominant purpose -
  same call Step 4 made for the mixed word-tap click listener (placed in selection.js because
  word-tap was its stated priority). The button handlers only reach into other modules from
  inside onclick closures, never immediately, so file order doesn't matter for them.
- mainTranslationText, buildTranslationExtras.
- On-device translation (Chrome's Translator API): localTranslationSupported,
  getLocalTranslator, translateLocally. js/ai-client.js's machineTranslate already
  forward-called translateLocally before this move (it used to be defined later in the
  document than ai-client.js's own tag) - moving it earlier only improves that ordering.
- English phrasal-verb detection for translation quality (PHRASAL_VERBS tables,
  verbBaseForms, detectPhrasalVerb), called from js/selection.js's word-tap handler.
- Translating inside the AI panels: translatePanelPoint and the "Перекласти" button handler.

Left in place, now reading as contiguous blocks with the translation pieces lifted out from
around them: the grammar/ask tab onclick handlers, startAiTask, the AI prompt builders, and
the SVO analysis cluster (all genuinely Step 8 material).

Confirmed both directions of an already-established forward-reference pattern are safe:
selection.js already called handleWordOrSelection before it existed anywhere but inline
index.html (now translation.js, loaded even later) purely from inside its own event-handler
closures - and this step's alignmentFlash DOM-creation/append and event-listener registrations
are the only top-level immediate statements in the moved range, both depending only on
core.js (already loaded) and standard DOM APIs.

One local `migration_audit_browser.py` run hit a one-off service-worker-cache-transition
timing artifact (this session's long-lived local Chrome profile had accumulated state across
many prior test runs) - passed clean on 3 immediate reruns, not a code regression.

## Step 8 — grammar-svo.js: DONE (PR #25)

Extracted four pieces into js/grammar-svo.js, loaded right after js/translation.js:

- Grammar/Ask tab handlers, startAiTask (finally landed here, deferred all the way from
  Step 3 - see MODULARIZATION_PLAN.md), and the whole SVO cluster (flattenRange,
  rangeForSlice, clearSvoHighlights, localSVO, buildSvoPrompt, showSvoFailureNote, analyzeSVO,
  applySVOParts). This piece turned out to be the ENTIRE remaining content of the script block
  that translation.js's Step 7 tag had reopened into - so that block's open/close tags
  collapsed directly into grammar-svo.js's own `<script src>` tag rather than staying as an
  empty pass-through pair.
- The AI prompt builders: buildGrammarPrompt, buildConjugationPrompt, buildAskPrompt,
  buildLanguageLevelPrompt.
- The "Мовний розбір"/"Пояснення" trigger buttons (call startAiTask).
- Verb conjugation: collectVerbsFromAnalysis, renderVerbBar, highlightActiveVerb, showVerb,
  selectVerb, and the tense-bar click listener.

Left in place, now reading as contiguous blocks with this material lifted out from around
them: dictation (Step 14) and PDF ink/crop (Steps 12/13).

No top-level forward-reference risk: only declarations and onclick/addEventListener
registrations in the moved range. startAiTask/showVerb call callAI/aiAvailable
(js/ai-client.js, loaded after this file) only inside their own async bodies - the same
deferred-call pattern already relied on for pdfAnchor, and, in the other direction, for
js/translation.js/js/selection.js forward-calling into this very file.

All local suites green on the first try this time (no flakes). Production verified with the
usual battery, including a real French-sentence localSVO() call live against production.

## Step 9 — navigation.js: DONE (PR #27)

Extracted three pieces into js/navigation.js, loaded right after js/selection.js (the block's
own first content, same position it always had):

- Pagination via CSS columns (columnStep, paginateContainer, goToPageInChapter,
  updateProgressText), the bookmark (bookKeyFor, saveBookmark, loadBookmark), goNext/goPrev.
- Touch/wheel page-turn gestures on els.mainArea — confirmed 100% navigation content back
  during Step 4's recon (no selection-related material despite the "ЖЕСТИ ДЛЯ
  ТЕЛЕФОНА/ПЛАНШЕТА" section title), just not extracted until now.
- The window resize handler. Genuinely mixed (PDF branch calls cancelPdfInteraction/
  renderPdfPage, pdf-zoom-pan.js/Step 11 material) but it's one listener with an if/else for
  both formats, and Step 4's own recon already flagged it "navigation-adjacent" rather than
  worth splitting - kept as one piece here rather than fragmenting a single listener across
  two files.

Also cleaned up an empty pass-through `<script></script>` pair a purely mechanical
close/insert/reopen would have left behind (the extracted piece was the entire first content
of that reopened block) - same situation Step 8 hit, resolved the same way there.

No forward-reference risk: only declarations and event-listener registrations in the moved
range. The resize listener reads pdfViewFocus (still declared later in index.html, Step 11
material) only inside its own callback - deferred, load order doesn't matter.

All local suites green on the first try. Production verified with the usual battery, including
a real synthetic multi-page text block paginated and driven through goNext()/goPrev() live
against production, confirming actual page advancement (not just typeof-defined functions).

## IMPORTANT — scope note on resuming after the retrospective audit

Codex's own record of this audit (see git history / the audit section below) explicitly stated:
"Do not resume autonomous migration after this audit: the user's explicit scope ends here" —
i.e. Codex understood from the user that the migration should STAY PAUSED after the audit
landed. The user then directly instructed a different session (Claude Code) to continue and
start Step 6, twice, explicitly. That direct, repeated, current instruction was treated as
authoritative and the migration was resumed. **If you are a future agent reading this and the
user has not since confirmed this was intentional, it is worth a quick check with the user
rather than assuming either direction silently** — the scope boundary was real and explicit,
not a misunderstanding, so its reversal should stay visible rather than get silently overwritten.

## Retrospective audit of Steps 0–4 — DONE (PR #19)

Performed by Codex per explicit user request, landed by Claude Code after finding it stable
and green (see HANDOFF.md for the handoff details of that landing). Full findings and root
causes are in `RETRO_AUDIT.md` (11 numbered issues: PWA cache/HTML version mismatch now fixed
with content-hash versioning in both index.html and sw.js's APP_SHELL; a cold-start crash from
malformed stored voice preferences; three separate multi-column PDF sentence-extraction bugs;
uncancelled drag/long-press state; PDF loading outliving background cancellation; a
`fetchWithTimeout` bug mis-reporting empty-body HTTP statuses as connection failures; test
harness timing/coverage gaps; a cross-script early-input timing bug; and a real PDF.js 6.3.289
API-removal bug — `PDFDocumentProxy` no longer has `destroy()`).

Local tests before landing: `pdf_ux_browser.py` 34/34, `learning_ux_browser.py` 58/58,
`app_shell_versions.py` PASS, `migration_audit_browser.py` (new, from the audit) 24/24 — all
run against the actual uncommitted audit changes before committing anything, not assumed green.

No new migration extraction was performed during the audit itself — Step 5 remained the last
extraction step until Step 6 resumed afterward (see above).

## Mechanism correction (read before continuing any step)

MODULARIZATION_PLAN.md originally assumed ES modules. Corrected during Step 1: every extracted
file is a plain classic `<script src="js/xxx.js"></script>` (NOT type="module", NOT defer) —
same mechanism as the already-present vendor/jszip and vendor/mammoth scripts. Reason and full
detail are in MODULARIZATION_PLAN.md's amendment note and in js/core.js's header comment.
Consequence you MUST check for on every future step: classic `<script>` tags share one
"script scope" for code that has ALREADY EXECUTED, but do NOT hoist function declarations
across files. If a file you are about to extract contains a TOP-LEVEL (not inside a function
body) statement that calls something defined in a file loaded LATER, it will throw
ReferenceError immediately on page load. This exact mistake happened once already (see the
incident below) — grep the block you are about to move for top-level non-declaration
statements (`grep -n "^[a-zA-Z(!]" js/candidate.js` after de-indenting, then eyeball each hit)
BEFORE finalizing a step, not after.

**Two more mechanism notes learned during Step 4** (both empirically verified, not guessed):
- **Appending to an already-loaded file needs NO new `<script src>` tag.** If a file was already
  given its own `<script src="js/x.js">` earlier in the document, and you later extract MORE
  content into that same file, just delete the lines from index.html — do NOT insert another
  `<script src="js/x.js">` at the new extraction point. A second tag re-executes the whole file,
  causing `SyntaxError: Identifier '...' has already been declared`. This mistake was made and
  self-caught (via the routine `grep -n "<script\|</script>"` well-formedness check) while
  building PR #14 — caught before any test ran, so no incident resulted, but check for it deliberately.
- **Listener registration order across files is usually fine for *deferred* (event-driven) code,
  unlike top-level code.** Moving an `addEventListener` callback to an earlier-loading file only
  matters if another listener *of the same event type on the same element* depends on firing
  before/after it. Capture-phase listeners always fire before bubble-phase ones on the same
  element (when the real target is a descendant) regardless of registration order/file — check
  this specifically before moving any listener, don't assume file position drives event order.

**A fourth note, learned handling concurrent multi-agent edits**: if `git status`/`git diff`
shows uncommitted changes you did not make, check file mtimes for real recency (`stat -c '%Y'`)
before assuming the tree is safe to touch — a few seconds old means another agent is actively
writing right now; don't edit those files. If it has been quiet for a real stretch (multiple
minutes, confirmed by re-checking, not assumed), it is reasonable to verify the work (read its
own audit notes if any, run the full test suite against it) and land it yourself through the
normal commit/PR/CI/merge/production-verify pipeline if it passes — don't leave verified-good,
un-owned work sitting uncommitted indefinitely, and don't silently discard it either.

## Incident: production ReferenceError after Steps 1–3 (found and fixed same session)

After Step 3 merged, a routine production smoke test (loading the live site fresh, not just
running the local suites) found `Uncaught ReferenceError: pageLang is not defined` on every
page load. Root cause: `js/core.js` (Step 1) contains a top-level immediate call chain
(`if (typeof ttsSynth !== 'undefined') { ttsSynth.onvoiceschanged = loadVoices; loadVoices(); }`)
that transitively calls `pageLang()`, which Step 2 moved into `js/lang-detect.js` — loaded
*after* core.js. `pdf_ux_browser.py`/`learning_ux_browser.py` did NOT catch this: headless
Chrome's fresh profile apparently returns an empty/short-circuited voice list, so the code
path never reaches the failing call locally, while real Chrome (production) does, every time.
Fixed by moving only the one-line *invocation* out of core.js into index.html, placed right
after js/lang-detect.js has loaded (commit 777e4a7, PR #10). The function *definitions*
stayed in core.js — only the immediate top-level trigger needed to move.

**Actionable takeaway for every remaining step:** local test suites passing is NOT sufficient
proof of correctness for this migration. Always also do a real production smoke test (fresh
page load(s) with cache disabled, checking window.onerror/console) after every merge, before
marking a step DONE. This is now a permanent addition to the per-step workflow, not optional.

## Step 4 final recon (complete — for historical reference / pattern for future steps)

Lines that originally looked like one interleaved 1029-1980ish block turned out, on actually
reading every listener body (not just grepping function names), to be:

1. **DONE (PR #12)**: selection.js core — caretRangeAt, blockAncestorOf, anchorCaret,
   paragraphRangeAt, pdfNearestSpan, pdfTextSpans, pdfVisualGroup, buildSentenceRangesFromSpans,
   sentenceRangeAt, wrapRangeInSpans, unwrapSpans, showSelectionHighlight,
   clearSelectionHighlight, wordToSentenceEndRangeAt, selectRangeAndTranslate, selectWordAtPoint.
2. **Left in place for Step 9**: navigation.js — columnStep, paginateContainer,
   goToPageInChapter, updateProgressText, bookKeyFor, saveBookmark, loadBookmark, goNext, goPrev.
3. **DONE (PR #15)**: the main `els.mainArea` click listener (word-tap-to-translate falling
   through to page-turn-by-zone/immersive-toggle) — genuinely mixed responsibility, moved as one
   unit into selection.js since word-tap is its own stated priority.
4. **Left in place for Step 9**: "ЖЕСТИ ДЛЯ ТЕЛЕФОНА/ПЛАНШЕТА" — on actually reading it, this
   turned out to be 100% navigation (swipe-to-turn-page via touch/wheel calling goNext/goPrev) —
   NOT a selection/navigation mix as originally guessed from the section title alone. The
   original long-press-to-select behavior was explicitly removed per the code's own comment
   ("Власне довге утримання прибрано") and replaced by the ⤢ expand button in the tooltip.
   (Note: the retrospective audit found non-PDF touch long-press still exists in selection.js
   despite that comment — see RETRO_AUDIT.md's "Other audited behavior" section.)
5. **Left in place for Step 11**: "КЕРУВАННЯ PDF МИШЕЮ" through `endPdfPointer` — pdf-zoom-pan.js
   (rerenderPdfAtCurrentZoom, pdfAnchor, layoutPdfZoom, applyPdfZoom, setPdfScale,
   cancelPdfRender/Interaction, pinchMetrics, paintPdfGesture, endPdfPointer, etc).
6. **Left in place for Step 11/9**: on actually reading it, this turned out to be 100%
   pdf-zoom-pan.js (`pdfBlockClick`-suppression capture-phase click listener, `#pdf-fit`
   onchange) plus one navigation-adjacent `window.resize` listener (paginateContainer/
   goToPageInChapter + PDF rerender) — again NOT a selection-mixed piece as originally guessed.
7. **DONE (PR #14)**: wordBoundsAt, drag-selection-by-word pointerdown/pointermove/pointerup
   (stylus/mouse), rangeBetweenWords.

**Lesson for future steps**: section-title comments (e.g. "ЖЕСТИ ДЛЯ ТЕЛЕФОНА/ПЛАНШЕТА") are not
reliable classifiers on their own — two pieces initially flagged as "mixed, needs a judgment
call" turned out, once actually read function-by-function, to have zero content belonging to
the step in question. Always read the full body before deciding a piece needs a hard judgment
call; don't assume ambiguity from a comment header alone.

## Deviation from MODULARIZATION_PLAN.md's navigation.js list — read before Step 15

The original plan (written before any extraction happened, by line-number guess) listed
`openFooterMenu`, `closeFooterMenu`, `enterMobileFullScreenIfNeeded` and `buildToc` under
navigation.js alongside the pagination/goNext/goPrev material Step 9 actually extracted.
Step 9 deliberately did NOT take the first three: reading the actual code, they sit in a
region tangled with pointer-type detection (`lastPointerType`/`finger-input`), Android
select/contextmenu suppression, and a single big `pointerdown` listener that closes BOTH the
footer menu AND the word-translation tooltip in one function body — none of which is
navigation, all of which is ui-tooltip.js (Step 15) territory. Splitting that listener to
extract just the footer-menu half wasn't worth the risk for two one-line functions. **When
Step 15 (ui-tooltip.js) is done, either fold openFooterMenu/closeFooterMenu/
enterMobileFullScreenIfNeeded into it (matching what the code actually is) or, if closer
reading says otherwise, into navigation.js as the plan originally said — decide from the
actual code, not from this note.** `buildToc`, by contrast, IS clean and self-contained (one
small function, no entanglement) — earmarked to fold into js/navigation.js as a small
addendum during Step 10 (formats.js), since Step 10 already touches its three call sites
(the epub/txt/doc chapter loaders) directly.

## Step 10 — formats.js: DONE (PR #29)

Extracted one clean, fully contiguous block into js/formats.js, loaded right after
js/pdf-render.js (the exact position this content already occupied — it was the entire first
stretch of that reopened script block, same collapse-the-tag pattern Steps 8/9 already used):
runArchiveGuard, initEpub/loadEpubChapter, initRichDoc/splitIntoChapters/renderDocChapter,
fb2ToHtml, rtfToHtml, initTxt/renderTxtPage.

Also completed the gap flagged in Step 9's deviation note: `buildToc` folded into
js/navigation.js (append only, no new `<script>` tag) since it's a small, format-agnostic
TOC-list builder shared by all three loaders, matching MODULARIZATION_PLAN.md's original
classification (unlike the footer-menu functions in that same plan entry, which are genuinely
tangled with ui-tooltip.js material and still await Step 15's own reading).

No forward-reference risk: only function declarations in the moved range, all invoked later
when a user actually opens a book of that format. All local suites green. Production verified
with the usual battery, including a real synthetic TXT file loaded end to end through
initTxt() live against production (correct pagination and TOC population).

## Step 11 — pdf-zoom-pan.js: DONE (PR #31)

Extracted one fully contiguous block into js/pdf-zoom-pan.js, loaded right after
js/navigation.js (the exact position this content already occupied — entire first stretch of
that reopened script block, same collapse-the-tag pattern Steps 8-10 already used):
rerenderPdfAtCurrentZoom, rememberPdfFocus, pdfBaseScale, pdfAnchor, restorePdfAnchor,
layoutPdfZoom, applyPdfZoom, persistPdfZoom, setPdfScale, cancelPdfRender, cancelPdfInteraction,
pinchMetrics, paintPdfGesture, endPdfPointer, the pdfPointers Map and its pointer/wheel
listeners, the pdfBlockClick-suppression capture-phase click listener, and the `#pdf-fit`
onchange handler. Exactly matched Step 4's own recon (100% pdf-zoom-pan.js, zero
selection-related material) with nothing else interleaved.

js/navigation.js's window-resize listener (Step 9) reads pdfViewFocus, which is declared here
— that forward reference now resolves to an earlier-loading file instead of a later one,
which only improves the existing safe pattern (the read only ever happens inside the resize
callback, deferred). No top-level forward-reference risk otherwise: only declarations and
event-listener registrations in the moved range. All local suites green, including
pdf_ux_browser.py's extensive zoom/pinch/pan coverage. Production verified with the usual
battery, including a real synthetic PDF loaded via initPdf() and zoomed via setPdfScale()
live against production (confirmed actual state.pdfZoom change, not just typeof-defined).

## Step 12 — pdf-ink.js: DONE (PR #33)

Extracted one contiguous block — a middle piece, not the start of its script block
(dictation stays before it, PDF region/crop stays after it) — into js/pdf-ink.js, loaded
right after js/ai-client.js: inkCanvas, inkPageKey, inkStrokes, saveInk, loadInk, redrawInk,
inkPoint, updateInkWidth, bindInkCanvas, inkEraseAt, updateInkTools, plus the pen/eraser/
color/undo/clear/done button wiring.

Resolved the open question from Step 11's own notes: inkDrawing/inkCurrent are this file's
own state, not shared with anything — js/pdf-zoom-pan.js's cancelPdfInteraction and its
touch-gesture handlers only read them inside their own callback bodies (deferred), so file
load order never mattered and needed no change. regionStart/regionBox, read right after the
ink cluster (in the "ВИДІЛЕННЯ ОБЛАСТІ" section immediately following it), turned out to be
pdf-crop.js's own state instead — confirmed while reading the splice boundary, not moved
with this step.

The only top-level immediate call in the moved range
(`inkWidth.oninput = updateInkWidth; updateInkWidth();`) only touches a static DOM element
and writeStored (core.js, already loaded) — same safe-immediate-call pattern already used by
tts.js's updateAltVoicesBtn(). All local suites green, including the ink-specific
pdf_ux_browser.py cases (fine ink in page coordinates, pinch rollback, ink surviving
rerender). Production verified with the usual battery, including a real stroke pushed
through inkStrokes()/saveInk()/loadInk()/redrawInk() live against production.

## Step 13 — pdf-crop.js: DONE (PR #35)

Extracted one contiguous block — the entire first content of its reopened script block, same
collapse-the-tag pattern Steps 8-10/12 already used — into js/pdf-crop.js, loaded right after
js/pdf-ink.js: regionStart/regionBox state and the region-overlay pointer handlers,
exitRegionMode, cropPdfRegion, openCropPreview/closeCropPreview and the crop dialog's Save
PNG/Share/Copy PNG/send-to-AI button wiring, and checkExerciseImage (per the plan's own
footnote, stays here despite calling js/ai-client.js's callAIVision — only ever invoked from
the crop flow, a deferred forward reference, safe regardless of file order). Resolved Step
12's open question: regionStart/regionBox are pdf-crop.js's own state, not ink's.

No forward-reference risk: only declarations, assignments and event-listener registrations
in the moved range (one onclick assignment references a function declared later in the SAME
script - ordinary same-script hoisting). All local suites green, including every crop-
specific pdf_ux_browser.py case. Production verified with the usual battery, including a real
region cropped out of a real synthetic PDF page live against production (genuine PNG data
URL, preview dialog opened/closed correctly).

## Step 14 — dictation.js: DONE (PR #37)

Extracted the entire content of its script block (dictation was always alone there — Steps
12/13 had already lifted out everything that came after it in the same block, never touching
it) into js/dictation.js, loaded right after js/ai-client.js: updateDictationUI,
stopDictation, startDictationSession, toggleDictation, and the mic-button/panel-close wiring.

No forward-reference risk: the one top-level immediate statement
(`if (!SpeechRecognitionCtor || !micSecureOk) els.micBtn.style.display = 'none';`) only
touches state declared in the same file and els.micBtn (core.js, already loaded). All local
suites green, including every dictation-specific learning_ux_browser.py case. Hit the known
Chrome-CDP-startup-timeout CI flake (see the "ci-chrome-cdp-startup-flake" session memory and
Step 6's own CI-flake precedent for how these are distinguished from a real bug) — third
occurrence of that exact pattern, resolved by one rerun as before. Production verified with
the usual battery, including updateDictationUI()/toggleDictation() called directly live
against production, confirming real global-state mutation.

## Step 15 — ui-tooltip.js: DONE (PR #39)

Extracted two pieces into js/ui-tooltip.js, loaded right after js/pdf-zoom-pan.js (piece A was
the entire remaining content of that reopened script block, so it collapsed into
ui-tooltip.js's own tag — same pattern Steps 8-10/12/14 already used):

- Footer submenu + translation-tooltip lifecycle together in one piece: openFooterMenu/
  closeFooterMenu, the pointer-type detection gating Android's native selection popup,
  enterMobileFullScreenIfNeeded, the menu-handle listener, scheduleTooltipHide/
  cancelTooltipHide, positionTooltip/repositionTooltip. **Resolved the Step 9 deviation**: read
  the actual code and found the single pointerdown listener that closes things on an outside
  tap closes BOTH the footer menu and the tooltip in one function body — they're the same kind
  of transient overlay with the same dismiss rule, so kept together here rather than split
  toward navigation.js as the original stale plan guessed.
- The key-settings modal (openKeySettings/closeKeySettings/saveApiKey) — a small, clean middle
  piece, matching the plan's own classification.

handleWordOrSelection and translatePanelPoint, also named under ui-tooltip.js in the original
plan, were not touched here — already DONE, moved to js/translation.js in Step 7.

No forward-reference risk: the two top-level immediate statements
(`document.body.appendChild(els.tooltip);` and the `if (els.footerHandle)`/
`if (els.menuHandle)` guarded listener registrations) only touch els.* (core.js, already
loaded) and document.body (always exists by this point). All local suites green. Production
verified with the usual battery, including positionTooltip()/openFooterMenu()/
closeFooterMenu()/openKeySettings()/closeKeySettings() all called directly live against
production, confirming real DOM/state mutation.

## Step 16 — onboarding.js: DONE (PR #41)

Extracted one contiguous middle piece (zoom-in/zoom-out/theme-select/prev-btn/next-btn wiring
stays before it, the updateDictationUI()/applyI18n() startup bootstrap calls stay right after
it — deliberately inline, same reasoning as the tts.js voice bootstrap) into js/onboarding.js,
loaded right after js/formats.js: ONBOARDING_KEY/onboardingState, onboardingGroups,
scheduleReaderOnboarding, stopOnboarding, rememberOnboarding.

No forward-reference risk: no top-level immediate calls in the moved range, only
declarations, a try/catch initializer, and for-loops registering event listeners/
MutationObservers (deferred), all against els.* elements already built in core.js. All local
suites green, including every onboarding-specific learning_ux_browser.py case. Production
verified with the usual battery, including rememberOnboarding()/scheduleReaderOnboarding()/
stopOnboarding() called directly live against production, confirming real state persistence
and timer scheduling.

## Step 17 — pwa-lifecycle.js: DONE (PR #43)

Extracted the entire remainder of the document (everything from the "PWA: ЖИТТЄВИЙ ЦИКЛ
ЗАСТОСУНКУ" header through the final `window.addEventListener('load', ...)` line, right up
against the closing `</script></body></html>`) into js/pwa-lifecycle.js, loaded last, after
js/onboarding.js: isStandalonePwa, stopBackgroundActivity, persistCriticalState, exitApp,
showToast, the Android-Back overlay stack (OVERLAY_LAYERS/topOpenOverlay/countOpenOverlays/
closeTopOverlay/syncOverlayHistory), showUpdateBanner, the service-worker registration/
update-check/controllerchange wiring (swRegistration), and the retrospective audit's
body.inert-until-'load' gate.

Treated as higher-risk per AGENTS.md/CLAUDE.md, with correspondingly extra verification (see
below). One genuine forward-reference issue was found and confirmed safe rather than assumed:
the MutationObserver setup directly references `cropDialog` (js/pdf-crop.js) in a top-level
array literal, not inside a callback - this only works because pwa-lifecycle.js's tag stays
at the very end of the document, after every other classic `<script>`, so `cropDialog`
already exists by the time this line runs. This would NOT be safe if this file's tag were
ever moved earlier. Confirmed both directions of the two other cross-file references:
js/dictation.js already forward-calls showToast() (defined here) only from inside its own
recognition.onerror/onend callbacks, and the inline `onclick="exitApp()"` button attribute
resolves as a plain global at click time - both pre-existing deferred patterns.

Extra production verification beyond the usual battery: a real synthetic PDF was loaded then
genuinely cancelled by an actual `visibilitychange` 'hidden' event dispatch (not just calling
stopBackgroundActivity() directly), the overlay stack was confirmed to count an open panel
and drop to zero once closed, showToast()/showUpdateBanner() were confirmed to create real
visible DOM, the service worker was confirmed active, and document.body.inert was confirmed
false after a genuine page load - all live against production, in addition to the standard
offline-reload check. All local suites green, including the background-abort and offline/SW
cases in migration_audit_browser.py.

## Step 18 — main.js + remove old inline code: DONE (PR #45)

Consolidated the five scattered inline fragments identified below into one classic
`<script src="js/main.js">`, loaded right after js/onboarding.js and right before
js/pwa-lifecycle.js: general reader-settings restore/onchange wiring (uiLang/theme/
targetLang/voiceSelect), the "Learn mode" toggle, Ask-panel mic/send wiring, the file-upload
format-detection dispatcher (exactly the cross-module wiring MODULARIZATION_PLAN.md names as
main.js's job), zoom/theme-select/prev/next button wiring, and the startup bootstrap calls
(updateDictationUI/applyI18n) that must run last. One now-orphaned comment (describing
word-detection code that had already moved to js/selection.js back in Step 4) was dropped
rather than carried forward with no code attached. The lang-detect.js voice-loading trigger
was correctly left exactly where it's always been — nothing to do with main.js's concerns.

The real risk here was ordering, not cut-and-paste: main.js's tag can't load early, because
applyI18n() makes top-level immediate calls into functions from js/tts.js, js/navigation.js
and js/dictation.js. A first attempt placed the tag right after core.js (matching where the
FIRST fragment used to sit) and was caught and corrected — by re-deriving the ordering
constraint, not by a failed test — before any test ran. Final position: exactly where the
bootstrap-call fragment already was.

Verified extensively beyond the usual battery given the step's importance: initial UI state
(language/theme/target-language) confirmed reflecting stored preferences, the Learn-mode
toggle flips state both ways, zoom buttons actually change state.fontSize, mic/prev/next
buttons wired to the correct real functions, and — the most direct proof the reordering is
correct — a REAL 'change' event dispatched on the file-upload input with a real File
correctly ran the whole format-detection pipeline end to end, live both locally and against
production. All local suites green, including "classic execution order and no duplicate
scripts" and three "cold/hard reload" cases in migration_audit_browser.py that would have
surfaced a ReferenceError from a bad ordering immediately.

**index.html is now a thin shell**: markup, styles, and eighteen ordered `<script src>` tags,
plus exactly one still-inline fragment (the lang-detect.js voice trigger, staying inline for
the Step 1-3 incident-fix reason recorded above).

## Step 19 next — final ARCHITECTURE.md (documentation only, much lighter than the extraction
steps)

ARCHITECTURE.md does not exist yet in the repo — this step creates it from scratch. Per
AGENTS.md's own stated purpose ("ensure that future agents can locate the correct code
without scanning the entire application"), it should cover:

- The module map: all 18 js/*.js files, one line each, naming what each one owns (this
  MIGRATION_STATUS.md file already has that information scattered across 18 "Step N — X.js:
  DONE" sections above — consolidate it, don't re-derive it from scratch).
- The classic-script-not-ES-module mechanism and why (see js/core.js's own header comment
  and the "Mechanism correction" section above for the canonical explanation) - this is the
  single most important fact a future agent needs before touching any js/*.js file.
- The exact script load order in index.html and why it's fixed (the lang-detect.js voice
  trigger's position, and main.js/pwa-lifecycle.js needing to load last - both documented
  above under their own step sections).
- Cross-module dependency notes worth calling out explicitly: js/translation.js's
  handleWordOrSelection is forward-called by js/selection.js; js/pdf-crop.js's checkExerciseImage
  calls js/ai-client.js's callAIVision; js/pwa-lifecycle.js's MutationObserver references
  js/pdf-crop.js's cropDialog directly (only safe because pwa-lifecycle.js loads last); the
  voice-selection cluster living in js/core.js rather than js/tts.js (Step 1's deliberate
  choice, kept ever since).
- Known remaining scope notes still open: the footer-menu functions
  (openFooterMenu/closeFooterMenu/enterMobileFullScreenIfNeeded) that Step 9's deviation left
  in js/ui-tooltip.js rather than js/navigation.js (see "Deviation from
  MODULARIZATION_PLAN.md's navigation.js list" above) — Step 15 resolved this by keeping them
  in ui-tooltip.js for good, so this is settled, not still open; note it as a resolved
  deviation, not a TODO.
- Test coverage map: which of pdf_ux_browser.py / learning_ux_browser.py /
  migration_audit_browser.py / app_shell_versions.py covers what, and the two known CI-only
  flakes documented above (the fixed browser_cdp.py WebSocket bug from Step 6, and the
  ongoing-but-harmless Chrome-CDP-startup-timeout infra flake — see the session memory note
  "ci-chrome-cdp-startup-flake").
- The content-hash versioning mechanism (tools/version_app_shell.py / sw.js's APP_SHELL /
  tests/app_shell_versions.py) and that it must be rerun after touching any js/*.js file.

This step is documentation-only — no code changes, no js/*.js edits, no new tests. Still run
the two required local suites once as a final sanity check before considering the whole
migration complete (nothing should have changed since Step 18's own verification, but confirm
rather than assume). Follow the same commit/push/PR/CI/merge workflow as every other step.
When this lands, the 19-step modularization migration is complete.

## RETRO_AUDIT completion verification — 2026-09-08

Maintenance audit requested explicitly by the user after the completed migration. The
original PR #19 is preserved as historical fact; no migration step has been reopened.
Current audit: IN PROGRESS, final local checks/release pending. Original findings 1–11
remain fixed. Newly reproduced and fixed: exact-glyph PDF element-caret fallback, invalid
PDF lifecycle/layout in the smoke fixture, CDP EOF spin, and first-install SW update banner, and idle drag cleanup removing completed highlights.
See RETRO_AUDIT.md findings 12–16 and the expanded browser/transport regression tests.

Additional user-reported PDF offset confirmed and FIXED (finding 17): nested visited-word/
selection wrappers inherited absolute PDF item positioning and a system font, moving later
glyphs ~79 px. CSS now preserves text flow/font; zoom/pan geometry regression added.
Android installability on production has no Chromium/manifest/icon errors; physical device
symptom requested, with no confirmed server-side installation blocker.
