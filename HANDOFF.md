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

Task: after the parenthetical translation-pair fix (PR #52), the user asked for the SAME
kind of local EN/FR phrase detection WITHOUT parentheses — "The French word maison means
house.", "Il est très important to pronounce it correctly.", "Comment allez-vous? means How
are you?" — where a local French (or English) phrase was getting swallowed by the sentence's
dominant language. Explicit requirement: don't break the parenthesis feature; add context
(1-3 neighboring tokens) so ambiguous cognates (restaurant, important, menu) resolve from
context, not word lists; add test-only debug inspection.

Root cause, same shape as the parenthesis fix: `findForeignRuns` required a STRONG
opposite-tier token to seed a foreign run and only bridged ONE neutral neighbor for a
multi-word core, so a local phrase with just a weak signal (maison) or an ambiguous cognate
with none at all (important, allez-vous) either got swallowed by the base language or split
at the wrong boundary. Fixed by replacing `sentenceBaseLang`/`findForeignRuns` with a unified
`computeClusters` pass (bridges up to 2 neutral tokens inside a cluster if later reconfirmed
— the context window) + `pickBaseLang` (only clusters with a real strong anchor vote; ties go
to the FIRST cluster in reading order, not the book language) + hyphen-part checking in
`scoreWord` (recovers "vous" inside "allez-vous") + a small curated `FR_COMMON_WORDS`/
`EN_COMMON_WORDS` list for genuinely unambiguous vocabulary (bonjour/merci/maison/means).
Genuinely ambiguous cognates are deliberately NOT listed — they resolve via the context
mechanism only. Full reasoning in the PR #54 description and the `js/lang-detect.js` commit.

Changed: `js/lang-detect.js` (computeClusters/pickBaseLang/findForeignRuns rewritten,
scoreWord hyphen-part check, FR_COMMON_WORDS/EN_COMMON_WORDS, new debugLanguageSegments
test-only diagnostic), `ARCHITECTURE.md` (new test-coverage row), `.github/workflows/ci.yml`
(wired in the new suite), `tests/language_context_browser.py` (new), versioned shell
(`index.html`/`sw.js` via `tools/version_app_shell.py`).

**Note for the next agent**: PR #54 initially showed as CONFLICTING/DIRTY even though the
actual diff applied cleanly — squash-merging PR #52/#53 created new commits on `main`
(ff33f08/1785a99) not connected by parent links to dev's own commits (24847aa/d55b5b0), even
though the content is identical, so GitHub's mergeability check used the older true common
ancestor (34aa822) and saw phantom conflicts on lines both sides added independently. Fixed
with a real merge commit (`git merge --no-ff origin/main` into dev, resolving the handful of
trivial textual conflicts by keeping dev's side, which was already a strict superset) —
**not** a rebase and **not** a force-push, per the repo's history rules. If a future PR from
dev shows CONFLICTING/DIRTY right after a squash-merge lands on main, this is almost
certainly the same phenomenon; the fix is the same merge-commit approach, or periodically
merging `origin/main` into `dev` right after each squash-merge to keep history connected.

Release code commit: 9c7c1ad (rebased content) merged via merge commit 5d7a009 on dev;
PR #54 MERGED (squash); main release commit 0f14583.
CI: required `test` check PASS on both dev pushes and the PR.
Local: PDF UX, learning UX, migration audit, app-shell versions and CDP transport tests PASS,
`tests/language_paren_browser.py` (13/13, unaffected) PASS, new
`tests/language_context_browser.py` (17/17 checks) PASS.
Production: `https://ai-ebook-reader.pages.dev/` serves `lang-detect.js?v=e14a6d0ff9df`
(matches the merged commit); both `language_context_browser.py` and
`language_paren_browser.py` re-run directly against production — all PASS, no console errors.

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
