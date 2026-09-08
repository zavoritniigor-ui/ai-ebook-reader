# AI Ebook Reader — Migration Status

Current phase: Modularization (resumed after retrospective audit — see note below)

Step 0 — Prepare mutable state containers: DONE
Step 1 — core.js: DONE
Step 2 — lang-detect.js: DONE
Step 3 — ai-client.js: DONE (startAiTask deferred to Step 8, see MODULARIZATION_PLAN.md)
Step 4 — selection.js: DONE (all genuinely selection.js content extracted; see recon below —
  what looked like 2 more ambiguous pieces turned out to be 100% navigation.js/pdf-zoom-pan.js
  content on closer reading, correctly left in place for Steps 9/11)
Step 5 — pdf-render.js: DONE
Step 6 — tts.js: DONE
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

Last successful step: Step 6 — tts.js
Last successful PR: #21 (https://github.com/zavoritniigor-ui/ai-ebook-reader/pull/21)
Last successful commit: 86e6aa2 (merged to main as 5660e7e)
Last CI result: green (see "CI flake found and fixed during Step 6" below — took two failed
  attempts and a real test-infra root-cause fix to get there, not a rerun-until-green shortcut)
Last production deploy: verified live at https://ai-ebook-reader.pages.dev/ — fresh cache-disabled
  load (zero console errors), all 6 js/*.js scripts present in the correct classic-script order
  including the new tts.js, every extracted TTS function present as a real global and startTTS()
  exercised live (built a real sentence queue and played it via speechSynthesis with zero thrown
  errors), SW confirmed active and controlling the page after a short activation wait, AND a
  genuine network-level offline reload (CDP Network.emulateNetworkConditions offline:true) that
  still loaded the full app correctly from cache (readyState complete, initPdf/startTTS defined,
  correct title, all 6 scripts present).

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

## Step 7 next

translation.js is the next extraction. Re-grep fresh line numbers before each cut — everything
shifts after every prior step's edits. Preserve classic execution order; after changing any
js/*.js file (adding or extracting more into one), run `python3 tools/version_app_shell.py` to
refresh the content-hash versions before testing (required since the retrospective audit's
versioning scheme landed in PR #19 — `tests/app_shell_versions.py` fails CI on drift). See
RETRO_AUDIT.md's dependency inventory for what translation.js is known to touch: ai-client.js's
machineTranslate/aiTranslateText call inline translateLocally/buildTranslationExtras/
validateAlignment — read the actual current boundaries fresh rather than trusting that note's
line-independent description.
