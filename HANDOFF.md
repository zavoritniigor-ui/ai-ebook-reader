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
Current step: Step 17 — pwa-lifecycle.js (starting now — HIGHER RISK, read below)
Current branch: dev
Current task status: active

Last completed action: Step 16 — extracted js/onboarding.js (PR #41): ONBOARDING_KEY/
  onboardingState, onboardingGroups, scheduleReaderOnboarding, stopOnboarding,
  rememberOnboarding — one contiguous middle piece. All local suites green, including every
  onboarding-specific learning_ux_browser.py case. Production verified: fresh load zero
  errors, all 16 js/*.js scripts in correct order including onboarding.js, every extracted
  function present as a real global and exercised live (rememberOnboarding/
  scheduleReaderOnboarding/stopOnboarding all confirmed mutating real state and scheduling a
  real timer), genuine network-level offline reload working.

**IMPORTANT — Step 17 is a higher-risk step.** AGENTS.md/CLAUDE.md name PWA lifecycle,
service worker, and persistence as areas needing extra caution. stopBackgroundActivity in
particular is a hub function that calls into nearly every already-extracted module
(cancelDragSelection/cancelPdfInteraction/cancelPdfRender/cancelAsyncTasks/stopGlobalTTS/
stopTooltipSpeech, resets isPanning/inkDrawing/inkCurrent/regionStart) — read its full current
body fresh, don't trust any earlier description of it. swRegistration needs checking in both
directions (who sets it, who reads it — likely including main.js's own SW registration in
Step 18). Test this step extra thoroughly: full local suite plus a production smoke test that
specifically exercises backgrounding (visibilitychange), the update banner, and a genuine
offline reload, not just the standard battery.

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: c768530 on dev (merged to main)
Last PR: #41, merged
Last CI result: green
Last production result: verified live — fresh load zero errors, all 16 js/*.js scripts present
  in correct order, every onboarding.js function present as a global and exercised live,
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
Next required action: Step 17 (pwa-lifecycle.js: isStandalonePwa, stopBackgroundActivity,
  persistCriticalState, exitApp, showToast, topOpenOverlay, countOpenOverlays,
  closeTopOverlay, syncOverlayHistory, showUpdateBanner, OVERLAY_LAYERS, swRegistration —
  starts at the "PWA: ЖИТТЄВИЙ ЦИКЛ ЗАСТОСУНКУ" header, right where onboarding.js's old piece
  ended). Read the scope note above about extra caution before starting. Re-grep fresh line
  numbers first. See MIGRATION_STATUS.md's "Step 17 next" section.

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
