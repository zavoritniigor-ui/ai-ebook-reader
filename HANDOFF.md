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

Status: **idle**. Current branch: dev.

Task: The user requested fixes for 4 confirmed audit defects:
1. Book identification mixing bookmarks/notes (books with the same name and size used the same `localStorage` key).
2. EPUB embedded images failing to load because they requested via the server rather than the `JSZip` archive.
3. EPUB chapter paths with `../` failing because paths were concatenated instead of normalized.
4. Voice trial TTS not cancelling upon background activity stop.

**Fixes**:
1. Added `file.lastModified` to `bookKeyFor()`. If a new key isn't found, we fallback to the old key (`reader_bookmark_..._size`) and automatically migrate it to the new key. Fixed in both `js/navigation.js` and `js/pdf-ink.js`.
2. Extracted `img` parsing in `loadEpubChapter()` to replace image `src` with proper base64 `data:` URIs directly loaded from `state.epubZip`.
3. Created a `resolveEpubPath()` function to evaluate `../` and `./` paths for EPUB chapter items inside `initEpub()`.
4. Added a strict check inside the `setTimeout()` for the Voice Trial: `if (gen === state.ttsGen) ttsSynth.speak(u)`. Since `state.ttsGen` is incremented during any activity stop (`stopGlobalTTS()`, `ttsSynth.cancel()`), the callback gracefully skips the trial playback if interrupted.

Also kept an uncommitted fix from `js/selection.js` related to `anchorCaret` logic (searching the text node using `TreeWalker` instead of direct `firstChild`), which ensures multiple taps on the UI don't drop the context block anchor.

Release code commit: e9c3632 (fix) + pushed to `dev`.
PR #76 MERGED (squash); CI checks passed.

**Follow-up (this session)**: that `anchorCaret` fix was actually independently diagnosed and
written by THIS session while investigating the user's own bug report (tap a PDF sentence's
first word, press the translation popup's "select" button twice — the 2nd press selects the
wrong text — plus a bilingual "sentence beside its own-language translation in an adjacent
column" layout concern) — it landed bundled into e9c3632/PR #76 because both sessions share
one working directory/index, and whichever session runs `git commit` first picks up ALL
currently-uncommitted changes, not just its own. Root cause, precisely: the first "select"
press wraps the just-selected text in a new `span.sel-word` (PDF path) — when the tapped word
IS the sentence's first word, that new span lands INSIDE the pre-existing `span.word-visited`
around the tapped word, replacing its `firstChild` with an element instead of a text node, so
the old direct `firstChild` check in `anchorCaret` silently fell back from the reliable word
anchor to raw-coordinate hit-testing on the second press.
Added `tests/pdf_sentence_reselect_browser.py` (commit 6a9e805, dev) — wired into CI — using the
real PDF.js-rendered two-column synthetic fixture (`pdf_bytes(two_columns=True)`, the same
"original beside its translation" layout the user described) to reproduce the exact DOM-mutation
sequence the bug depends on. 9/9 checks pass locally AND against production (the fix was already
live by the time this session finished writing the test): the 2nd press still selects exactly
the same sentence as the 1st, and no press ever bleeds text across the column boundary — this
also directly confirms the bilingual-column layout stays correctly isolated per column. Full
existing regression suite re-run locally — all pass, no regression from the other 4 audit fixes
in the same commit.

**Still open from the user's report — not yet investigated**: a scanned PDF opened from Google
Drive showed a large text-layer/rendering offset, and a tapped word was misread/replaced by a
different one during sentence selection on that same file. Not reproduced or root-caused yet —
this needs either the actual file or precise repro details (does it happen on any sufficiently
large/rotated scanned PDF regardless of source, or specifically Drive-originated ones; does
zooming change the offset) since this sandbox cannot fabricate a realistic OCR'd scanned PDF to
test against, and `js/pdf-render.js` already has real, working fixes for the ONE previously-known
text-layer/canvas sub-pixel drift under pinch-zoom (see its own comments) — so a "great" (not
sub-pixel) offset points at something not yet identified. Next agent: ask the user for the file
(or a shareable reproduction) before attempting a fix.

Exact next action: wait for the user to confirm the fixes and verify everything works as
expected, AND report back on the still-open scanned-PDF offset/misread-word issue above (repro
details or the file itself needed to proceed).

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
