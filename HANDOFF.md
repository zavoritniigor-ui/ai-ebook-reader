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

Task: user reported "Запитай AI" → "Мовний розбір" (CEFR A2/B1 simplification) producing the
simplified sentences in the WRONG language — select a French sentence, get English
simplification, and vice versa. Root cause: `buildLanguageLevelPrompt` (`js/grammar-svo.js`)
picked the source language via `detectLang(sentence || fragment)` — the DOMINANT language of
the whole context sentence "by majority character count." For a bilingual sentence with an
inline translation in parentheses ("The house is big (La maison est grande)."), the
translation is often LONGER than the original, so `detectLang` returned the translation's
language instead of the tapped fragment's own. Fixed with a new `fragmentLangInContext
(fragment, context)` in `js/lang-detect.js` that finds the fragment's own POSITION in the
context and reads the segment there (via `buildLanguageSegments`) instead of voting over the
whole context; `langForText` refactored to use it (no behavior change for existing callers);
`buildLanguageLevelPrompt` now calls it first, falling back to the old `detectLang` only when
the fragment can't be positionally located. Full reasoning in PR #57's description and the
`js/lang-detect.js`/`js/grammar-svo.js` commit.

Changed: `js/lang-detect.js` (new `fragmentLangInContext`, `langForText` refactored to use
it), `js/grammar-svo.js` (`buildLanguageLevelPrompt` uses `fragmentLangInContext`),
`ARCHITECTURE.md` (module-map + new test-coverage row), `.github/workflows/ci.yml` (wired in
the new suite), `tests/ask_ai_language_browser.py` (new), versioned shell (`index.html`/
`sw.js` via `tools/version_app_shell.py`).

**Squash-merge history-disconnect note (recurring — same as PR #54/#55)**: before opening
PR #57, `git merge --no-ff origin/main` into dev was needed again to keep the PR mergeable
(squash-merges on `main` aren't ancestors of `dev`'s own commits even with identical
content). Do this — a real merge commit, never a rebase, never a force-push — right before
opening any new PR if `gh pr view <n> --json mergeable,mergeStateStatus` shows
CONFLICTING/DIRTY or the auto-merge sits stuck on BEHIND.

**Also encountered (not a real bug, a test-harness gotcha)**: reusing the SAME headless
Chrome profile/tab across multiple separate CDP test-script invocations can spuriously throw
`ReferenceError: <function> is not defined` on the second/third script even with
`Network.setBypassServiceWorker` — some interaction between the service worker install and a
`Page.navigate` in a re-used tab. Not seen when each script gets a fresh `--user-data-dir`
profile (or is the only script run against that profile). Doesn't affect CI, which always
starts a fresh profile per run.

Release code commit: 24f91d8 merged via merge commit 791ad40 on dev; PR #57 MERGED (squash);
main release commit 8cc67c0.
CI: required `test` check PASS on both dev pushes and the PR.
Local: PDF UX, learning UX, migration audit, app-shell versions and CDP transport tests PASS,
`tests/language_paren_browser.py` and `tests/language_context_browser.py` (unaffected) PASS,
new `tests/ask_ai_language_browser.py` (9/9 checks) PASS.
Production: `https://ai-ebook-reader.pages.dev/` serves `lang-detect.js?v=5ce1fc05ac06` and
`grammar-svo.js?v=77341cc54170` (match the merged commit); `ask_ai_language_browser.py`,
`language_paren_browser.py` and `language_context_browser.py` all re-run directly against
production (fresh Chrome profiles) — all PASS, no console errors.

An untracked draft `tests/language_tts_browser.py` still exists (not mine, not committed,
not wired into CI) — left untouched per "don't overwrite another agent's uncommitted work".

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
