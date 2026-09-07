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
Current step: Step 6 — tts.js (not yet started)
Current branch: dev
Current task status: idle (paused at a clean, fully-shipped checkpoint; not blocked)
Last completed action: Step 5 (pdf-render.js: initPdf, renderPdfPage, updatePdfScrubber,
  commitPdfScrub) extracted, tested, merged, production-verified with an actual PDF
  load-and-render (not just an idle-load check) - text extracted correctly, 1 canvas + 1
  text-layer produced, zero errors. Step 4 (selection.js) is also fully done as of the prior
  entry, all 19-step plan through Step 5 is green.
Last successful commit: c44a3b7 on dev (merged to main as d7da64e)
Last PR: #17, merged
Last CI result: green
Last production result: verified live - 3 fresh cache-disabled reloads zero errors, PLUS a real
  synthetic-PDF render test against production (see MIGRATION_STATUS.md for why this step
  needed more than an idle-load check, and which future steps should repeat it)
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read the "Mechanism correction" section at the top of
  MIGRATION_STATUS.md before extracting anything further (three learned lessons documented
  there). Also: for PDF-touching steps (11 pdf-zoom-pan, 12 pdf-ink, 13 pdf-crop), an idle-load
  smoke test is NOT enough - actually load and render a synthetic PDF against production and
  check the result, the way Step 5 did, not just "zero console errors on load".
Next required action: Step 6 (tts.js: voice selection/loadVoices cluster already sits in
  core.js per the Step 1 extraction boundary - see if it's worth relocating now or leave as-is;
  speakText/speakInLang/setSpeakSide/sentence playback+highlight/TTS control buttons). Re-grep
  fresh line numbers first. Decide where `buildSentenceRanges` lives (used by both TTS
  sentence-stepping and already-extracted selection.js's sentenceRangeAt) - read its actual
  call sites before deciding, don't assume from MODULARIZATION_PLAN.md's graph alone.

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