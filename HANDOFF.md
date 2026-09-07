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
Current step: Step 5 — pdf-render.js (not yet started)
Current branch: dev
Current task status: idle (paused at a clean, fully-shipped checkpoint; not blocked)
Last completed action: Step 4 is now FULLY DONE (not partial). Two of the remaining pieces
  initially flagged as "mixed, needs judgment call" turned out, on actually reading them fully,
  to be 100% navigation.js/pdf-zoom-pan.js content with zero selection.js material — left in
  place for Steps 9/11 as originally planned. See MIGRATION_STATUS.md's "Step 4 final recon"
  for the complete breakdown of all 7 pieces and where each ended up.
Last successful commit: cc7f84f on dev (merged to main as eb3981c)
Last PR: #15, merged
Last CI result: green
Last production result: verified live — 3 fresh cache-disabled reloads, zero console errors,
  typeof selectWordAtPoint/rangeBetweenWords both 'function'
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read the "Mechanism correction" section at the top of
  MIGRATION_STATUS.md before extracting anything further — it now has THREE learned lessons
  (top-level-execution-order ReferenceError risk; don't add a second `<script src>` tag when
  appending to an already-loaded file; listener registration order rarely matters for deferred/
  event-driven code, but check capture-vs-bubble specifically when two listeners share an
  element). Also: local test suites alone are not sufficient - always do a real production
  smoke test (fresh reload, cache disabled, check for console errors) after merging, before
  marking any step/piece DONE.
Next required action: Step 5 (pdf-render.js: initPdf, renderPdfPage, updatePdfScrubber,
  commitPdfScrub). Re-grep fresh line numbers first (they have shifted after every Step 4
  piece) — do not trust any line numbers recorded in MIGRATION_STATUS.md, they're all stale
  the moment any edit happens. Read the surrounding code before cutting, per the Step 4 lesson:
  don't assume a section's scope from its comment header alone.

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