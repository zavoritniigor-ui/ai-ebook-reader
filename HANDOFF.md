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
Current step: Step 18 — main.js + remove old inline code (final assembly, budget extra care)
Current branch: dev
Current task status: active

Last completed action: Step 17 — extracted js/pwa-lifecycle.js (PR #43): the entire
  remainder of the document — isStandalonePwa, stopBackgroundActivity, persistCriticalState,
  exitApp/showToast, the Android-Back overlay stack (OVERLAY_LAYERS/topOpenOverlay/
  countOpenOverlays/closeTopOverlay/syncOverlayHistory), showUpdateBanner, SW registration/
  update wiring, and the body.inert-until-'load' gate. Loaded LAST, after every other classic
  script — this matters: its MutationObserver setup references js/pdf-crop.js's `cropDialog`
  directly in a top-level array literal (not inside a callback), which only works because
  this file's tag stays at the very end. Extra production verification given the flagged
  risk: a real `visibilitychange` 'hidden' event (not a direct function call) genuinely
  cancelled an in-progress PDF render, the overlay stack correctly counted/dropped, showToast/
  showUpdateBanner created real DOM, SW confirmed active, plus the standard offline-reload
  check. All local suites green, including the background-abort and offline/SW cases. See
  MIGRATION_STATUS.md's "Step 17 — pwa-lifecycle.js: DONE" section for full detail.

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: b0e0f7f on dev (merged to main)
Last PR: #43, merged
Last CI result: green
Last production result: verified live, extra-thoroughly given Step 17's flagged risk — fresh
  load zero errors, body.inert false after load, all 17 js/*.js scripts present in correct
  order, every pwa-lifecycle.js function present as a global, a real visibilitychange event
  genuinely cancelling an in-progress PDF render, overlay stack/toast/banner/SW all confirmed
  live, genuine network-level offline reload loaded the full app correctly
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
Next required action: Step 18 (main.js + remove old inline code) — the final assembly step.
  **Budget extra care and re-reading rather than the same mechanical cut-and-paste pattern as
  Steps 1-17.** See MIGRATION_STATUS.md's "Step 18 next" section for the concrete, freshly-
  verified inventory of every scrap of inline code still left in index.html after Step 17
  (the file-upload dispatcher, the fragile lang-detect.js voice-loading trigger that must NOT
  move, the startup bootstrap calls that must run last, and a few small onclick-wiring
  fragments never conclusively assigned to any earlier step). Re-grep fresh line numbers
  first — don't trust that inventory's line numbers, only its content list.

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
