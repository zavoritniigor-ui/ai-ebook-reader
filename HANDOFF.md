# AI Ebook Reader — Agent Handoff

This file is the shared handoff state between Claude Code and Codex.

Before starting or resuming work, every agent must read:

- AGENTS.md
- CLAUDE.md if applicable
- AUTONOMOUS_MIGRATION.md
- MODULARIZATION_PLAN.md
- MIGRATION_STATUS.md
- HANDOFF.md

## Current handoff

Active agent: Claude Code
Current step: Step 6 — tts.js (starting now)
Current branch: dev
Current task status: active

Last completed action: landed Codex's retrospective audit of Steps 0-4 (PR #19). Found it
  uncommitted on disk, actively changing (confirmed via file-mtime checks a few seconds apart),
  waited for it to genuinely stabilize (14+ minutes of zero mtime changes across all touched
  files, re-checked), read RETRO_AUDIT.md, ran all four test suites (pdf_ux_browser.py 34/34,
  learning_ux_browser.py 58/58, app_shell_versions.py PASS, migration_audit_browser.py 24/24)
  against the uncommitted state before touching anything, then committed exactly the files
  Codex's own prior HANDOFF.md entry listed as in-scope (explicitly excluding the untracked
  scratch files it flagged as not-audit-work), pushed, opened PR #19, auto-merged, and verified
  production with a fresh load + a real synthetic-PDF render + SW registration + an actual
  network-level offline reload (not just SW-bypass-disabled — genuine
  Network.emulateNetworkConditions offline:true).

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: 1644d0d on dev (merged to main as 70d1029)
Last PR: #19, merged
Last CI result: green
Last production result: verified live — fresh load zero errors, real PDF render via initPdf()
  worked, SW active, genuine network-level offline reload loaded the full app correctly
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read MIGRATION_STATUS.md's "Mechanism correction" section (now
  four learned lessons, including one specifically about handling concurrent multi-agent
  uncommitted edits safely). Also: after changing any js/*.js file, run
  `python3 tools/version_app_shell.py` before testing — the audit's new content-hash versioning
  scheme requires this or `tests/app_shell_versions.py` will fail CI.
Next required action: Step 6 (tts.js). Re-grep fresh line numbers first — everything shifted
  after the audit's edits. See MIGRATION_STATUS.md's "Step 6 in progress" section for the exact
  function list and the note that the voice-selection cluster already lives in js/core.js
  (landed there during Step 1, left as-is deliberately rather than moved again).

## Handoff rules

Before an agent stops because of token limits, context limits, session end, external interruption, or any other blocker, it must update this file.

The agent must record:

- current migration step;
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

The next agent must continue from this recorded state and must not repeat completed work unless verification shows the state is wrong.

Never rely only on conversation memory.
Use Git, MIGRATION_STATUS.md, and HANDOFF.md as the source of truth.
