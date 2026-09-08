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

Active agent: Claude Code (PAUSED — see blocker below) / Codex appears to be actively editing
  concurrently, uncommitted, in this same working tree as of this entry
Current step: Step 6 — tts.js (NOT started, blocked — see below)
Current branch: dev
Current task status: PAUSED on a real blocker (concurrent uncommitted edits from another
  agent), not idle
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
## BLOCKER (current, unresolved as of this entry)

While starting Step 6 recon, found **uncommitted, actively-changing** edits to `js/core.js`,
`js/selection.js`, `index.html`, and `tests/browser_cdp.py` that I did not make. Confirmed via
two `git diff` checks moments apart that `js/selection.js`'s diff *grew* between them - someone
(per this file's own header, most likely Codex) is editing live, right now, in this same
working tree. Content is a real, sophisticated, coherent improvement: more robust
`pdfTextSpans`/`buildSentenceRangesFromSpans`/`sentenceRangeAt`/`wrapRangeInSpans`/
`wordToSentenceEndRangeAt` for multi-column PDF text (TreeWalker instead of assuming
`span.firstChild` is the text node, synthetic space separators between PDF text items, a new
`_pdfPieces` mechanism for accurate multi-node highlight/sub-range extraction), plus a
`cancelDragSelection()` fix (drag-selection state wasn't cleared on pointercancel/blur/before a
new drag) wired into both `core.js`'s `invalidateSelection()` and `index.html`'s
`stopBackgroundActivity()`, plus a `voiceChosenByUser` JSON-shape guard and `ttsSynth` null
guards. Ran both test suites against this in-progress state at one point in time - both were
100% green then - but the diff kept growing after that, so treat that as "it was fine at that
moment," not "it's finished."

**I did NOT commit, revert, or edit any of this.** Per AGENTS.md ("if there are uncommitted
changes from another agent, do not overwrite them") and because committing a mid-edit snapshot
could freeze something incomplete or conflict with the other agent's own eventual commit, I am
leaving the working tree exactly as found and pausing my own Step 6 work, since it would touch
the same files (TTS functions in `index.html`, possibly `js/core.js`'s voice-selection cluster).

**Next agent (me or Codex, whoever resumes) should:**
1. Run `git status`/`git diff --stat` again first — if Codex's edits are now committed/pushed,
   proceed normally (pull, re-verify tests, continue Step 6). If still uncommitted and stable
   (diff no longer growing across two checks a minute or so apart), it is reasonable to run the
   two test suites once more and, if green, commit that work as its own commit (not mixed with
   migration work) before continuing Step 6 on top of it.
2. Do not resume Step 6 extraction while the diff is still visibly changing between checks.
3. If genuinely stuck (diff neither stabilizing nor disappearing after a reasonable wait), this
   is a real "ask the user" situation per AUTONOMOUS_MIGRATION.md's stop conditions — multiple
   agents editing the same files concurrently without a lock/coordination mechanism beyond this
   file is exactly the kind of ambiguity that instruction anticipates.

Step 5 remains the last fully-shipped, production-verified step (PR #17). Nothing from Step 6
has been written to any file.

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