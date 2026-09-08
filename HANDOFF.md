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

Status: **idle** on the implementation side — but see "Needs a human action" below, this
feature cannot actually be used yet without it. No other unfinished implementation, audit or
release task. Current branch: dev.

Task: user asked for Google Sign-In + Google Classroom/Drive integration — course picker,
coursework/materials picker, attached files opening directly in the Reader with no manual
download, minimal Drive permissions (explicitly not `drive.readonly`), no Classroom
editing/submission/comments. Explicitly agreed to build this in stages; this is **Stage 1**
(sign-in + course + coursework/materials + attachment + open-in-reader). Two later stages were
NOT built: a richer Classroom UX and the separate "original document view" vs. "reading mode"
toggle the user originally asked about in an earlier message — only start those if the user
brings them up again, since they were explicitly deferred, not forgotten.

**Needs a human action before this works at all**: `js/google-classroom.js` has a placeholder
`GOOGLE_CLIENT_ID` at the top (`REPLACE_WITH_YOUR_GOOGLE_OAUTH_CLIENT_ID...`). The user said
they'd provide a real OAuth 2.0 Client ID but it was never actually pasted into any
conversation this file's author had visibility into — do not assume one exists elsewhere.
Client ID is not a secret (safe to paste in chat or commit directly), but Drive API +
Classroom API must be enabled and the OAuth consent screen configured (User type = Internal,
since the target account is Google Workspace for Education) in Google Cloud Console first —
see PR #60's description for the exact Authorized JavaScript origins needed.

**One thing that could not be verified from this sandboxed environment**: whether the
`drive.file` scope (chosen to satisfy "minimal Drive permissions, never drive.readonly")
actually grants read access to a Drive file merely *referenced* by the Classroom API (vs. one
explicitly opened through a Google picker) on a real Google Workspace account. If a real
attachment 403s, the fix is a one-line scope change in `GOOGLE_SCOPES`
(`js/google-classroom.js`) — widen `drive.file` to `drive.readonly`. Flag this to the user if
they report attachments failing to open after filling in the real Client ID.

Changed: new `js/google-classroom.js` (Google Identity Services token client, read-only
Classroom REST calls, Drive metadata+content/export fetch, `#classroom-modal` UI), `js/main.js`
(extracted `openBookFile(file)` — the shared "reset state, dispatch by extension" entry point
now used by both manual upload and Classroom-opened files), `js/core.js` (new Classroom i18n
strings), `js/pwa-lifecycle.js` (`classroom` overlay layer — closes the whole modal on Android
Back, same invariant every other layer keeps), `index.html` (GIS script tag, toolbar button,
modal markup/CSS), `ARCHITECTURE.md` (module map, load order, new test-coverage row), new
`tests/google_classroom_browser.py`, `tests/migration_audit_browser.py` (updated the
hardcoded script-order assertion for the new module), `.github/workflows/ci.yml` (wired in
the new suite), versioned shell (`index.html`/`sw.js` via `tools/version_app_shell.py`).

**Squash-merge history-disconnect (recurring, same as every prior PR this session)**: before
opening the PR, `git merge --no-ff origin/main` into dev was needed again to keep it
mergeable. This time it hit one real conflict (`sw.js`'s `CACHE_NAME` line — both sides had
independently regenerated the content hash); resolved by keeping HEAD's line, then
re-running `tools/version_app_shell.py` on the merged tree to get the authoritative hash
before committing the merge. Keep doing this — a real merge commit, never a rebase, never a
force-push — right before opening any new PR if `mergeable`/`mergeStateStatus` shows
CONFLICTING/DIRTY/BEHIND.

**Shared-workspace note**: this session found `AGENTS.md`/`CLAUDE.md` mid-edit (uncommitted,
by another agent — consolidated into a shorter risk-tiered format, later merged as PR #56),
and later a PR (#60) already open from `dev` carrying another agent's unrelated
tooltip-cleanup commit. Rather than creating a duplicate PR, this session's commits were
pushed onto the SAME `dev` branch and PR #60's title/body were updated (via
`gh api ... -X PATCH`, since `gh pr edit` errored on an unrelated GraphQL Projects-classic
deprecation) to describe both bundled changes. If `gh pr create` ever says a PR from dev
already exists, update that PR rather than fighting it — the branch is genuinely shared.

Release code commit: 6beeca9 (feature) + c493148 (reconnect merge) on dev; PR #60 MERGED
(squash, bundled with another agent's tooltip-cleanup commit); main release commit cc69e10.
CI: required `test` check PASS (both parallel push/PR runs) on the exact head commit.
Local: PDF UX, learning UX, migration audit, app-shell versions and CDP transport tests PASS,
language_paren/language_context/ask_ai_language suites (unaffected) PASS, new
`tests/google_classroom_browser.py` (12/12 checks) PASS.
Production: `https://ai-ebook-reader.pages.dev/` serves `google-classroom.js?v=c7558363d11f`
(matches the merged commit); `google_classroom_browser.py` re-run directly against
production (fresh Chrome profile) — 12/12 PASS, no console errors; confirmed the toolbar
button renders, the GIS script tag loads, and the placeholder Client ID is visibly still a
placeholder (not silently filled with something wrong).

An untracked draft `tests/language_tts_browser.py` still exists (not mine, not committed,
not wired into CI) — left untouched per "don't overwrite another agent's uncommitted work".

Unrelated local scratch files remain untouched/unstaged: debug_pdf.mjs, dups.txt,
test_pdf.html, test_pdf.mjs, viewer.css. No uncommitted application changes.
Exact next action: wait for the user to supply the real Google OAuth Client ID (and confirm
Drive/Classroom APIs are enabled + consent screen configured), then do a real manual
phone/tablet smoke test with an actual Google Workspace for Education account — this feature
has never been exercised against real Google infrastructure, only mocks.

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
