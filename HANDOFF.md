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

Status: **idle** on the implementation side for this task. The overall Stage 1 Classroom
feature is still pending its first real human sign-in verification (see prior entries in git
history for that checklist — unchanged, still outstanding). Current branch: dev.

Task: user asked to improve the Classroom UI — the coursework list previously showed only a
title + attachment count, and clicking it opened a SEPARATE screen listing just attached file
names with zero context. Fixed by collapsing both screens into one: each course's coursework/
materials now render as a single compact card showing title, a type badge (Assignment for
courseWork, Material for courseWorkMaterial), a due date (assignments) or published date
(everything else) when available, a short (~140 char) description when present, and its Drive
attachments listed directly underneath — clicking one opens it exactly as before (same
`openDriveFile`, unchanged). The separate attachments view/list and `renderAttachments()` are
gone entirely; `classroomGoBackOrClose()` dropped the now-unreachable branch for that
navigation depth (courses ↔ coursework is the only level left). Full reasoning in PR #64's
description and the `js/google-classroom.js` commit ("group attachments under their
coursework/material card").

**Shared-workspace note (still relevant)**: at the time this entry was written, another agent
had UNCOMMITTED changes in progress on this SAME `js/google-classroom.js` file — better error
messages surfaced from failed Google API calls (`googleApiFetch` now tries to read and append
the API's own JSON error message), and guard clauses for a missing `course.id`/`fileId` in
`loadCourseWork`/`openDriveFile`. This session's own commit (the card UI change) was made and
pushed BEFORE those uncommitted edits appeared, so they layered on top of it in the working
tree — left completely untouched per "don't overwrite another agent's uncommitted work." The
next agent to touch this file should `git status`/`git diff` it first to see whether that work
has since been committed, and must not silently discard it if not.

Changed (this task only): `js/google-classroom.js` (card rendering: `classroomDateLine`,
`classroomShortDescription`, rewritten `renderCourseWork`, removed `renderAttachments`),
`index.html` (removed the `#classroom-view-attachments` div, new `.classroom-card`/
`.classroom-badge`/`.classroom-card-desc`/`.classroom-attachments` CSS), `js/core.js` (new
i18n: `classroomTypeAssignment`, `classroomTypeMaterial`, `classroomDue`, `classroomPublished`),
`ARCHITECTURE.md` (module map + test-coverage row), `tests/google_classroom_browser.py`
(rewritten for the single-screen structure, 15/15 checks), versioned shell (`index.html`/
`sw.js` via `tools/version_app_shell.py`).

**Squash-merge history-disconnect (recurring, every PR this session)**: `git merge --no-ff
origin/main` into dev was needed again before opening the PR — clean, no conflicts. Keep doing
this — a real merge commit, never a rebase, never a force-push — right before opening any new
PR if `mergeable`/`mergeStateStatus` shows CONFLICTING/DIRTY/BEHIND.

**Another agent had already opened PR #64 from `dev`** (for their own `chore(auth): verify
Google OAuth Client ID for production` commit) by the time this session went to open a PR —
rather than creating a duplicate, this session's commit was pushed onto the same `dev` branch
and PR #64's title/body were updated (via `gh api ... -X PATCH`, since `gh pr edit` still
errors on an unrelated GraphQL Projects-classic deprecation) to describe both changes. If
`gh pr create` ever says a PR from dev already exists, update that PR rather than fighting it.

Release code commit: 8571f90 (feature) + 7880295 (reconnect merge) on dev; PR #64 MERGED
(squash, bundled with another agent's Client-ID-verification commit); main release commit
118c3aa.
CI: required `test` check PASS on both parallel runs, no flake this time.
Local: PDF UX, learning UX, migration audit, app-shell versions and CDP transport tests PASS,
language_paren/language_context/ask_ai_language suites (unaffected) PASS,
`tests/google_classroom_browser.py` (15/15, rewritten for the card UI) PASS.
Production: `https://ai-ebook-reader.pages.dev/` serves `google-classroom.js?v=74d0409990a9`
(matches the merged commit); `google_classroom_browser.py` re-run directly against production
(fresh Chrome profile) — 15/15 PASS, no console errors. Also visually verified the card layout
at a 390×844 mobile viewport via a CDP screenshot — compact, legible, no overflow.

An untracked draft `tests/language_tts_browser.py` still exists (not mine, not committed,
not wired into CI) — left untouched per "don't overwrite another agent's uncommitted work".

Unrelated local scratch files remain untouched/unstaged: debug_pdf.mjs, dups.txt,
test_pdf.html, test_pdf.mjs, viewer.css. No uncommitted application changes from this session
(see the shared-workspace note above for another agent's in-progress, uncommitted edits to
js/google-classroom.js that were present at handoff time).
Exact next action: unchanged from before this task — a human still needs to run the real-
browser Google sign-in checklist (see PR #60/#62's HANDOFF entries in git history) with an
actual Google Workspace test-user account. This UI change doesn't affect that checklist.

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
