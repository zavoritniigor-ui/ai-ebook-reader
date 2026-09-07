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
Current step: Step 4 — selection.js (not yet started; see complexity note in MIGRATION_STATUS.md)
Current branch: dev
Current task status: active, working autonomously per AUTONOMOUS_MIGRATION.md
Last completed action: urgent fix for a real production ReferenceError found via smoke test
  after Step 3 (pageLang undefined) — see the "Incident" section in MIGRATION_STATUS.md for
  full root cause. Steps 0, 1, 2, 3 are all DONE, merged, and production-verified.
Last successful commit: 777e4a7 on dev (merged to main as 9a6bd88)
Last PR: #10, merged
Last CI result: green
Last production result: verified live — 3 fresh cache-disabled reloads, zero console errors
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read the "Mechanism correction" AND "Incident" sections at the
  top of MIGRATION_STATUS.md before extracting anything further. The classic-<script>
  cross-file top-level-execution-order pitfall that caused the Step-1/2 incident can recur in
  any future step — check every extracted block for top-level (non-function-body) statements
  that call something defined in a not-yet-loaded file. Also: local test suites alone are not
  sufficient - always do a real production smoke test after merging, before marking a step DONE.
Next required action: Step 4 (selection.js) — re-run line-number greps fresh (do not reuse
  old ones, the file shifts after every step), expect multiple non-contiguous cuts (selection
  functions are interleaved with navigation.js content and touch-gesture code in the actual
  file - confirmed by grep, documented in MIGRATION_STATUS.md), extract carefully piece by
  piece, verify script-tag well-formedness after each splice
  (grep -n "<script\|</script>" index.html should show matched open/close pairs), run both
  local suites, then commit/push/PR/CI/merge/production-smoke-test exactly as prior steps did.

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