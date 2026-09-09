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

Status: **idle**. The overall Stage 1 Classroom feature is still pending its first real human
sign-in verification (see PR #60/#62's HANDOFF entries in git history for that checklist —
unchanged, still outstanding). Current branch: dev.

Task: user reported CI failing in `tests/app_shell_versions.py` because `js/google-classroom.js`
had changed (this was the OTHER agent's error-handling improvements — see the previous
handoff entry, now committed) but its versioned `<script>` hash was never regenerated. Fixed
exactly as instructed: ran `python3 tools/version_app_shell.py`, reviewed the diff (only
`js/google-classroom.js`'s own hash changed, `74d0409990a9` → `f12c552eae22`, as expected since
no other module's content changed), committed, pushed, verified CI and production. Did **not**
touch Google OAuth logic, the Client ID, or scopes, per explicit instruction — confirmed
unchanged on production (`GOOGLE_CLIENT_ID`/`GOOGLE_SCOPES` read back identical to before).

The committed content (previously uncommitted, from another agent): `googleApiFetch` now reads
a failed response's JSON body and appends Google's own error message when present, instead of
just the bare status code; `loadCourseWork`/`openDriveFile` guard against a missing
`course.id`/`fileId` up front. This is genuinely useful for diagnosing the still-outstanding
real-account sign-in test (a 403 on opening an attachment, if it happens, will now show
Google's actual reason instead of just "Google API 403").

Changed (this task only): `js/google-classroom.js` (the error-handling content above),
`index.html`/`sw.js` (regenerated version hashes only, via `tools/version_app_shell.py`).

**Squash-merge history-disconnect (recurring, every PR this session)**: `git merge --no-ff
origin/main` into dev was needed again before opening the PR — clean, no conflicts. Keep doing
this — a real merge commit, never a rebase, never a force-push — right before opening any new
PR if `mergeable`/`mergeStateStatus` shows CONFLICTING/DIRTY/BEHIND.

**CI flake note**: an EARLIER push (commit `fa7c166`, before this session started this task)
had already failed CI for the exact same missing-version-hash reason (that failure predates
this fix and was already visible in Action history) — this task's fix addresses the root cause
so it won't recur for this specific file again until it's next edited without re-running the
versioning tool. Two unrelated `exit 124` Chrome-CDP-startup flakes were also hit on other PRs
this session (`fa7c166`'s own descendant runs) — always distinguish a real
`app_shell_versions.py` assertion failure (shown clearly in the "Check JavaScript syntax" step
log) from the infra timeout flake (shown as "Process completed with exit code 124" in the
"Run Tests" step, after "Waiting for Chrome CDP...") before deciding whether to just rerun.

Release code commit: 53784c8 (fix) + e693be9 (reconnect merge) on dev; PR #66 MERGED (squash);
main release commit 7e34e81.
CI: required `test` check PASS on both parallel runs, no flake this time.
Local: `tests/app_shell_versions.py` now PASS (was the reported failure); PDF UX, learning UX,
migration audit, CDP transport, language_paren/language_context/ask_ai_language suites
(unaffected) PASS; `tests/google_classroom_browser.py` (15/15, unaffected by this fix) PASS.
Production: `https://ai-ebook-reader.pages.dev/` serves `google-classroom.js?v=f12c552eae22`
(matches the merged commit); `google_classroom_browser.py` re-run directly against production
(fresh Chrome profile) — 15/15 PASS, no console errors; `GOOGLE_CLIENT_ID`/`GOOGLE_SCOPES`
read back directly from production — identical to before this fix, confirming no OAuth change.

An untracked draft `tests/language_tts_browser.py`, and a new untracked `test.js`, still exist
(not mine, not committed, not wired into CI) — left untouched per "don't overwrite another
agent's uncommitted work".

Unrelated local scratch files remain untouched/unstaged: debug_pdf.mjs, dups.txt, test.js,
test_pdf.html, test_pdf.mjs, viewer.css. No uncommitted application changes from this session.
Exact next action: unchanged from before — a human still needs to run the real-browser Google
sign-in checklist (see PR #60/#62's HANDOFF entries in git history) with an actual Google
Workspace test-user account. This fix doesn't affect that checklist, but the improved error
messages should make it much easier to diagnose if that test hits a real Google API error.

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
