# AI Ebook Reader — Migration Status

Current phase: Modularization

Step 0 — Prepare mutable state containers: DONE
Step 1 — core.js: DONE
Step 2 — lang-detect.js: DONE
Step 3 — ai-client.js: DONE (startAiTask deferred to Step 8, see MODULARIZATION_PLAN.md)
Step 4 — selection.js: PENDING
Step 5 — pdf-render.js: PENDING
Step 6 — tts.js: PENDING
Step 7 — translation.js: PENDING
Step 8 — grammar-svo.js: PENDING (now also carries startAiTask, deferred from Step 3)
Step 9 — navigation.js: PENDING
Step 10 — formats.js: PENDING
Step 11 — pdf-zoom-pan.js: PENDING
Step 12 — pdf-ink.js: PENDING
Step 13 — pdf-crop.js: PENDING
Step 14 — dictation.js: PENDING
Step 15 — ui-tooltip.js: PENDING
Step 16 — onboarding.js: PENDING
Step 17 — pwa-lifecycle.js: PENDING
Step 18 — main.js + remove old inline code: PENDING
Step 19 — final ARCHITECTURE.md: PENDING

Last successful step: urgent fix after Step 3 (production ReferenceError, see below)
Last successful PR: #10 (https://github.com/zavoritniigor-ui/ai-ebook-reader/pull/10)
Last successful commit: 777e4a7 (merged to main as 9a6bd88)
Last CI result: green
Last production deploy: verified live at https://ai-ebook-reader.pages.dev/ — 3 fresh cache-disabled
  reloads, zero console errors

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

Next step: Step 4 — selection.js

## Note on Step 4's complexity (detailed recon done, extraction NOT yet started)

Unlike Steps 1–3 (each one contiguous block of lines), lines ~1029-1980 interleave FOUR
different future modules' content, confirmed by actually reading the code (not just grepping
function names) as of commit 5a8e85b. Line numbers below WILL have shifted after Step 4's own
`<script src>` splices for earlier pieces — re-grep before each individual cut, don't trust
these numbers once you start editing:

1. **~1032-1399**: selection.js core — comment "ВИДІЛЕННЯ РЕЧЕННЯ/АБЗАЦУ ПАЛЬЦЕМ" through end of
   `selectWordAtPoint`. Clean, contiguous, matches the original plan. Includes caretRangeAt,
   blockAncestorOf, anchorCaret, paragraphRangeAt, pdfNearestSpan, pdfTextSpans, pdfVisualGroup,
   buildSentenceRangesFromSpans, sentenceRangeAt, wrapRangeInSpans, unwrapSpans,
   showSelectionHighlight, clearSelectionHighlight, wordToSentenceEndRangeAt,
   selectRangeAndTranslate, selectWordAtPoint.
2. **~1400-1495**: navigation.js — columnStep, paginateContainer, goToPageInChapter,
   updateProgressText, bookKeyFor, saveBookmark, loadBookmark, goNext, goPrev. NOT selection,
   belongs to Step 9. Contiguous block, safe to extract on its own schedule.
3. **~1496-1546**: `els.mainArea.addEventListener('click', ...)` — a genuinely MIXED
   responsibility handler: word-tap-to-translate (selection: selectWordAtPoint/sentenceRangeAt/
   handleWordOrSelection) falls through to page-turn-by-tap-zone (navigation: goPrev/goNext) and
   immersive-mode toggle when not in translate mode or no word found. Read in full before
   deciding its home — it is NOT safe to split this listener itself across files; it must move
   as one unit into whichever file becomes its home (leaning selection.js, since the word-tap
   path is the code's own stated priority, but this is a judgment call, not settled).
4. **~1548-1612**: "ЖЕСТИ ДЛЯ ТЕЛЕФОНА/ПЛАНШЕТА" section — touchstart/touchmove/touchend/wheel
   listeners for swipe-to-turn-page and pull-down-to-open-menu gestures, plus clearLongPress.
   Read each listener body before classifying — likely a mix of navigation (swipe-to-turn) and
   selection (long-press-to-select-sentence); do not assume it's all one thing.
5. **~1613-1826**: "КЕРУВАННЯ PDF МИШЕЮ" through `endPdfPointer` — this is pdf-zoom-pan.js
   (Step 11) territory: rerenderPdfAtCurrentZoom, rememberPdfFocus, pdfBaseScale, pdfAnchor,
   restorePdfAnchor, layoutPdfZoom, applyPdfZoom, persistPdfZoom, setPdfScale, cancelPdfRender,
   cancelPdfInteraction, pinchMetrics, paintPdfGesture, endPdfPointer, plus their own
   pointerdown/scroll listeners. NOT selection. Leave in place for Step 11.
6. **~1827-1848**: a second `els.mainArea` click listener (capture phase, `pdfBlockClick` gesture
   suppression — pdf-zoom-pan.js), `#pdf-fit` onchange (pdf-zoom-pan/navigation mix), and a
   `window.resize` listener that itself mixes PDF-rerender and pagination
   (paginateContainer/goToPageInChapter) — another cross-cutting piece needing a judgment call.
7. **~1853-1980+**: "ВИДІЛЕННЯ ПЕРЕТЯГУВАННЯМ ЗІ ЗНАЧКОМ ПО СЛОВАХ" — wordBoundsAt, and
   pointerdown/pointermove/pointerup for stylus/mouse drag-selection, then rangeBetweenWords.
   This IS selection.js, contiguous within itself, clean cut.

**Recommendation for whoever continues Step 4**: do piece 1 and piece 7 first (both clean,
contiguous, unambiguous selection.js content, no judgment calls needed) as their own
commit/PR/test/merge/smoke-test cycle. Then separately decide and handle pieces 3, 4, 6 (the
cross-cutting orchestrators) as a follow-up within the same step, reading each listener body in
full before deciding its file — do not guess. Piece 2 (navigation.js) and piece 5
(pdf-zoom-pan.js) can be left completely alone for now and handled in their own dedicated
Steps 9 and 11 respectively, exactly as originally planned.
