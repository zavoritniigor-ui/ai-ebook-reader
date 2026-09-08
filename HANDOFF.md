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

Status: **idle**. No unfinished implementation, audit or release task.
Current branch: dev.

Task: user asked for parenthetical translation pairs (language-learning books put a
word/phrase immediately followed by its translation in parens — "bonjour (hello)",
"house (maison)") to be detected as an independent language segment in `js/lang-detect.js`,
in both fr->en and en->fr directions, including nested parens.

Root cause: `buildLanguageSegments` analyzed the whole input as one flat token stream and
picked ONE base language for it; a single strong anchor anywhere (e.g. "hello") could win
that whole-string vote, so a weak-only word elsewhere (e.g. "bonjour") could never be
recovered as its own segment even though it resolves correctly when analyzed alone. Fixed by
splitting top-level (nesting-aware) parenthesized spans out first and analyzing each
independently, with a no-own-signal span falling back to the language OPPOSITE the
immediately preceding segment (translation-pair semantics) rather than the book's language.
Plain text outside parens is unchanged (keeps the book-language fallback). Full reasoning in
the PR #52 description and the commit message on `js/lang-detect.js`.

Changed: `js/lang-detect.js` (buildLanguageSegments/buildFlatSegments/splitTopLevelParens/
wrapParenSegments/mergeAdjacentSameLang), `ARCHITECTURE.md` (new test-coverage row),
`.github/workflows/ci.yml` (wired in the new suite), `tests/language_paren_browser.py` (new),
versioned shell (`index.html`/`sw.js` via `tools/version_app_shell.py`).

Release code commit: 24847aa. PR #52 MERGED (squash); main release commit ff33f088.
CI: required `test` check PASS on both the dev push and the PR.
Local: PDF UX, learning UX, migration audit, app-shell versions and CDP transport tests PASS,
plus the new `tests/language_paren_browser.py` (13/13 cases) PASS.
Production: `https://ai-ebook-reader.pages.dev/` serves `lang-detect.js?v=025a440febe3`
(matches the merged commit); `tests/language_paren_browser.py` re-run directly against
production — 13/13 PASS, no console errors.

An untracked draft `tests/language_tts_browser.py` exists (not mine, not committed, not
wired into CI) — left untouched per "don't overwrite another agent's uncommitted work". It
mixes in-scope parenthesis cases with broader general-vocabulary mixed-sentence cases (no
parens/colon/dash involved, e.g. "The French word maison means house.") that need real
vocabulary/heuristic work beyond this task's scope — deliberately not pursued here.

Unrelated local scratch files remain untouched/unstaged: debug_pdf.mjs, dups.txt,
test_pdf.html, test_pdf.mjs, viewer.css. No uncommitted application changes.
Exact next action: none. Wait for a new user task; do not restart migration.

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
