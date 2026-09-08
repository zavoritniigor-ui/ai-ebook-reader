# Retrospective audit — completion verification

Audit status: IN PROGRESS (2026-09-08). Earlier fixes landed in PR #19; the current
maintenance verification uses baseline 81a2012 after all migration steps completed.
The sections below first preserve the original Steps 0–4 review, then record current findings.

## Original Steps 0–4 review

Scope: existing migration only; no new extraction or Step 5 continuation. Baseline dev
`c44a3b7`, main `d7da64e` (PR #17). The supplied status/handoff lagged Git:
Step 4 had already finished in PR #15 and pdf-render.js was already extracted in #17.
ARCHITECTURE.md did not exist. Untracked scratch files were left untouched.

## Execution order and dependency inventory

Actual parser-blocking order is vendor JSZip, vendor Mammoth, core.js, inline settings,
lang-detect.js, inline voice bootstrap/TTS helpers, selection.js, inline navigation/
gestures/lookup/grammar, ai-client.js, inline translation/alignment/ink/crop/upload,
pdf-render.js, final inline formats/TTS/dictation/onboarding/PWA bootstrap.
The PDF.js external module and following worker-configuration inline module run in
module/deferred order; their markup position in the head is not execution before core.
All extracted application scripts remain classic, without async/defer/module attributes,
and are loaded exactly once. Lexical state/els are global identifiers, not window
properties; function declarations remain visible to CDP and window callers.

Core top-level code reads safe storage, creates state and DOM references, registers the
TOC click handler and defines voice/i18n tables. The immediate loadVoices call is after
lang-detect, and its pageLang dependency is now exercised with populated voices at startup.
applyI18n runs in the final inline block after updateAltVoicesBtn/updateTtsButtons/
updateProgressText/updateDictationUI declarations and lexical state initialization.
Language tables initialize before detectLang/pageLang/voice callers. AI functions have
no immediate network calls; selection registers deferred event handlers.

Dependencies are broader than old module headers implied: core.invalidateSelection uses
selection and inline alignment/SVO state; core.aiText uses ai-client.sanitizeAI; selection
uses inline buildSentenceRanges, alignment/SVO cleanup, lookup, navigation and PDF gesture
state; ai-client also contains machineTranslate/aiTranslateText and calls inline
translateLocally/buildTranslationExtras/validateAlignment. startAiTask remains inline as
recorded in the plan (future Step 8), depending on selection's prompt limit, core task
helpers and inline prompt/UI functions. No further extraction was done during this audit.

## Findings, root causes and minimal fixes

1. **FIXED — Mixed HTML/JS versions in installed PWA.** HTML was network-first but unversioned
   extracted scripts were cache-first, permitting fresh inline code plus old modules.
   Content hashes now identify each script URL in both HTML and APP_SHELL. Offline HTML
   stays paired with the installed shell instead of being replaced independently by
   navigation fetches. The SW caches only declared same-origin shell URLs, and deletes
   only its own cache prefix. `tools/version_app_shell.py` updates hashes/cache identity;
   `tests/app_shell_versions.py` makes stale hashes a CI failure.
2. **FIXED — Cold-start crash with valid JSON of the wrong type.** Stored voice preferences could
   be `null`, which passed JSON parsing and failed at `voiceChosenByUser[code]` when voices
   were available immediately. Validate the object shape; absent speech synthesis also
   no longer causes loadVoices to crash during final i18n initialization.
3. **FIXED — PDF second sentence selected as the first.** sentenceRangeAt matched only node
   identity when multiple sentences shared a text node. Match exact character intervals.
4. **FIXED — Visited words corrupted PDF sentence grouping.** pdfTextSpans included nested word
   wrappers and read only firstChild, dropping text after the wrapper or making it a
   separate column. Keep actual PDF item spans and walk their text descendants.
5. **FIXED — Visual text and highlight disagreed across columns.** Overriding Range.toString did
   not change the native DOM range, so highlight traversal still crossed unrelated
   content-stream items. Carry exact PDF pieces and highlight only those pieces. Word
   expansion uses the same character boundaries. Insert separators between PDF items
   where the content stream omitted spaces.
6. **FIXED — Cancelled long press survived pointer cancellation/background.** There was no
   selection pointercancel handler, and the timer/drag state survived background entry.
   Centralize selection cancellation and call it on pointercancel, blur, invalidation
   and background. Reset touch navigation time when pointerup finishes touch selection,
   because touchend follows pointerup and previously could navigate after selection.
7. **FIXED — Initial PDF load could outlive background cancellation.** Before getDocument there
   was no task handle; loading tasks were not stopped when no document existed. Track
   the file-read phase, invalidate the book epoch and destroy pending loading on
   background, presenting an explicit reopen message. Keep completed document ownership
   intact. Clear failed file-read/loading and text/render handles with identity checks,
   so an older completion cannot clear a newer task.
8. **FIXED — Network helper misreported empty-body statuses.** Reconstructing a Response with
   a body for 204/205/304 throws TypeError, which was mislabeled as a connection failure.
   Preserve a null body for these statuses.
9. **FIXED — Regression harness timing and coverage gaps.** PDF tests installed error collection
   only after startup; both existing suites bypass SW. New HTTP audit installs error and
   rejection capture before navigation, supplies voices synchronously, checks hard
   reload/offline startup and exercises selection/cancellation/provider paths. Render
   assertions that raced raster completion now poll their unchanged conditions for at
   most ten seconds. CDP port is configurable for a disposable browser.

10. **FIXED — Input could run between classic scripts or before PDF.js module completion.**
    On slow cold starts initPdf was already declared while window.pdfjsLib was absent;
    earlier-installed UI callbacks could also reach later lexical bindings. The body
    stays inert until the load event, and resize ignores this bootstrap interval.
    Harnesses now wait for document completion and enabled input, not a one-second delay.

11. **FIXED — Stale PDF completion used a removed cleanup API.** The shipped PDF.js 6.3.289
    PDFDocumentProxy has no destroy() method (confirmed against the live proxy prototype).
    A stale loading completion and the document-only replacement fallback called it.
    Destroy the owning PDFDocumentLoadingTask instead (local loading variable or
    document.loadingTask). The real-PDF smoke also exercises this actual ownership API.

## Other audited behavior

No direct legacy bookEpoch/renderEpoch/pdfRenderTask/pdfLoadingTask/pdfTextTask variables
remain in application sources. All book/render epochs and render/loading/text writes,
PDF cancellation, book replacement, EPUB/TXT stale rendering and PWA call sites were
reviewed. Render current checks retain book epoch, render epoch, document identity and
visibility guards. Completed PDF loading handles intentionally own the document until
book replacement; pending loads now cancel separately.

AI text still prefers Groq with configured Gemini backup; vision still prefers Gemini
when configured. Abort must never trigger backup requests. No keys/models/endpoints,
provider policy, sanitization allowlists, CSP or credential storage policy were changed.
Provider tests use fake keys and mocked responses; they do not claim real-provider
availability or spend user credits. Task replacement, epoch/target staleness, no-key,
error and abort behavior are covered without external AI traffic.

Navigation touch/wheel and PDF capture-phase click suppression remain inline. Capture
suppression precedes selection's bubble click; PDF touch is excluded from drag selection.
Non-PDF touch long press does still exist in selection.js despite an old navigation
comment saying sentence long press was removed. Its cancellation and touchend ordering
are included in this audit. Stale tap coordinates are cleared by invalidation; grammar/
level actions use captured text rather than re-hit-testing coordinates under overlays.

## Verification / release

Exact local, CI, PR and production results are recorded in MIGRATION_STATUS.md and
HANDOFF.md. Run the two required suites plus migration_audit_browser.py and
app_shell_versions.py. Production audit uses the real HTTPS URL with service worker
active, cache-disabled reloads and offline reload, and the same no-secret fixtures.
Tablet manual follow-up: cold-start installed PWA, expand a word to its sentence on a
multi-column PDF, pinch then tap, cancel a long press, background during PDF opening and
reopen, then launch offline. Physical Android system gesture behavior still needs the
actual tablet even when browser emulation passes.

## Completion review — 2026-09-08

Original findings 1–11: fixes remain present and are being revalidated against the fully
modular application. Current execution order is the 18-file order in ARCHITECTURE.md;
startup and global-symbol checks now assert that entire order, not merely the first two files.
No new migration or feature extraction is part of this maintenance audit.

12. **FIXED — PDF fallback lost the exact glyph offset.** Reproduction: in a real two-column
    PDF, return the text-layer element from the native caret API while targeting `Second`
    in `Left sentence 0. Second sentence.`. The old fallback returned `Left sentence 0.`.
    Root cause: nearest-span selection supplied a text node but no offset, so the first
    sentence on that node won. `caretRangeAt` now recovers the nearest character rectangle
    only inside the closest PDF item, preserving normal native carets and overlay behavior.
    Regression: `PDF element-caret fallback uses exact glyph offset`, plus ten visible
    real-PDF taps, repeated wrapper taps and exact visual highlight checks.
13. **FIXED — audit fixture invalidated its own PDF geometry.** The smoke destroyed the
    loading task before selection assertions and could keep a text layer replaced by a
    resize after entering immersive mode. Default tiny viewport also let an update banner
    cover tap coordinates. The test now keeps the real PDF alive, waits for layout before
    rendering, uses a tablet viewport, checks that all ten tap points hit that live layer,
    and destroys the loading task after selection. Assertions were strengthened, not relaxed.

Additional regression checks cover blur/book-change cleanup, actual upload replacement,
text AND vision cancellation during fetch (one request, no fallback), stale PDF completion
using loadingTask.destroy without clearing a replacement task, and all classic scripts once.
AI requests use fake credentials with transport mocks; no real provider calls or user credits.

Local final verification: PDF UX, learning UX, migration audit, app-shell versions and
both CDP transport tests PASS. HTTP cold/hard/offline startup and real two-column PDF
geometry/rendering pass with clean console. CI/production release verification pending.

14. **FIXED — a disconnected CDP socket could spin forever.** A closed socket returns empty
    bytes; `read()` kept retrying without progress. The deterministic transport test failed
    on the second read after EOF before the fix. It now raises ConnectionError immediately,
    exposing the transport failure instead of hanging/masking a test result. CI runs
    `tests/browser_cdp_transport.py` alongside version verification.

15. **FIXED — first service-worker installation announced an update.** Reproduction: clear
    SW/cache data in the disposable browser, navigate, wait for ready and controller; an
    update banner appears although this is the initial installation. clients.claim triggers
    controllerchange for the first controller too. Remember whether a controller already
    existed and show the banner only on replacement. Coverage checks a real clean install
    and that subsequent controller events create exactly one banner.

16. **FIXED — idle drag cleanup removed a completed selection highlight.** Reproduction:
    create a text highlight, then dispatch pointerup outside the reader without an active
    drag. The global cleanup deleted the shared CSS Highlight entry. It now deletes that
    entry only when a transient drag range existed; explicit selection invalidation still
    clears persistent highlights normally. The new regression preserves completed highlights
    and retains pointercancel/blur/book/background cleanup assertions.

Fit-page regression timing was also reproduced: its assertion ran before the asynchronous
fit render completed; afterward the page was 603×804 inside 1165×820 with zero errors.
The unchanged fit assertions now wait for the existing pending-render counter to reach zero.

The short-lived reverse-alignment flash could also expire before the Python assertion.
Diagnostics confirmed unchanged request count (6 before/after), valid alignment and no
errors. The regression now observes the actual class activation during the real touch event
with a bounded/disconnected MutationObserver, and still requires zero extra lookup calls.

17. **FIXED — PDF highlights shifted subsequent words away from the canvas.** A real
    PDF tap on “sentence” moved all following glyphs approximately 79 CSS px left.
    The broad PDF span rule made nested word/selection wrappers absolute and reapplied
    text-item transforms; the universal font rule also replaced the PDF font. Keep these
    two wrapper classes in normal flow, inherit the complete font and disable their own
    transform. Regression failed before the fix and now checks every glyph's x/y/width/
    height before/after visited-word and sentence highlighting at 100% and 250% with pan.
    Existing multi-column and repeated-tap assertions remain intact.

Android installation investigation: production Page.getInstallabilityErrors returned [];
manifest parsing had no errors, standalone start URL/scope were valid, actual PNG dimensions
were 192×192 and 512×512, and service worker was active. No confirmed server-side install
blocker. Physical Android/WebAPK installation remains device verification; browser and
reported install symptom requested from user. Chrome installation criteria reference:
https://web.dev/articles/install-criteria . New audit coverage checks manifest, installability
and actual icon dimensions locally and on production.

Production before release served the current baseline modules (including selection f1bc170d29d8,
PWA lifecycle a6f5fd747625), with HTML max-age=0,must-revalidate. Current uncommitted fixes
cannot appear there until PR/CI/merge/deployment. Final verification will compare content
and test a real worker replacement, then cold/offline reload.

Alignment observation deadline now starts with pointerdown itself: starting it during an
earlier CDP setup command could expire before the touch even began when the client was
scheduled late. The event-based activation assertion and unchanged request count pass.

The learning tap helper now queues touchStart AND touchEnd before waiting for CDP replies,
so a delayed client reply cannot stretch the intended tap into the app's 380ms long press.
A deterministic transport test requires both frames before the first reply, handles an
interleaved event and reversed reply order. Diagnostic pointerdown/up/click timestamps are
retained on assertion failure. No application gesture thresholds or assertions changed.
