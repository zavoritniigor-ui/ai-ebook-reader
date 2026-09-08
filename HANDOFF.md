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

Active agent: Codex
Current branch: dev
Current task status: IN PROGRESS — finish RETRO_AUDIT (maintenance only; no migration).
Baseline commit: 81a2012. Earlier audit fixes were already merged in PR #19; migration
subsequently completed through PR #47. Do not redo those extractions.

Confirmed findings 12–17 are fixed: exact PDF glyph fallback; live/stable PDF audit
fixture; CDP EOF handling; false first-install update banner; completed selection highlight
preservation; nested PDF highlight wrappers removed words from flow and used the wrong
font (79 px measured drift). Minimal CSS preserves flow/font/transforms; regression compares
every glyph at 100%/250% plus pan. No feature work or migration extraction.

All required local suites PASS: pdf_ux_browser, learning_ux_browser, migration_audit_browser,
app_shell_versions; both browser_cdp_transport tests PASS. Audit includes cold/hard reload,
real two-column PDF geometry, AI abort, cleanup, offline PDF render, installability/icons,
and clean console. Ready for commit/PR; baseline 81a2012; CI/release pending.
Production client on 9335 prepared by /tmp/retro_upgrade.py for real worker replacement.

Production baseline serves correct baseline module hashes, HTML must-revalidate. Chromium
reports no installation errors, manifest clean, PNG dimensions correct, active SW.
User additionally reports PDF offset, stale update and Android install issue; PDF offset is
confirmed/fixed. Browser/install symptom requested asynchronously; no server install blocker.

Modified files: index.html, sw.js, js/selection.js, js/pwa-lifecycle.js,
tests/migration_audit_browser.py, tests/browser_cdp.py, tests/browser_cdp_transport.py,
tests/pdf_ux_browser.py, tests/learning_ux_browser.py, .github/workflows/ci.yml,
ARCHITECTURE.md, RETRO_AUDIT.md, MIGRATION_STATUS.md, HANDOFF.md.
Unrelated untracked debug_pdf.mjs, dups.txt, test_pdf.html, test_pdf.mjs, viewer.css are NOT
part of this work and must remain untouched/unstaged.

Environment: HTTP server 8765; isolated Chrome 9335 /tmp/reader-retro-final-9335,
9336 /tmp/reader-retro-final-9336. Use READER_CDP_PORT and NO_PROXY=127.0.0.1,localhost.
Do not use someone else's browser on 9222.

Exact next action: finish all required tests; commit only relevant files, push dev, PR/main,
required CI test green, auto-merge; verify production content, actual SW replacement banner,
full production audit including offline real PDF; mark audit COMPLETE and this handoff idle.

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
