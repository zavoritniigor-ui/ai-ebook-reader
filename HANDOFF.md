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
Current step: Step 10 — formats.js, also folds in buildToc for navigation.js (starting now)
Current branch: dev
Current task status: active

Last completed action: Step 9 — extracted js/navigation.js (PR #27): pagination/bookmark/
  goNext/goPrev, the touch/wheel page-turn gesture cluster, and the mixed-format window
  resize handler. Found a real deviation from MODULARIZATION_PLAN.md's original file map
  while doing it: the plan listed openFooterMenu/closeFooterMenu/enterMobileFullScreenIfNeeded/
  buildToc under navigation.js too, but the first three are actually tangled with ui-tooltip.js
  material (a single pointerdown listener closes both the footer menu and the translation
  tooltip) — left in place for Step 15 to sort out on its own reading, not moved on the stale
  plan's say-so. buildToc IS clean and earmarked to fold into navigation.js during Step 10
  instead (see MIGRATION_STATUS.md's "Deviation from MODULARIZATION_PLAN.md's navigation.js
  list" section — read it before Step 15). All local suites green on the first try. Production
  verified: fresh load zero errors, all 9 js/*.js scripts in correct order including
  navigation.js, every extracted function present as a real global, and a real synthetic
  multi-page text block paginated with goNext()/goPrev() actually driven through it live
  against production, genuine network-level offline reload working.

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: 4982a9b on dev (merged to main)
Last PR: #27, merged
Last CI result: green
Last production result: verified live — fresh load zero errors, all 9 js/*.js scripts present
  in correct order, every navigation function present as a global and exercised live with a
  real page-turn, genuine network-level offline reload loaded the full app correctly
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read MIGRATION_STATUS.md's "Mechanism correction" section (four
  learned lessons) before extracting. Also: after changing any js/*.js file, run
  `python3 tools/version_app_shell.py` before testing — the versioning scheme requires this or
  `tests/app_shell_versions.py` will fail CI. And: if migration_audit_browser.py fails in CI
  with anything from browser_cdp.py's socket layer (not an assertion), that's a transport bug —
  see MIGRATION_STATUS.md's "CI flake found and fixed during Step 6" before assuming it's a
  flake and just rerunning.
Next required action: Step 10 (formats.js: runArchiveGuard, initEpub, loadEpubChapter,
  initRichDoc, splitIntoChapters, renderDocChapter, fb2ToHtml, rtfToHtml, initTxt,
  renderTxtPage), plus folding buildToc into js/navigation.js. Re-grep fresh line numbers
  first. See MIGRATION_STATUS.md's "Step 10 next" and the deviation note right above it.

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
