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
Current step: Step 4 continuation (core piece DONE; 4 more pieces to classify/move — see
  MIGRATION_STATUS.md's detailed recon, pieces 3/4/6/7)
Current branch: dev
Current task status: idle (paused at a clean, fully-shipped checkpoint; not blocked)
Last completed action: Step 4's clean/unambiguous piece (selection.js core: caret/hit-testing/
  sentence-range/highlight/word-tap) extracted, tested, merged, production-verified.
  Steps 0, 1, 2, 3 are also all DONE, merged, and production-verified. One production incident
  (pageLang ReferenceError, see MIGRATION_STATUS.md) was found via smoke test and fixed same
  session (PR #10).
Last successful commit: 9bd99dd on dev (merged to main as 986fec7)
Last PR: #12, merged
Last CI result: green
Last production result: verified live — 3 fresh cache-disabled reloads, zero console errors,
  core.js/lang-detect.js/selection.js/ai-client.js all confirmed loaded and functional
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read the "Mechanism correction" AND "Incident" sections at the
  top of MIGRATION_STATUS.md before extracting anything further. The classic-<script>
  cross-file top-level-execution-order pitfall that caused the Step-1/2 incident can recur in
  any future step — check every extracted block for top-level (non-function-body) statements
  that call something defined in a not-yet-loaded file. Also: local test suites alone are not
  sufficient - always do a real production smoke test (fresh reload, cache disabled, check for
  console errors) after merging, before marking any step/piece DONE. This caught a real bug
  the local suites missed entirely.
Next required action: Step 4's remaining pieces (3, 4, 6, 7 in MIGRATION_STATUS.md's recon) —
  read each listener body in full before deciding its home file (they are genuinely mixed-
  responsibility: tap-to-translate mixed with page-turn, swipe-gestures mixed with long-press-
  select, PDF-click-suppression mixed with resize/pagination). Do not mechanically cut by line
  range without reading first — that is exactly how the Step 1/2 incident happened. Pieces 2
  (navigation.js) and 5 (pdf-zoom-pan.js) are NOT part of Step 4 — leave them for Steps 9/11.

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