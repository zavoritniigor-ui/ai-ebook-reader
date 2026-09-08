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
Current step: Step 16 — onboarding.js (starting now)
Current branch: dev
Current task status: active

Last completed action: Step 15 — extracted js/ui-tooltip.js (PR #39): footer submenu +
  translation-tooltip lifecycle in one piece (openFooterMenu/closeFooterMenu, pointer-type
  detection, enterMobileFullScreenIfNeeded, scheduleTooltipHide/cancelTooltipHide,
  positionTooltip/repositionTooltip) and the key-settings modal
  (openKeySettings/closeKeySettings/saveApiKey). Resolved the Step 9 deviation for real this
  time: read the actual code and found the footer-menu and tooltip-closing logic genuinely
  share one pointerdown listener, so they stay together in ui-tooltip.js rather than splitting
  toward navigation.js as the original plan guessed. All local suites green. Production
  verified: fresh load zero errors, all 15 js/*.js scripts in correct order including
  ui-tooltip.js, every extracted function present as a real global and exercised live
  (positionTooltip/openFooterMenu/closeFooterMenu/openKeySettings/closeKeySettings all
  confirmed mutating real DOM/state), genuine network-level offline reload working.

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: 2e6fe69 on dev (merged to main)
Last PR: #39, merged
Last CI result: green
Last production result: verified live — fresh load zero errors, all 15 js/*.js scripts present
  in correct order, every ui-tooltip.js function present as a global and exercised live,
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
Next required action: Step 16 (onboarding.js: stopOnboarding, rememberOnboarding,
  scheduleReaderOnboarding, onboardingGroups, ONBOARDING_KEY — sits right after the
  prev-btn/next-btn wiring, in the same reopened block as zoom-in/zoom-out/theme-select).
  Re-grep fresh line numbers first. See MIGRATION_STATUS.md's "Step 16 next" section.

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
