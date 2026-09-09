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

Exact next action: wait for the user to confirm the fixes and verify everything works as expected.

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
