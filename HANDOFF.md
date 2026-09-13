# AI Ebook Reader — Agent Handoff

This file is the shared handoff state between Claude Code and Codex. The 19-step
modularization migration is **COMPLETE** (see `MIGRATION_STATUS.md`) — the repository is in
normal maintenance mode, and from here on this file hands off ordinary unfinished tasks
(bugfixes, features, chores) between agents/sessions, not migration steps.

Before starting or resuming work, every agent must read:

- AGENTS.md (mode-check section first)
- CLAUDE.md if applicable (mode-check section first)
- ARCHITECTURE.md — the primary map of the codebase
- HANDOFF.md (this file)

`AUTONOMOUS_MIGRATION.md`, `MODULARIZATION_PLAN.md`, and `MIGRATION_STATUS.md` are historical
records of the completed migration — read them only if investigating that history, not as
part of normal task startup.

## Current handoff

Status: **idle**. Branch: `dev`. PR #93 merged, production verified.

Task: User approved the supplied format-expansion plan (`go`); implementing its
first maintenance increment. See `FORMAT_SUPPORT.md` for exact capabilities,
limitations and remaining increments.

Completed: FB2 raster binaries/all bodies/XML encoding; guarded FB2.ZIP; pinned
local Marked + sanitization + offline precache; EPUB path resolution and safe SVG
rasterization/cover images; image/font-aware pagination; character-offset bookmarks
and reflow; word selection across inline formatting. Added synthetic format suite
to CI and architecture/support documentation.

Concurrent-session incident: the other session committed partial format changes
into 9cab25d (PR #78) but omitted the new Marked vendor files and overwrote the word
index. Those changes are repaired here. The user confirmed the other session is
stopped. Its whitespace-tap/translation-dismissal fix is retained. Auto-merge on
#78 was temporarily disabled until this complete file set passes CI.

Local validation: full pdf_ux_browser.py, learning_ux_browser.py,
migration_audit_browser.py and pdf_sentence_reselect_browser.py passed. The final
formats_browser.py (22 checks), app_shell_versions.py and browser_cdp_transport.py
passed. One isolated Chrome cold-start timed out; retry passed. Node is not in the
local PATH; CI performs the JavaScript syntax checks.

Release implementation: a83a75a, pushed to origin/dev. Earlier format code is
also in 9cab25d. All initial 20 format checks, full local suites and GitHub CI passed.
PR #78 merged as 77fe77c after CI passed. Final integration review found that
cross-node reflow selection needed the same margin hit check as the retained UI
fix. Follow-up adds that check, safe failure for invalid SVG namespaces/dimensions,
and reflow for fonts that finish after the timeout. All 22 targeted format checks
pass. Follow-up: d53cb75 + synchronization 6eeb9e6, PR #79 open. One CI run
passed, another exposed a reproducible pre-existing PDF test setup race: a
viewport resize render invalidated the tapped word between assertions. The test
now waits for a quiet render interval after initPdf, without changing its selection
assertions or the production PDF code. PR #79 MERGED (squash) as main release
commit 8602091 — CI green, production verified (script hashes match).

**Separate concurrent fix (this session), bundled into the same PR #79 since both
sessions pushed to `dev`)**: the user shared a screenshot of a real bilingual
textbook PDF page (French left column, English right column, row-aligned —
translation printed directly opposite each original sentence) with several lines
carrying an inline bold marker word mid-sentence ("Premièrement,"/"First," — the
same "Firstly/Secondly/..." style real bilingual books use). Selecting a sentence
grabbed text from BOTH columns at once, and words on the tapped column were
sometimes read/detected with the OTHER column's language.

Root cause: `js/selection.js`'s `pdfVisualGroup()` decided column membership by
clustering each individual PDF text fragment's own left edge — but a PDF splits a
line into a new fragment wherever the style changes mid-sentence, and that
fragment's own left edge (deep inside the line) says nothing about which column
the whole line belongs to. Pooling every fragment's left edge together let these
mid-line values interfere with the true column boundary. A naive "group by Y
first" fix doesn't work either: the two columns' lines are often at the EXACT
same height (row-aligned translation), so Y-only grouping merges both columns
into one row immediately.

Fix: two-stage clustering — Y-bands first (can span both columns' same-height
lines), then within each band, cut into per-column "segments" wherever the gap
between one fragment's RIGHT edge and the next's LEFT edge exceeds the threshold
(a real column gutter, vs. a same-line style break where the cursor continues
with near-zero gap). Only each segment's own start-X feeds the column-clustering
step, so inline style breaks no longer pollute it.
Commit 0804cd1 on dev (merged into main via #79, 8602091). Tests:
`tests/pdf_bilingual_columns_browser.py` (new, wired into CI, 10/10 checks) using
a new `bilingual_pdf_bytes()` fixture in `tests/browser_cdp.py` built with an
ACTUAL font change (Helvetica → Helvetica-Bold) and runs shown continuously (no
repositioning between them), so fragment gaps come out realistically small within
a line and large across the true gutter — confirmed the test genuinely fails
without the fix (reverted locally, re-ran, restored). Full existing suite
(including the earlier, differently-shaped `pdf_sentence_reselect_browser.py`)
re-run locally and against production after merge — all pass.

**Separately, two more concurrent commits landed from the other session** while this one was
working: `4add2b3`/`2f9890c` ("enforce strict pointer distance check across all word selection
paths" + a CI-coordinate fix), merged as PR #81 (`5dea158`). Unrelated to anything below;
mentioned only so the commit hashes in this file's history make sense.

**TTS "doubled voice" — round 2 (this session)**: the user reported the echo/doubled-voice
symptom (see the earlier PR #74 entry, now superseded further down this file's git history)
PERSISTED even after that fix, and asked to check everything related to speech again.

Root cause, separate and additional to PR #74's cancel()-timing fix: every real speak site
(`speakText`, `speakInLang`, `speakCurrentSentence`'s per-segment loop in `js/tts.js`) set
`utterance.lang` from our own hardcoded canonical language string (`LANG_TAGS`/
`voiceForLangCode`'s `fullLang`, e.g. `'fr-FR'`) while setting `utterance.voice` independently
from whichever real voice `pickBestVoice`/the user's saved choice resolved to. `pickBestVoice`
only filters by a 2-letter language PREFIX, so a device's actual best French voice can
genuinely be `fr-CA`, not `fr-FR` — meaning `utterance.lang` and `utterance.voice.lang` can
disagree. A mismatched `lang`/`voice` pair on a `SpeechSynthesisUtterance` is a documented way
to confuse Android's bridge to the system TTS engine into trying to satisfy BOTH signals at
once, which can play the utterance twice, nearly simultaneously. Unlike PR #74's bug, this also
happens with ZERO `cancel()` involved (the plain `speakSegment`→`onend`→`speakSegment` chain
during ordinary continuous page reading) — likely the DOMINANT path, since continuous reading
is how most TTS listening actually happens, which is why PR #74's fix alone didn't fully
resolve the report. The one place that already did this correctly (by coincidence) was the
settings voice-preview sample in `js/main.js` — its correctness is exactly what pointed at the
fix.

Fix: `setUtteranceVoice(u, lang, voice)` in `js/tts.js` — always derives `utterance.lang` from
the ACTUALLY SELECTED voice's own `.lang` when a voice was found, falling back to the canonical
`lang` string only when no voice was resolved. Applied at all three real speak sites plus the
voice-preview sample (now sharing the helper instead of duplicating the already-correct logic).
Commit `d212bff` on dev (cherry-picked there after an initial commit accidentally landed on
local `main` — caught before pushing, `main` reset back to `origin/main`, no bad push happened);
reconnect-merge `4448e24`; merged into main via PR #82 (`371ea98`).
Tests: `tests/tts_lang_voice_mismatch_browser.py` (new, wired into CI, 6/6 checks) mocks two
voices whose own `.lang` deliberately differs from the canonical mapping (`fr-CA` instead of
`fr-FR`, `en-GB` instead of `en-US` — the exact real-world mismatch scenario) and proves
`utterance.lang` always ends up matching `utterance.voice.lang` at all three real speak sites.
Confirmed the test genuinely fails without the fix (reverted locally, re-ran — timed out because
`setUtteranceVoice` no longer existed, restored). Full existing suite re-run — all pass. CI green
on both runs. Production verified: `tts.js?v=1f9cc32ecc47`/`main.js?v=bfbc1f4193d2` match, and
`tests/tts_lang_voice_mismatch_browser.py` re-run directly against production — all 6 pass.

**Shared-workspace note for the next agent**: this session hit the other agent's `git
checkout`/reset activity on the SAME physical working tree multiple times this round —
(1) an in-progress edit to `js/selection.js` briefly vanished and had to be reapplied after
being overwritten mid-task; (2) the local `dev`/`main` branch pointers got shuffled by the other
session's own sync commands while this session was mid-commit, causing one commit to land on
local `main` by mistake (caught and fixed as noted above, nothing was pushed); (3) the other
session has an ACTIVE, UNCOMMITTED edit to `js/lang-detect.js` (adds `œ`/`Œ` ligature support to
the FR/EN tokenizer regex and several words to `EN_WORDS`, including `'french'`) that is NOT
part of any commit referenced here and was deliberately left untouched — **note for whoever
commits it next**: with that WIP applied, `tests/language_context_browser.py`'s
`"French: Où est la gare?"` case fails (`gare` gets misclassified as English) — verified this
does NOT happen against the actually-committed code (confirmed by bypassing both the HTTP cache
and the service worker, and testing on a completely fresh Chrome profile), so it's a real
regression IN THAT WIP specifically, not in anything currently merged; worth a look before it's
committed. This session did not fix it — not this session's file, not part of the TTS task.
Also confirmed harmless: the local HTTP test server on :8765 died at some point mid-session
(cause unclear, possibly cleaned up by the other agent) and was restarted; several stale/leftover
Chrome tabs on the long-lived shared CDP port caused a run of misleading
"Inspected target navigated or closed"/"Access is denied" test failures that had nothing to do
with the app — resolved by using a separate CDP port with a completely fresh browser profile for
this session's own verification runs, per `shared-workspace-git-race` in this session's own agent
memory (not part of this repo).

Unrelated untracked scratch files (this session's `tests/language_tts_browser.py`, and many more
from the other session — `fix.js`/`fix.py`/`fix_epub.py`/`run_ci.sh`/`run_ci_python.sh`/
`test*.{js,py,html}`/`viewer.css`/etc.) are untouched.

Still open separately: the reported scanned-PDF text-layer offset/misread word (a DIFFERENT PDF,
image-based/OCR'd, from Google Drive — not the text-based bilingual-column PDF from the earlier
entry) needs the actual affected file or a reproducible fixture. Do not claim it is fixed.

**PDF word-hitbox "stateless" fix (this session)**: user reported that in the PDF reader, tapping
blank white space near a word does nothing — UNTIL that word has been tapped once. After that,
the SAME blank spot (reported radius: 3-4 cm) reopens that word's translation popup, even after
the popup was closed; several previously-tapped edge words leave behind several such dead zones.

Root cause: `js/selection.js`'s `selectWordAtPoint()` had an "already-highlighted word tapped
again" fast path — meant only for literally re-tapping the SAME already-selected word — that
returned a `.word-visited` match immediately with NO distance check at all, unlike a fresh
(never-selected) word, which is always validated via `isPointInRects()` (10px tolerance in PDF).
Since `.word-visited` is intentionally PERMANENT (the app's "already looked up" reading aid,
never removed when the popup closes) and `pdfNearestSpan()` has no maximum search distance by
design (needed to recover from pdf.js's coordinate snapping during pinch-zoom), any blank-space
tap for which that word happened to be the geometrically nearest text — no matter the distance —
fell through this unguarded shortcut. Confirmed empirically (not just reasoned) before writing
the fix: `caretRangeAt()` at the identical blank point resolves to plain unwrapped text before
selection (correctly rejected downstream) and to text inside `.word-visited` after selection
(bypassing the check entirely).

Fix: the fast path now runs the same `isPointInRects()` check the fresh-word path already uses,
using the highlighted word's own rects. No distance constants reduced, no arbitrary px offsets,
no document-specific exceptions, PDF coordinate/geometry logic (`pdfNearestSpan`/`pdfCaretInSpan`/
`pdfVisualGroup`) untouched.
Commit `c9b9fb8` on dev; reconnect-merge `334eead`; merged into main via PR #84 (`eac16b0`).
Tests: `tests/pdf_hitbox_stateless_browser.py` (new, wired into CI, 17 checks) using a new
`edge_words_pdf_bytes()` fixture in `tests/browser_cdp.py` (one word hard against each page
margin, one isolated lower on the page) and real touch dispatch (the actual mobile tap path,
including the popup's own document-level close listener in `js/ui-tooltip.js`): blank taps before
selection, same-spot-after-close, 5/10/20/40/300px margins, left-edge word, right-edge word,
multiple previously-selected words, and a direct `selectWordAtPoint()` call at the touchstart/
pointerdown level. Confirmed the test genuinely fails without the fix (reverted locally, re-ran —
AssertionError on the right-edge check, restored). Full existing suite re-run — all pass. CI green
on both runs (fresh checkout, so the other session's uncommitted `lang-detect.js` WIP — see below
— had no bearing on it). Production verified: `selection.js?v=649429fd17c4` matches, and
`tests/pdf_hitbox_stateless_browser.py` re-run directly against production — all 17 pass.

**Reading stats feature landed (concurrent session, PR #86, `0900c8b`)**: "Add reading stats,
four languages, and grammar rules" — a new `js/learning-stats.js` (per-page word/vocabulary
coverage popover, CEFR bands, persisted per book) plus four new interface/target languages
(Chinese, Korean, Hindi, Irish) and French/English grammar-rule prompts for Ask AI. Not this
session's own work — see PR #86 itself and `ARCHITECTURE.md`'s `learning-stats.js` row for
details.

**Reading stats position-independence fix (this session)**: user asked for an explicit audit of
that new feature's page-statistics logic for position-dependent counting — reported that tapping
words near a page's end, then returning to its beginning, made the statistics appear to "reset"
toward 100% independent, as if help given near the bottom stopped counting.

Confirmed the suspicion: `tokenIsOnCurrentPage()` DID use position-dependent logic for
reflowable formats (PDF already always returned `true` unconditionally) — it tested each
candidate word's `getClientRects()` against `els.container`'s LIVE `getBoundingClientRect()`
("is this word in the on-screen viewport right now") instead of the reader's own stable,
already-tracked `state.pageInChapter`. Both the page's total word count AND which specific taps
got recorded went through this same filter. Confirmed reproducible with a completely realistic
trigger: toggling immersive-mode (a normal, frequent interaction) changes `#reader-container`'s
actual height, and with the old check this alone changed a page's word count (153→142 in one
measured run) with zero navigation and zero change to `state.pageInChapter`. Cleanly isolated
this from a SEPARATE, deeper, pre-existing issue found during the same investigation and
deliberately left UNFIXED (out of scope for "page statistics logic," per the user's own "do not
modify unrelated functionality"): `#reader-pages { height: 100% }` means the browser's own CSS
column layout silently re-flows all content across columns whenever the container resizes,
independent of `state.pageInChapter`/`totalPagesInChapter` — a pagination/resize-sync issue, not
a stats-computation one. Whoever picks this up next: it's a real, separate bug worth its own
task, not something this fix touches.

Fix: `tokenIsOnCurrentPage()` now calls `pageIndexForRange()` (`js/tts.js`) — the same stable,
computed column-index function TTS auto-page-turn already trusts — compared against
`state.pageInChapter`, instead of live viewport geometry.
Commit `f8ba55a` on dev (bundled with the concurrent session's own further, interleaved work on
`js/selection.js`/`js/translation.js`/`js/grammar-svo.js` — centralizing help-recording through
one `recordHelpForSpan` call per entry point — since both were mixed in the same working tree and
couldn't be cleanly separated; full suite passed with everything combined); reconnect-merge
`7dfd7e4`; merged into main via PR #87 (`e5760ec`).
Tests: `tests/learning_stats_position_independence_browser.py` (new, wired into CI, 18/18
checks) uses a REAL multi-page markdown document with genuine CSS-column pagination
(`goToPageInChapter`) — unlike the sibling `learning_stats_languages_grammar_browser.py` suite's
PDF-shaped stub, which always short-circuits `true` in `tokenIsOnCurrentPage()` and could never
have exercised this path (explaining why the existing suite never caught it). The definitive,
isolated check freezes the actual rendered layout (`els.pages` keeps its real measured height)
and shrinks ONLY `els.container`'s reported rect — total stays unaffected when nothing about the
real layout changed; confirmed (by temporarily reinstalling the old implementation at runtime)
that this exact manipulation is what the old code got wrong (153→51 in one run). Also covers the
full required reproduction: bottom/middle/top taps; scroll to bottom/top; navigate away and back;
random tap order; explicit random-vs-sequential-order equivalence; 10 random-position taps with
repeated scrolling and a simulated popup close; word taps combined with a paragraph translation;
revisiting a page after visiting another; paragraphs selected out of order. Confirmed the test
genuinely fails without the fix. Full existing suite re-run — all pass. CI green on both runs.
Production verified: `learning-stats.js?v=67246f255f39` matches, and
`tests/learning_stats_position_independence_browser.py` re-run directly against production — all
18 pass.

**Reader pagination/resize-sync fix (this session)**: the user explicitly asked to fix the
CSS-column-reflow-on-resize issue flagged (and deliberately left unfixed) by the entry above.

Root cause, confirmed by tracing the full pagination lifecycle: `#reader-pages { height: 100% }`
means the browser's own CSS column layout silently re-flows content whenever
`#reader-container`'s rendered box changes size — but the only trigger for re-syncing
`state.pageInChapter`/`totalPagesInChapter`/`columnStep()` with that layout was the window's
`'resize'` event. Immersive-mode toggling changes `.workspace`'s CSS (`margin-top`/`height`),
which cascades down to `#reader-container`'s actual rendered size — but that whole chain is
CSS-class-driven and **never fires a `window` `'resize'` event**, so the app's pagination state
silently went stale relative to what the browser had already re-flowed to. (Any other
CSS-only container-size change — a collapsing sidebar, a mobile browser's dynamic address bar —
has the identical blind spot; immersive-mode was simply the concretely reported/reproduced case.)

Previous behavior: only `window.addEventListener('resize', ...)` triggered `repaginateBook()`
(reflowable formats) / the preserve-render path (PDF). Any container resize that didn't also
resize the window went undetected — pagination state and the actually-rendered columns could
diverge indefinitely until an unrelated real window resize happened to occur.

Fix: replaced that listener with a `ResizeObserver` on `els.container` itself (`js/navigation.js`,
`containerResizeObserver`) — the one true signal for "this container's rendered box actually
changed", regardless of cause. It is a strict superset of the old trigger for this layout: a
window resize that changes the container still fires it; one that doesn't (width growth past
`#reader-container`'s 900px `max-width`) correctly triggers nothing. The existing
offset-preserving `repaginateBook()` logic (capture `state.bookTextOffset`, re-measure via
`paginateContainer()`, re-resolve that same offset to a page via `pageForBookTextOffset()`) was
already correct — only the trigger was unreliable, so it was left untouched. A sub-pixel
`lastContainerResizeSize` guard avoids re-triggering on rounding noise across the many
intermediate box-size notifications a single CSS transition (`.workspace`'s 0.3s
`margin-top`/`height` transition) fires; the pre-existing 250ms `resizeTimer` debounce is kept
(same variable name — `tests/migration_audit_browser.py` references it directly).

Tests: new `tests/reader_resize_sync_browser.py`, wired into CI. First proves the bug is real by
disconnecting the observer (`containerResizeObserver.unobserve`) and showing an immersive-mode
toggle's container resize goes completely undetected (zero `repaginateBook()` calls despite a
real, measured height change: 842→900 in one run), then reconnects it and shows the identical
resize is correctly detected and resynced. Covers the full required matrix on a real multi-page
markdown document with mixed paragraph lengths: viewport resize wider→narrower and
narrower→wider; immersive-mode toggle on the first/middle/last page; repeated rapid toggling
(debounce collapses a 6-toggle burst to one resync); an active word highlight (the
`.word-visited` span and its text survive); previously-recorded help/translation occurrences (the
specific occurrence records survive with their `normalized` word intact — the page-scoped
`total`/`helped` AGGREGATE is explicitly allowed to change, since reflow can genuinely move words
to a different page, and stats are keyed by an absolute chapter-text occurrence id, not by page);
and TTS staying active with a valid queue through a mid-read resize. Every scenario also asserts
`state.pageInChapter` stays in-range and that `state.bookTextOffset` still resolves back to the
page actually shown. `tests/pdf_ux_browser.py`'s pinch-test setup toggles `immersive-mode`
directly and now correctly triggers this same resize response, which could otherwise land
mid-gesture; added a settle-wait before its render-counting checks begin, mirroring the existing
pattern in `tests/pdf_sentence_reselect_browser.py`. Ran the pagination-adjacent targeted tests
first (`tests/formats_browser.py`, `tests/migration_audit_browser.py`), then the full existing
regression suite — all pass. `node --check` isn't available in this sandbox; CI runs it, and the
extensive live-browser test execution already proves the file parses/runs correctly in a real JS
engine. Commit `593003f`, reconnect-merge `a0cd18b`, merged into main via PR #89 (`c6e12d8`).
Production verified: `navigation.js?v=cd49774de655` matches, and
`tests/reader_resize_sync_browser.py` re-run directly against production — all pass.

Remaining risk: untested here (no way to in this sandbox) — a real orientation-change event and
real dynamic mobile-browser-chrome show/hide on an actual device. Only their CSS-container-resize
*effect* is simulated via CDP viewport/class changes, which is the actual mechanism this fix
targets, so the fix should generalize, but real-device confirmation is still open.

**PWA installed-shortcut dead-address fix (this session)**: user-reported — installing the PWA
from Chrome and later opening the resulting shortcut opened a dead address.

Traced the full chain: `manifest.webmanifest`'s `start_url` was `"./index.html"`, resolved
against the manifest's own URL (not the document's) to `https://ai-ebook-reader.pages.dev/index.html`
— confirmed via `Page.getAppManifest` that this is EXACTLY what Chrome bakes into the shortcut,
with zero installability errors (Chrome installs it without complaint). Cloudflare Pages
308-redirects any literal `/index.html` request to `/` — a platform default for files named
`index.html`, not something this repo configures (confirmed via `curl -I`; no `_redirects`/
`_headers` file exists here). Once the service worker takes over navigation (every launch after
the very first), Chrome refuses to use a Response whose own `.redirected` flag is `true` to
satisfy a navigation's `respondWith()`, and fails the ENTIRE navigation with `net::ERR_FAILED` /
"this page may have moved to a new address" — not a JS exception (`networkFirstForNavigation()`
resolved cleanly with a normal 200 Response), a silent browser-level rule with nothing in the
console to point at it. Deterministic: every single launch, online or offline, not intermittent.

Reproduced from scratch (a local server built to mimic ONLY Cloudflare's one relevant redirect,
serving this repo's real files) and confirmed both contributing paths: a live `fetch()` of that
URL (`event.request.redirect` is forced to `'manual'` for navigations, so a redirecting target
resolves to an `opaqueredirect` Response) and — the actual persistent cause — the CACHED copy of
`./index.html`, since `cache.addAll()` followed that same redirect at install time and Cache
Storage preserves `redirected:true` on it forever.

Fix: `manifest.webmanifest`'s `start_url` is now `"./"` (Cloudflare never redirects that, so no
future install ever enters this state; `id` stayed `"/"` so Chrome treats this as an update to
the same installed app, not a new one), and `sw.js`'s `networkFirstForNavigation()` now passes
every candidate Response through the new `stripRedirectHistory()`, which reconstructs a plain,
history-free Response whenever `.redirected` is true. The second half is what lets an
ALREADY-installed shortcut — still permanently pointed at the old `/index.html` — self-heal the
moment the updated worker activates, online or offline, with **no reinstall required**: this was
verified directly against production with a fresh Chrome profile (new-install path: navigating
straight to the resolved start_url `/` loads the real app) AND by registering the worker then
navigating straight to the OLD stale `/index.html` URL, which now also loads the real app instead
of `chrome-error://chromewebdata/`.

Also fixed in the same PR: `tests/reader_resize_sync_browser.py` (added by the previous fix) was
never actually wired into `.github/workflows/ci.yml` despite being recorded as such — a real gap,
caught while adding this fix's own CI entry.

Commit `bed04b7` on dev; merged into main via PR #91 (`508f776`). New
`tests/pwa_start_url_browser.py` (15 checks) runs its own tiny local server (the shared CI one on
8765 doesn't redirect anything) mimicking the one Cloudflare behavior this bug depends on;
confirmed by reverting `sw.js`/`manifest.webmanifest` locally and re-running that the manifest
check fails first without the fix. Full existing suite re-run — all pass. CI green (one run hit
the known Chrome-CDP-startup flake, rerun passed). Production verified as described above; also
confirmed live: `manifest.webmanifest`'s `start_url` is `"./"` and `sw.js` contains
`stripRedirectHistory`.

Remaining risk: real Android WebAPK install/update behavior (whether Chrome's periodic
background manifest-refresh actually re-bakes `start_url` for an Android home-screen shortcut,
vs. desktop where the fix above makes reinstall unnecessary regardless) was reasoned about but
not verified on a real device — there is no way to install a real WebAPK in this sandbox. The
`sw.js` self-heal (unaffected by whether the OS-level shortcut's own URL registry updates) is
what actually matters for BOTH platforms, and that half is directly production-verified above.

**Format compatibility audit (this session)**: user asked for a complete compatibility audit of
every document/file format the reader claims to support — import, render, navigate, TTS/
translation/stats correctness, mobile/tablet behavior, reopen, and graceful error handling.

Traced the COMPLETE supported-format list from the actual implementation, not documentation:
`index.html`'s `<input accept=...>`, `openBookFile()`'s extension router (`js/main.js`), and
FORMAT_SUPPORT.md all agree on 8 format families / 11 extensions — EPUB, PDF, TXT, DOCX, FB2/
FB2.ZIP, MD/MARKDOWN, HTML/HTM, RTF. No drag-and-drop handler exists anywhere (file picker only —
a fact, not a bug). Found one real mismatch: the UI's OWN "welcome" message (all 8 interface
languages) advertised only "EPUB, PDF or TXT", silently under-advertising the other 5 supported
families — fixed to list all 8.

Bigger finding: `tests/formats_browser.py` covers FB2/FB2.ZIP/EPUB/Markdown, and the `pdf_*`
suites cover PDF — but **DOCX, TXT, HTML/HTM and RTF had ZERO automated regression coverage**.
Writing that coverage (`tests/rich_text_formats_browser.py`, 41 checks — minimal hand-built OOXML
DOCX fixtures generated in-memory, no `python-docx` available) surfaced two real, confirmed bugs:

1. **HTML/HTM title leak + spurious blank first "chapter"** — the REAL, common case: uploading a
   full saved webpage (`<html><head><title>...</title>...<body>...`, not a bare fragment, which
   is the normal shape of an actual `.html` file). `initRichDoc()`'s HTML branch passed the raw
   file text straight into `safeHtml()`, whose allowlist neither renders nor drops `<title>` — it
   fell into the "not content, walk its children" branch, so the title's own text silently became
   visible reader content. Because that leaked text sat before the document's first real heading,
   `splitIntoChapters()` (starts a new chapter at every heading) turned it into an entire separate
   first "chapter" — **the reader opened directly on a near-blank page showing only the leaked
   title**, with the real content one chapter further in. Fixed in two places: `formats.js`'s
   HTML/HTM branch now parses via `DOMParser` and keeps only `.body.innerHTML` (mirroring how
   `loadEpubChapter()` already handles real XHTML spine documents, for the identical reason), and
   `core.js`'s `safeHtml()` now drops `<title>` outright as defense in depth.
2. `splitIntoChapters()` itself: a heading only starts a new chapter if something more than
   insignificant whitespace came before it — a lone `"\n"` text node between `<body>` and its
   first `<h1>` (common in hand-formatted/exported HTML) used to trigger the same spurious blank
   first chapter independent of bug #1; this is the general-purpose fix underlying it.
3. `initTxt()` had no empty-file guard unlike every other format — fixed for consistency (was
   silently "succeeding" into a blank single-page reader instead of the same clear error).

Also confirmed (not bugs): extension routing is case-insensitive and compound-extension-aware
(`.TXT`, `.Md`, `.FB2.ZIP` all route correctly); filenames with spaces and Ukrainian/Polish
characters work; RTF's documented "plain text only, no bold/italic/image" limitation
(FORMAT_SUPPORT.md) holds by design — building the RTF fixture confirmed bold/italic control
words ARE silently stripped along with the text formatting, as intended; error handling for
empty/corrupted/extension-mismatched/unsupported files was ALREADY robust across every format
before this change (clear localized message, state fully resets, `document.body` never left
inert, no uncaught JS errors) — this audit only added DOCX/TXT/HTML/RTF instances of that same
matrix. A DOCX-fixture-authoring pitfall worth remembering for next time (not an app bug):
mammoth.js's image reader needs a `wp:docPr` element as a sibling of `pic:blipFill` inside the
drawing — omitting it throws `Cannot read properties of undefined (reading 'attributes')`.

Commit `defec96` on dev; merged into main via PR #93 (`07cc990`). Regression tests: import/
render/content (headings, bold/italic, links, embedded images, Ukrainian/Polish/mixed-language
text, punctuation/quotes/apostrophes) for all four newly-covered formats; TTS extraction order
and cleanliness (no HTML/entities leaking); reopen/persistence (DOCX); a representative phone/
tablet/portrait/landscape/immersive-mode viewport matrix (DOCX — the shared pagination pipeline
is already viewport-tested via EPUB/FB2/Markdown elsewhere, so this wasn't repeated per format);
error handling across all four formats. Confirmed the empty-TXT regression test fails without its
fix (reverted locally, re-ran); the title-leak/chapter-split fixes were confirmed the same way
during interactive development before being formalized into the test. Full existing suite
re-run — all pass. CI green (one run hit the known Chrome-CDP-startup flake three times in a row
before a full — not just failed-job — rerun passed; noted in case this flake's rate has changed).
Production verified: `formats.js?v=a5f91e0fd24e` matches, and BOTH `tests/rich_text_formats_browser.py`
and `tests/formats_browser.py` re-run directly against production — all pass.

Remaining risk / not testable here: real physical Android/iOS device behavior for any format
(only Chrome DevTools viewport/touch emulation was used — explicitly not equivalent to a real
device); PWA-mode (installed standalone) file import specifically was not separately exercised
this session (the PWA-shortcut fix above covers navigation/launch, not the file-picker flow
itself, which should be identical in standalone mode but wasn't empirically re-verified there);
real Microsoft Word/LibreOffice-authored DOCX/RTF files with actual native numbered lists,
tracked changes, or complex styles were not tested (the DOCX fixture is minimal, hand-built OOXML
covering headings/bold/italic/links/images, not full Word-document fidelity — matches
FORMAT_SUPPORT.md's own stated scope, "not an exact reproduction of Word pages"); large-file
behavior (multi-MB documents) was exercised only via a large in-memory TXT fixture's pagination,
not a true multi-megabyte file across every format.

Exact next action: wait for the user's real-device confirmation that the TTS echo, the
bilingual-column selection fix, the word-hitbox fix, the pagination/resize-sync fix, the
PWA-shortcut fix, and this format-audit fix are actually resolved on their tablet/phone (this
sandbox has no real audio/Android TTS engine, physical touchscreen/orientation events, or real
WebAPK install to verify against); provide the scanned-PDF file (or precise repro details) for
the still-open offset/misread-word issue; whoever picks up the other session's `js/lang-detect.js`
WIP should check the `"gare"` regression noted in a previous entry before committing it (may
already be resolved — re-check against the current committed state first).

## Handoff rules

Before an agent stops because of token limits, context limits, session end, external interruption, or any other blocker, it must update this file.

The agent must record:

- the current task (what was asked, in one line);
- current branch;
- what has already been completed;
- what remains unfinished;
- files currently modified;
- whether changes are committed;
- commit hash if available;
- PR number if available;
- CI status;
- production deployment status;
- exact next action for the next agent.

When there is no unfinished task, this file should say so plainly (as it does now) rather
than describing stale work as if it were still active.

The next agent must continue from this recorded state and must not repeat completed work unless verification shows the state is wrong.

Never rely only on conversation memory.
Use Git, ARCHITECTURE.md, and HANDOFF.md as the source of truth for ongoing work;
MIGRATION_STATUS.md only for the historical record of the completed migration.

## Quick Wheel redesign — physical acceptance FAILED (2026-09-12)

The prior completion and physical-validation claims are superseded by the user's
explicit failed physical acceptance. Do not rely on them. PR #98 must remain Draft;
no merge, auto-merge, or production deployment is authorized.

Branch: `feature/bottom-quick-menu` (explicit user exception to the usual dev workflow).
Current work is uncommitted: `js/quick-wheel.js`, `index.html`, and
`tests/quick_wheel_browser.py`. Eleven persistent actions now render along a continuous
arc through requestAnimationFrame; gesture capture, velocity decay, smooth detent snap,
and animated open/close replace the static six-button model. Browser tests now check
visible movement, real action routing, print API invocation, and pairwise geometry.
Local behavioral tests and the full CI regression list are running. Latest logs:
`/tmp/wheel-tests.log`, `/tmp/wheel-regression.log`. A temporary Node runtime is in
`/tmp/node-v22.14.0-linux-x64/bin/node`. Local HTTP server: 8765; wheel CDP: 9222;
regression CDP: 9223. No changes pushed and no preview updated yet.

PR #98 verified Draft with auto-merge null. Production has not been changed.
Next: resolve remaining geometry/test failures, finish all regression checks, run
`tools/version_app_shell.py` then `tests/app_shell_versions.py`, commit relevant files,
push this feature branch only, verify draft PR CI and Cloudflare preview, and provide
measurements/screenshots for physical user review. Feature is NOT accepted or complete.
Preserve unrelated untracked files, including `tests/quick_wheel_drag_browser.py`;
it predates this task and is not part of this redesign's test suite.

## OpenAI restoration on Quick Wheel — 2026-09-12

User explicitly requires `feature/bottom-quick-menu`, PR #98 Draft, no merge.
Restored provider changes selectively from `feature/openai-provider` (`d35f3df`):
`index.html`, `js/core.js`, `js/ai-client.js`, `js/ui-tooltip.js`, provider browser
tests and explicit-selection migration tests. Preserved the newer tooltip dock
handler and all wheel/menu/print/UI implementation. No provider fallback.
Updated CI coverage for the existing stale drag suite and replaced its obsolete
six-item assumptions with real drag/settings integration assertions. Wheel and
PDF test setup now waits for rendered entrance/resize completion. Updated the
architecture provider description and regenerated shell versions.

Local validation complete: all 25 browser suites in the CI list passed, including
full PDF/learning, provider, both wheel suites, migration, format/rendering,
language/TTS and PDF selection suites. Also passed shell versions, CI suite
coverage and CDP transport checks. Initial full-run failures were resolved by
waiting for rendered entrance/PDF resize completion, resetting drag emulation,
and retaining the existing 10px PDF touch tolerance in its stale test assertions.
Rich-text passed on rerun after a page-startup timeout. Selection and wheel
application code remain unchanged. Logs: `/tmp/openai-full-suite.log`,
`/tmp/restore-*.log`, `/tmp/openai-*-retest.log`.

This entry accompanies the restoration commit on `feature/bottom-quick-menu`.
Release target: update the existing Draft PR #98 and Cloudflare branch preview
only. At commit time remote CI/deployment verification is pending; inspect PR
checks for the exact commit and immutable preview URL. No merge or production
deployment authorized. Physical wheel acceptance remains pending.

CI follow-up: first job attempt hit an intermittent FB2.ZIP fixture selection
failure; the rerun passed it and every suite through bilingual PDF, then exposed
a platform-dependent hitbox test assertion. Follow-up measures actual Range glyph
bounds and asserts rejection beyond the existing 10px tolerance; it no longer
assumes a browser must resolve a caret inside that optional tolerance. No app
code changed. New commit/preview CI must be verified after this follow-up.
