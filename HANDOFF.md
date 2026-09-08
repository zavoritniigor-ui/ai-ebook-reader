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
Current step: Step 9 — navigation.js (starting now)
Current branch: dev
Current task status: active

Last completed action: Step 8 — extracted js/grammar-svo.js (PR #25), finally landing
  startAiTask (deferred since Step 3). Four pieces — see MIGRATION_STATUS.md's "Step 8 —
  grammar-svo.js: DONE" section. Notably, one piece (AI panel tabs + startAiTask + SVO
  cluster) was the ENTIRE remaining content of the script block Step 7's translation.js tag
  had reopened into, so that block's open/close tags collapsed directly into grammar-svo.js's
  own <script src> tag. All local suites green on the first try (no flakes this time).
  Production verified: fresh load zero errors, all 8 js/*.js scripts in correct order
  including grammar-svo.js, every extracted function present as a real global and exercised
  live (buildGrammarPrompt/localSVO on a real French sentence), genuine network-level offline
  reload working.

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: e713595 on dev (merged to main)
Last PR: #25, merged
Last CI result: green
Last production result: verified live — fresh load zero errors, all 8 js/*.js scripts present
  in correct order, every grammar/SVO function present as a global and exercised live,
  genuine network-level offline reload loaded the full app correctly
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read MIGRATION_STATUS.md's "Mechanism correction" section (four
  learned lessons) before extracting. Also: after changing any js/*.js file, run
  `python3 tools/version_app_shell.py` before testing — the versioning scheme requires this or
  `tests/app_shell_versions.py` will fail CI. And: if migration_audit_browser.py fails in CI
  with anything from browser_cdp.py's socket layer (not an assertion), that's a transport bug —
  see MIGRATION_STATUS.md's "CI flake found and fixed during Step 6" before assuming it's a
  flake and just rerunning.
Next required action: Step 9 (navigation.js). Re-grep fresh line numbers first. See
  MIGRATION_STATUS.md's "Step 9 next" section — the material was already identified by name
  back in Step 4's recon (columnStep/paginateContainer/goToPageInChapter/goNext/goPrev/etc and
  the touch-gesture swipe cluster), now sitting as contiguous blocks at the top of
  selection.js's inline region.

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
