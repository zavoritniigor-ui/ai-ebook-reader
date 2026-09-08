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
Current step: Step 15 — ui-tooltip.js (starting now)
Current branch: dev
Current task status: active

Last completed action: Step 14 — extracted js/dictation.js (PR #37): the entire content of
  its script block (updateDictationUI, stopDictation, startDictationSession, toggleDictation
  + mic-button/panel-close wiring). All local suites green, including every dictation-specific
  learning_ux_browser.py case. Hit the Chrome-CDP-startup-timeout CI flake (see the
  "ci-chrome-cdp-startup-flake" session memory — third occurrence of this exact pattern,
  resolved by one rerun as always). Production verified: fresh load zero errors, all 14
  js/*.js scripts in correct order including dictation.js, every extracted function present
  as a real global and exercised live (updateDictationUI()/toggleDictation() called directly,
  confirmed real state mutation), genuine network-level offline reload working.

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: 35cbb45 on dev (merged to main)
Last PR: #37, merged
Last CI result: green (after one rerun for the Chrome-CDP-startup-timeout flake)
Last production result: verified live — fresh load zero errors, all 14 js/*.js scripts present
  in correct order, every dictation.js function present as a global and exercised live,
  genuine network-level offline reload loaded the full app correctly
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read MIGRATION_STATUS.md's "Mechanism correction" section (four
  learned lessons) before extracting. Also: after changing any js/*.js file, run
  `python3 tools/version_app_shell.py` before testing — the versioning scheme requires this or
  `tests/app_shell_versions.py` will fail CI. And: if migration_audit_browser.py fails in CI
  with anything from browser_cdp.py's socket layer (not an assertion), that's a transport bug —
  see MIGRATION_STATUS.md's "CI flake found and fixed during Step 6" before assuming it's a
  flake and just rerunning; if a job instead times out waiting for Chrome's CDP port before any
  test even runs, that's the separate, purely infra "ci-chrome-cdp-startup-flake" — safe to
  rerun once, but treat two-in-a-row on the same PR as worth investigating for real.
Next required action: Step 15 (ui-tooltip.js: scheduleTooltipHide, cancelTooltipHide,
  positionTooltip, repositionTooltip, openKeySettings, closeKeySettings, saveApiKey —
  handleWordOrSelection/translatePanelPoint from the same original plan entry already moved to
  js/translation.js in Step 7). Also pick up the footer-menu functions deferred since Step 9
  (openFooterMenu/closeFooterMenu/enterMobileFullScreenIfNeeded) if the actual code now
  supports a clean split. Re-grep fresh line numbers first. See MIGRATION_STATUS.md's
  "Step 15 next" section.

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
