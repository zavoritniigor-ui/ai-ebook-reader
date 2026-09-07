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
Current step: Step 1 — core.js (in progress)
Current branch: dev
Current task status: active, working autonomously per AUTONOMOUS_MIGRATION.md
Last completed action: Step 0 (mutable state containers) — DONE, merged to main via PR #4
Last successful commit: 5a85de7 on dev (merged to main as f933e65)
Last PR: #4, merged
Last CI result: green (see MIGRATION_STATUS.md for a flaky-check note on the push-triggered duplicate run)
Last production result: verified live, smoke-tested, zero console errors
Uncommitted work: none at time of writing this entry
Next required action: extract core.js (state/els/i18n/storage/safeHtml/escapeHtml/async-tasks/net helpers)
  per MODULARIZATION_PLAN.md step 1, re-expose required symbols on window for test compatibility,
  run both local test suites, then commit/push/PR/CI/merge/verify exactly as Step 0 did

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