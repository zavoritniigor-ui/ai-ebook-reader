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
Current branch: dev. RETRO_AUDIT is COMPLETE; Steps 0–4 retrospectively verified.
All confirmed findings 1–17 are FIXED. No feature work or migration extraction performed.

Completed: PDF wrapper drift (~79 px), exact glyph caret fallback, completed highlight
preservation, first-install update banner, and test fixture/transport/timing fixes.
Changed modules: index.html PDF CSS, js/selection.js, js/pwa-lifecycle.js; versioned shell,
regression tests/CI and audit documentation. Details and reproductions: RETRO_AUDIT.md.

Release code commit: 8cc1e13. Synchronized dev release head: d59cfa6 (identical tree).
PR #50 MERGED; main release commit 85496af32ea4046e4615bebe21e91968926767d4.
CI: required push 34256779640 and PR 34256783010 PASS; main 34256942126 PASS.
Local: PDF UX, learning UX, migration audit, app-shell versions and two CDP transport tests PASS.
Production: Cloudflare deployment 3a2cd43d-9ff0-457f-aeec-bcfed2a95782 SUCCESS.
HTML/SW/all 18 modules match release; actual existing-client worker update/banner/reload,
production cold/hard reload, two-column real PDF selection, offline reload and real PDF
worker/render, installability/icons and clean console all PASS.

Android: no Chromium installability/manifest/icon error on production; physical tablet
installation and the user's own PDF remain manual device verification. Browser/install
symptom was requested; no confirmed server-side install blocker remains.

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
