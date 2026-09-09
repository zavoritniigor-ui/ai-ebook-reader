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

Status: **idle** on the implementation side — but see "Needs a human action" below, Stage 1
still cannot be exercised end to end without it. No other unfinished implementation, audit or
release task. Current branch: dev.

Task (continuation of the Stage 1 Classroom/Drive work): user supplied the real Google OAuth
2.0 Client ID and asked to (a) fill it into `js/google-classroom.js`, (b) verify whether
`classroom.coursework.students.readonly` is actually needed for a student-only read-only flow
and drop it if not, (c) run the sign-in/courses/coursework/attachment flow, (d) NOT widen
`drive.file` to `drive.readonly` unless a real attachment test fails with 403 and drive.file is
shown to be the cause. All done: Client ID filled in
(`1057119342659-vu464ei1v7ophbcuufbe8muhd9nb3fng.apps.googleusercontent.com`);
`classroom.coursework.students.readonly` removed (it grants teacher-role visibility into
*other* students' coursework — not needed to view one's own courses/coursework as a student;
`classroom.coursework.me.readonly` and `classroom.courseworkmaterials.readonly` already cover
this flow); `drive.file` left unchanged. Full reasoning in PR #62's description and the
`js/google-classroom.js` commit.

**Needs a human action before this is FULLY exercised**: the mocked test suite
(`tests/google_classroom_browser.py`, 12/12) and a real-SDK check (below) both pass, but a
genuine interactive human sign-in through an actual browser has still never happened. This
session verified as much as is programmatically possible from a sandboxed CDP environment:
loaded the real (unblocked) `accounts.google.com/gsi/client` against the real Client ID,
called `ensureTokenClient()` — it initializes without error and returns a working client
(confirms the Client ID itself is accepted by Google's SDK). Calling `requestAccessToken()`
correctly reaches Google's real OAuth endpoint but fails with `popup_failed_to_open` —
an EXPECTED environment limitation (headless/CDP-driven browsers cannot supply the genuine
user-gesture Google requires to open the sign-in popup), NOT a Client-ID, scope, or origin
problem. The actual next step is a human doing this in a real browser:
1. Open the app, click "🎓 Classroom" → "Увійти через Google" → sign in with a test-user
   Google Workspace account (must be added as a test user in the OAuth consent screen —
   audience is External + Testing, not yet in production/verified).
2. Confirm "My courses" lists real courses.
3. Click a course, confirm coursework/materials list appears.
4. Click a Drive-attached file, confirm it opens directly in the Reader with formatting intact.
If step 4 fails with a 403 specifically (not a different error), that is the one condition
under which `drive.file` (in `GOOGLE_SCOPES`, `js/google-classroom.js`) should be widened to
`drive.readonly` — do not make that change speculatively, only after seeing that exact
failure.

Changed (this task only — see PR #60's HANDOFF entry, still below the fold in git history,
for everything else Stage 1 touched): `js/google-classroom.js` (real Client ID, trimmed
`GOOGLE_SCOPES`, updated comments), `tests/google_classroom_browser.py` (explicit assertions
that the two needed scopes ARE requested and the removed one is NOT), versioned shell
(`index.html`/`sw.js` via `tools/version_app_shell.py`).

**Squash-merge history-disconnect (recurring, every PR this session)**: `git merge --no-ff
origin/main` into dev was needed again before opening the PR — clean this time, no conflicts.
Keep doing this — a real merge commit, never a rebase, never a force-push — right before
opening any new PR if `mergeable`/`mergeStateStatus` shows CONFLICTING/DIRTY/BEHIND.

**CI flake hit this time (known, see MEMORY.md-equivalent knowledge for this repo)**: one of
the two parallel `test` runs on the PR failed with exit code 124 — `timeout 15` waiting for
Chrome's CDP port never resolved. Reran with `gh run rerun <id> --failed`; passed clean the
second time. Not a real bug, pure GitHub-runner resource contention on Chrome startup. Two-in-
a-row on the *same* PR would be worth investigating for real rather than rerunning blindly.

Release code commit: 9d70411 (feature) + 18a903d (reconnect merge) on dev; PR #62 MERGED
(squash); main release commit 0965e23.
CI: required `test` check PASS on both parallel runs (after one rerun for the flake above).
Local: PDF UX, learning UX, migration audit, app-shell versions and CDP transport tests PASS,
language_paren/language_context/ask_ai_language suites (unaffected) PASS,
`tests/google_classroom_browser.py` (12/12, now asserting the trimmed scope list) PASS.
Production: `https://ai-ebook-reader.pages.dev/` serves `google-classroom.js?v=5fbaaed33089`
(matches the merged commit); `google_classroom_browser.py` re-run directly against
production (fresh Chrome profile) — 12/12 PASS; the real-SDK `ensureTokenClient()` check
(unblocked `accounts.google.com`) also re-run directly against production — same result
(initializes cleanly with the real Client ID and the trimmed scope string).

An untracked draft `tests/language_tts_browser.py` still exists (not mine, not committed,
not wired into CI) — left untouched per "don't overwrite another agent's uncommitted work".

Unrelated local scratch files remain untouched/unstaged: debug_pdf.mjs, dups.txt,
test_pdf.html, test_pdf.mjs, viewer.css. No uncommitted application changes.
Exact next action: a human needs to run the 4-step real-browser sign-in checklist above with
an actual Google Workspace test-user account. If it all works, Stage 1 is genuinely done. If
step 4 403s, report back with the exact error before anyone widens the Drive scope.

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
