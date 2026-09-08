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
Current step: Step 14 — dictation.js (starting now)
Current branch: dev
Current task status: active

Last completed action: Step 13 — extracted js/pdf-crop.js (PR #35): region-mode
  state/drawing (regionStart/regionBox, exitRegionMode, the overlay pointer handlers),
  cropPdfRegion, the crop preview dialog (openCropPreview/closeCropPreview + Save PNG/Share/
  Copy PNG/send-to-AI wiring), and checkExerciseImage (stays here despite calling AI vision,
  per the plan's own footnote — only ever invoked from the crop flow). Resolved Step 12's
  open question: regionStart/regionBox are pdf-crop.js's own state, not ink's. All local
  suites green, including every crop-specific pdf_ux_browser.py case (one
  migration_audit_browser.py run hit the known one-off SW-cache-transition timing artifact
  already documented in Step 7's notes — clean on immediate rerun). Production verified:
  fresh load zero errors, all 13 js/*.js scripts in correct order including pdf-crop.js,
  every extracted function present as a real global, and a real region cropped out of a real
  synthetic PDF page live against production (genuine PNG data URL), genuine network-level
  offline reload working.

**Scope note (read this):** Codex's own audit record said "the user's explicit scope ends
here — do not resume autonomous migration after this audit." The user then directly and
explicitly told a Claude Code session (twice) to continue and start Step 6. That direct,
repeated instruction was followed and is recorded as intentional in MIGRATION_STATUS.md's
"IMPORTANT — scope note" section. If you are resuming later and the user hasn't otherwise
confirmed this, it's worth a quick check rather than assuming silently either way.

Last successful commit: 2d1b309 on dev (merged to main)
Last PR: #35, merged
Last CI result: green
Last production result: verified live — fresh load zero errors, all 13 js/*.js scripts present
  in correct order, every pdf-crop.js function present as a global, a real region cropped to
  PNG live, genuine network-level offline reload loaded the full app correctly
Uncommitted work: none at time of writing this entry
IMPORTANT for the next agent: read MIGRATION_STATUS.md's "Mechanism correction" section (four
  learned lessons) before extracting. Also: after changing any js/*.js file, run
  `python3 tools/version_app_shell.py` before testing — the versioning scheme requires this or
  `tests/app_shell_versions.py` will fail CI. And: if migration_audit_browser.py fails in CI
  with anything from browser_cdp.py's socket layer (not an assertion), that's a transport bug —
  see MIGRATION_STATUS.md's "CI flake found and fixed during Step 6" before assuming it's a
  flake and just rerunning.
Next required action: Step 14 (dictation.js: updateDictationUI, stopDictation,
  startDictationSession, toggleDictation — sits at the top of the reopened script block
  right after js/ai-client.js's own tag). Re-grep fresh line numbers first. See
  MIGRATION_STATUS.md's "Step 14 next" section.

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
