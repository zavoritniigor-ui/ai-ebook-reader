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

Status: **idle**. Branch: `dev`. PR #79 merged, production verified.

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

Unrelated untracked scratch files and tests/language_tts_browser.py are untouched.

Still open separately: the reported scanned-PDF text-layer offset/misread word
(a DIFFERENT PDF, image-based/OCR'd, from Google Drive — not the text-based
bilingual-column PDF above) needs the actual affected file or a reproducible
fixture. Do not claim it is fixed.

Exact next action: wait for the user to confirm the bilingual-column selection
fix on their real book, and provide the scanned-PDF file (or precise repro
details) for the still-open offset/misread-word issue above.

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
